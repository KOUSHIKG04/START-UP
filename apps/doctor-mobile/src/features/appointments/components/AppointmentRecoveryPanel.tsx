import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import {
  appointmentRecoveryView,
  type ClinicAppointment,
} from "@startup/contracts";
import { AppointmentRecoveryDialog, Button } from "@startup/mobile-ui";
import { Heading, Label, Panel } from "../../../components/DoctorScreen";
import {
  useAppointmentRecovery,
  type RecoveryIntent,
} from "../hooks/useAppointmentRecovery";

function RecoveryAction({
  item,
  intent,
  onClose,
}: {
  item: ClinicAppointment;
  intent: RecoveryIntent;
  onClose: () => void;
}) {
  const { times, mutation } = useAppointmentRecovery(item, intent, onClose);
  const title =
    intent === "reschedule"
      ? "Reschedule appointment"
      : intent === "no_show"
        ? "Mark patient no-show?"
        : intent === "doctor_unavailable"
          ? "Doctor unavailable"
          : intent === "approve"
            ? "Approve request"
            : "Decline request";
  return (
    <AppointmentRecoveryDialog
      visible
      theme="doctor"
      title={title}
      actionLabel={
        intent === "reschedule" ? "Confirm new time" : "Confirm decision"
      }
      description={
        intent === "no_show"
          ? "Confirm the patient did not attend. A checked-in patient may still be waiting because the clinic is delayed."
          : intent === "reschedule"
            ? "The replacement keeps this patient, doctor and visit type. Confirm the new time and fee before continuing."
            : "Your decision and note will be visible to the patient."
      }
      requireReason={intent !== "no_show"}
      busy={mutation.isPending}
      loading={intent === "reschedule" && times.isLoading}
      times={
        intent === "reschedule"
          ? (times.data ?? []).map((slot) => ({
              value: slot.window_id,
              day: new Date(slot.starts_at).toLocaleDateString("en-CA", {
                timeZone: slot.timezone,
              }),
              dayLabel: new Date(slot.starts_at).toLocaleDateString("en-IN", {
                timeZone: slot.timezone,
                dateStyle: "medium",
              }),
              label: new Date(slot.starts_at).toLocaleTimeString("en-IN", {
                timeZone: slot.timezone,
                hour: "numeric",
                minute: "2-digit",
              }),
              fee: new Intl.NumberFormat("en-IN", {
                style: "currency",
                currency: slot.currency,
              }).format(Number(slot.fee_minor) / 100),
            }))
          : undefined
      }
      error={
        mutation.error
          ? typeof mutation.error === "object" && "message" in mutation.error
            ? String(mutation.error.message)
            : "Could not update this appointment. Refresh and retry."
          : intent === "reschedule" && times.isError
            ? "Could not load available times."
            : undefined
      }
      onRetry={() => {
        mutation.reset();
        if (intent === "reschedule") void times.refetch();
      }}
      onClose={onClose}
      onSubmit={(value) => mutation.mutate(value)}
    />
  );
}

export function AppointmentRecoveryPanel({
  item,
  now = Date.now(),
}: {
  item: ClinicAppointment;
  now?: number;
}) {
  const [intent, setIntent] = useState<RecoveryIntent | null>(null);
  const view = appointmentRecoveryView(item, now);
  const request = item.recovery?.request;
  if (!item.recovery?.can_manage && !item.recovery?.rescheduled_to_id)
    return null;
  return (
    <Panel>
      <Heading>{view.staffStatus}</Heading>
      {view.message ? <Label>{view.message}</Label> : null}
      {request ? (
        <View style={{ gap: 8 }}>
          <Label>
            {request.kind === "reschedule" ? "Reschedule" : "Attendance review"}{" "}
            request · {request.status}
          </Label>
          <Label>{request.reason}</Label>
          {request.target_starts_at ? (
            <Label>
              Requested time:{" "}
              {new Date(request.target_starts_at).toLocaleString("en-IN", {
                timeZone: item.timezone,
              })}
            </Label>
          ) : null}
          {request.decision_note ? (
            <Label>{request.decision_note}</Label>
          ) : null}
          {request.status === "pending" ? (
            <>
              <Button
                theme="doctor"
                label={
                  request.kind === "reschedule"
                    ? "Approve reschedule"
                    : "Resolve review"
                }
                onPress={() => setIntent("approve")}
              />
              <Button
                theme="doctor"
                variant="outline"
                label="Decline request"
                onPress={() => setIntent("reject")}
              />
            </>
          ) : null}
        </View>
      ) : null}
      {view.canMarkNoShow ? (
        <Button
          theme="doctor"
          variant="outline"
          label="Mark patient no-show"
          onPress={() => setIntent("no_show")}
        />
      ) : null}
      {view.canMarkDoctorUnavailable ? (
        <Button
          theme="doctor"
          variant="outline"
          label="Doctor unavailable"
          onPress={() => setIntent("doctor_unavailable")}
        />
      ) : null}
      {view.canReschedule ? (
        <Button
          theme="doctor"
          label="Reschedule appointment"
          onPress={() => setIntent("reschedule")}
        />
      ) : null}
      {item.recovery?.rescheduled_to_id ? (
        <Button
          theme="doctor"
          label="View replacement booking"
          onPress={() =>
            router.push({
              pathname: "/appointment-details",
              params: { appointmentId: item.recovery!.rescheduled_to_id! },
            })
          }
        />
      ) : null}
      {intent ? (
        <RecoveryAction
          key={`${item.id}-${intent}`}
          item={item}
          intent={intent}
          onClose={() => setIntent(null)}
        />
      ) : null}
    </Panel>
  );
}
