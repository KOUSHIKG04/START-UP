import { useState } from "react";
import {
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { router, type Href } from "expo-router";
import {
  appointmentRecoveryView,
  type ClinicAppointment,
} from "@startup/contracts";
import { AppText, Button } from "@startup/mobile-ui";
import { AppointmentRecovery } from "./AppointmentRecovery";

export function AppointmentRecoveryActions({
  item,
  now = Date.now(),
  buttonStyle,
  labelStyle,
}: {
  item: ClinicAppointment;
  now?: number;
  buttonStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
}) {
  const [intent, setIntent] = useState<"reschedule" | "review" | null>(null);
  const view = appointmentRecoveryView(item, now);
  const request = item.recovery?.request;
  return (
    <View style={{ gap: 12 }}>
      {view.message ? (
        <AppText style={labelStyle}>{view.message}</AppText>
      ) : null}
      {request ? (
        <AppText style={labelStyle}>
          {request.kind === "reschedule" ? "Reschedule" : "Attendance review"}:{" "}
          {request.status}
          {request.decision_note ? ` · ${request.decision_note}` : ""}
        </AppText>
      ) : null}
      {view.canReschedule ? (
        <Button
          theme="patient"
          variant="outline"
          label={view.requiresApproval ? "Request reschedule" : "Reschedule"}
          style={buttonStyle}
          labelStyle={labelStyle}
          onPress={() => setIntent("reschedule")}
        />
      ) : null}
      {view.canReview ? (
        <Button
          theme="patient"
          variant="outline"
          label="Report a problem"
          style={buttonStyle}
          labelStyle={labelStyle}
          onPress={() => setIntent("review")}
        />
      ) : null}
      {view.bookAgain ? (
        <Button
          theme="patient"
          label="Book again"
          style={buttonStyle}
          labelStyle={labelStyle}
          onPress={() =>
            router.push(
              item.practice_id
                ? ({
                    pathname: "/doctor-profile",
                    params: {
                      practiceId: item.practice_id,
                      serviceId: item.practice_service_id ?? "",
                      consultationType:
                        item.visit_mode === "online"
                          ? "Online"
                          : item.visit_mode === "home"
                            ? "Home Visit"
                            : "Clinic Visit",
                    },
                  } as Href)
                : ("/find-doctor" as Href)
            )
          }
        />
      ) : null}
      {item.recovery?.rescheduled_to_id ? (
        <Button
          theme="patient"
          variant="outline"
          label="View replacement booking"
          style={buttonStyle}
          labelStyle={labelStyle}
          onPress={() =>
            router.push({
              pathname: "/appointment-details/[id]",
              params: { id: item.recovery!.rescheduled_to_id! },
            } as Href)
          }
        />
      ) : null}
      {intent ? (
        <AppointmentRecovery
          key={`${item.id}-${intent}`}
          item={item}
          intent={intent}
          onClose={() => setIntent(null)}
        />
      ) : null}
    </View>
  );
}
