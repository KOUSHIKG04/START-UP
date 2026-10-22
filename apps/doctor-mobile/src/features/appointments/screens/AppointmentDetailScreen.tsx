import { View } from "react-native";
import { router } from "expo-router";
import { Button, Input, Loader } from "@startup/mobile-ui";
import {
  DoctorScreen,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";
import { useAppointmentReview } from "../hooks/useAppointmentReview";

export function AppointmentDetailScreen() {
  const {
    appointmentId,
    notes,
    setNotes,
    appointments,
    item,
    expired,
    transition,
    act,
  } = useAppointmentReview();
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
              Booking {item.public_code.slice(-8)} ·{" "}
              {item.status.replaceAll("_", " ")}
            </Label>
            {item.visit_mode === "clinic" && item.queue_state ? (
              <Label muted>
                Queue: {item.queue_state.replaceAll("_", " ")}
                {item.ticket_number ? ` · #${item.ticket_number}` : ""}
              </Label>
            ) : null}
            {item.reason ? <Label muted>Reason: {item.reason}</Label> : null}
            {item.status === "pending" ||
            (!item.can_consult &&
              ["waiting", "called"].includes(item.queue_state ?? "")) ? (
              <Input
                label={
                  item.status === "pending"
                    ? "Reason for rejection"
                    : "Reason for hold"
                }
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
            ["waiting", "called"].includes(item.queue_state ?? "") &&
            !item.can_consult ? (
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
            {item.status === "completed" && item.can_consult ? (
              <Button
                theme="doctor"
                label="View consultation record"
                onPress={() =>
                  router.push({
                    pathname: "/clinical-notes",
                    params: {
                      appointmentId: item.id,
                      patientId: item.patient_id,
                      mode: item.visit_mode,
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
