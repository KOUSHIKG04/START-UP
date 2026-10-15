import { useCallback, useEffect, useState } from "react";
import { View } from "react-native";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import * as Haptics from "expo-haptics";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyPracticeAppointments,
  transitionClinicAppointment,
} from "@startup/data-access";
import type {
  ClinicAppointment,
  ClinicTransitionInput,
} from "@startup/contracts";
import { Button, Input, Loader, useToast } from "@startup/mobile-ui";
import {
  DoctorScreen,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";
import { supabase } from "../../../services/supabase";
type Action = ClinicTransitionInput["action"];
export function AppointmentDetailScreen() {
  const { appointmentId } = useLocalSearchParams<{ appointmentId?: string }>();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 15000);
    return () => clearInterval(timer);
  }, []);
  const appointments = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase),
  });
  useFocusEffect(
    useCallback(() => {
      void appointments.refetch();
    }, [appointments.refetch])
  );
  const item = appointments.data?.find((entry) => entry.id === appointmentId);
  const expired = Boolean(
    item?.status === "pending" &&
    (Date.parse(item.request_expires_at ?? item.starts_at) <= now ||
      Date.parse(item.starts_at) <= now)
  );
  const transition = useMutation({
    mutationFn: async ({
      item,
      action,
    }: {
      item: ClinicAppointment;
      action: Action;
    }) => {
      let current = item;
      if (action === "start" && item.queue_state === "waiting") {
        await transitionClinicAppointment(supabase!, {
          appointmentId: item.id,
          expectedVersion: Number(item.row_version),
          action: "call",
        });
        const updated = (await listMyPracticeAppointments(supabase!)).find(
          (entry) => entry.id === item.id
        );
        if (!updated)
          throw new Error(
            "Could not load the updated appointment. Refresh and retry."
          );
        current = updated;
      }
      return transitionClinicAppointment(supabase!, {
        appointmentId: item.id,
        expectedVersion: Number(current.row_version),
        action,
        note: ["reject", "hold", "complete"].includes(action)
          ? (notes[item.id]?.trim() ?? null)
          : null,
      });
    },
    onSuccess: (_result, { action, item }) => {
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      const feedback =
        action === "approve"
          ? "Appointment confirmed."
          : "Appointment updated.";
      showToast({ title: feedback, type: "success" });
      void queryClient.invalidateQueries({
        queryKey: ["doctor-clinic-appointments"],
      });
      void queryClient.invalidateQueries({ queryKey: ["my-notifications"] });
      void queryClient.invalidateQueries({ queryKey: ["clinic-slots"] });
      if (action === "start")
        router.push({
          pathname: "/clinical-notes",
          params: {
            appointmentId: item.id,
            patientId: item.patient_id,
            mode: item.visit_mode,
          },
        });
    },
    onError: (cause) => {
      const message =
        cause && typeof cause === "object" && "message" in cause
          ? String(cause.message)
          : "";
      const feedback = message.includes("Request expired")
        ? "This request has expired or its slot is no longer available. Ask the patient to book a new time."
        : message.includes("Appointment changed")
          ? "This appointment was updated elsewhere. Its latest status is being loaded; review it before trying again."
          : message || "Could not update the appointment. Please try again.";
      void appointments.refetch();
      showToast({ title: "Update failed", message: feedback, type: "error" });
    },
  });

  const act = (item: ClinicAppointment, action: Action) => {
    if (
      action === "approve" &&
      (Date.parse(item.request_expires_at ?? item.starts_at) <= Date.now() ||
        Date.parse(item.starts_at) <= Date.now())
    ) {
      setNow(Date.now());
      showToast({
        title: "Request expired",
        message: "Ask the patient to book a new available time.",
        type: "info",
      });
      return;
    }
    return transition.mutate({ item, action });
  };
  return (
    <DoctorScreen title="Appointment details" bottomNav={false}>
      {appointments.isLoading ? (
        <Loader theme="doctor" />
      ) : appointments.isError ? (
        <Panel>
          <Label>Could not load this appointment.</Label>
          <Button
            theme="doctor"
            label="Retry"
            onPress={() => void appointments.refetch()}
          />
        </Panel>
      ) : !item ? (
        <Label>This appointment is no longer available to your account.</Label>
      ) : (
        <>
          <Heading>{item.patient_name}</Heading>
          <Label muted>
            {item.patient_age_years ?? "Age unavailable"} ·{" "}
            {item.patient_gender ?? "Gender unavailable"} ·{" "}
            {item.patient_public_code}
          </Label>
          <Label>
            {new Date(item.starts_at).toLocaleString("en-IN", {
              timeZone: item.timezone,
            })}
          </Label>
          {expired ? (
            <Panel>
              <Heading>Request expired</Heading>
              <Label>
                The request deadline or appointment time has passed. Ask the
                patient to choose a new available time.
              </Label>
            </Panel>
          ) : null}
          <Panel>
            <Label muted>
              {new Date(item.starts_at).toLocaleTimeString([], {
                hour: "numeric",
                minute: "2-digit",
              })}{" "}
              · {item.facility_name}
            </Label>
            <Label muted>
              Booking {item.public_code} · {item.status.replaceAll("_", " ")}
            </Label>
            {item.visit_mode === "clinic" && item.queue_state ? (
              <Label muted>
                Queue: {item.queue_state.replaceAll("_", " ")}
                {item.ticket_number ? ` · #${item.ticket_number}` : ""}
              </Label>
            ) : null}
            {item.reason ? <Label muted>Reason: {item.reason}</Label> : null}
            {item.status === "pending" ||
            item.queue_state === "waiting" ||
            item.queue_state === "called" ? (
              <Input
                label="Reason for rejection or hold"
                value={notes[item.id] ?? ""}
                onChangeText={(value) =>
                  setNotes((current) => ({ ...current, [item.id]: value }))
                }
                multiline
              />
            ) : null}
            {item.status === "pending" ? (
              <View style={ui.row}>
                <Button
                  loading={
                    transition.isPending &&
                    transition.variables?.item.id === item.id &&
                    transition.variables.action === "approve"
                  }
                  theme="doctor"
                  label="Accept"
                  disabled={transition.isPending || expired}
                  onPress={() => act(item, "approve")}
                />
                <Button
                  loading={
                    transition.isPending &&
                    transition.variables?.item.id === item.id &&
                    transition.variables.action === "reject"
                  }
                  theme="doctor"
                  variant="outline"
                  label="Reject"
                  disabled={transition.isPending || !notes[item.id]?.trim()}
                  onPress={() => act(item, "reject")}
                />
              </View>
            ) : null}
            {item.visit_mode === "online" &&
            ["confirmed", "in_consultation"].includes(item.status) &&
            item.can_consult ? (
              <View style={ui.row}>
                <Button
                  theme="doctor"
                  label="Join video consultation"
                  onPress={() =>
                    router.push({
                      pathname: "/online-consultation",
                      params: {
                        appointmentId: item.id,
                        patientId: item.patient_id,
                        mode: "online",
                      },
                    })
                  }
                />
                <Button
                  theme="doctor"
                  variant="outline"
                  label="Open chat"
                  onPress={() =>
                    router.push({
                      pathname: "/chat",
                      params: {
                        appointmentId: item.id,
                        patientId: item.patient_id,
                        mode: "online",
                      },
                    })
                  }
                />
              </View>
            ) : null}
            {item.visit_mode === "clinic" &&
            item.status === "confirmed" &&
            item.queue_state === "awaiting_arrival" ? (
              <Button
                theme="doctor"
                label="Scan patient check-in QR"
                onPress={() => router.push("/scan-qr")}
              />
            ) : null}
            {item.status === "confirmed" &&
            item.queue_state === "waiting" &&
            item.can_consult ? (
              <Button
                loading={
                  transition.isPending &&
                  transition.variables?.item.id === item.id &&
                  transition.variables.action === "start"
                }
                theme="doctor"
                label="Start consultation"
                disabled={transition.isPending}
                onPress={() => act(item, "start")}
              />
            ) : null}
            {item.status === "confirmed" &&
            ["waiting", "called"].includes(item.queue_state ?? "") ? (
              <Button
                loading={
                  transition.isPending &&
                  transition.variables?.item.id === item.id &&
                  transition.variables.action === "hold"
                }
                theme="doctor"
                variant="outline"
                label="Hold"
                disabled={transition.isPending || !notes[item.id]?.trim()}
                onPress={() => act(item, "hold")}
              />
            ) : null}
            {item.status === "confirmed" && item.queue_state === "held" ? (
              <Button
                loading={
                  transition.isPending &&
                  transition.variables?.item.id === item.id &&
                  transition.variables.action === "resume"
                }
                theme="doctor"
                variant="outline"
                label="Return to queue"
                disabled={transition.isPending}
                onPress={() => act(item, "resume")}
              />
            ) : null}
            {item.status === "confirmed" &&
            item.queue_state === "called" &&
            item.can_consult ? (
              <Button
                loading={
                  transition.isPending &&
                  transition.variables?.item.id === item.id &&
                  transition.variables.action === "start"
                }
                theme="doctor"
                label="Start consultation"
                disabled={transition.isPending}
                onPress={() => act(item, "start")}
              />
            ) : null}
            {item.visit_mode === "clinic" &&
            item.status === "in_consultation" &&
            item.can_consult ? (
              <Button
                theme="doctor"
                label="Continue consultation"
                onPress={() =>
                  router.push({
                    pathname: "/clinical-notes",
                    params: {
                      appointmentId: item.id,
                      patientId: item.patient_id,
                      mode: "clinic",
                    },
                  })
                }
              />
            ) : null}
            {item.visit_mode === "online" &&
            item.status === "in_consultation" &&
            item.can_consult ? (
              <Button
                theme="doctor"
                label="Continue consultation"
                onPress={() =>
                  router.push({
                    pathname: "/clinical-notes",
                    params: {
                      appointmentId: item.id,
                      patientId: item.patient_id,
                      mode: "online",
                    },
                  })
                }
              />
            ) : null}
          </Panel>
        </>
      )}
    </DoctorScreen>
  );
}
