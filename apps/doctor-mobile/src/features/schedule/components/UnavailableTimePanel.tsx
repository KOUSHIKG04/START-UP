import type { UnavailableTimePanelProps } from "../types/unavailable-time-panel";
import { View } from "react-native";
import { Button, Input, ClockTimePicker } from "@startup/mobile-ui";
import { Label } from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";
import { UnavailableDatePicker } from "./UnavailableDatePicker";
import { formatDisplayDateTime } from "@startup/contracts";
export function UnavailableTimePanel({
  timeZone,
  leaveDate,
  onLeaveDateChange,
  leaveStart,
  onLeaveStartChange,
  leaveEnd,
  onLeaveEndChange,
  leaveReason,
  onLeaveReasonChange,
  busy,
  pendingAction,
  canAdd,
  onAddLeave,
  unavailable,
  onRemoveLeave,
  isError,
}: UnavailableTimePanelProps) {
  return (
    <>
      <UnavailableDatePicker
        value={leaveDate}
        onChange={onLeaveDateChange}
        timeZone={timeZone}
        disabled={busy}
      />
      <View style={ui.row}>
        <ClockTimePicker
          theme="doctor"
          label="Start time"
          value={leaveStart}
          onChange={onLeaveStartChange}
          disabled={busy}
        />
        <ClockTimePicker
          theme="doctor"
          label="End time"
          value={leaveEnd}
          onChange={onLeaveEndChange}
          disabled={busy}
          endOfDay
        />
      </View>
      <Input
        label="Reason"
        value={leaveReason}
        onChangeText={onLeaveReasonChange}
      />
      <Button
        loading={pendingAction === "add-leave"}
        theme="doctor"
        variant="outline"
        label="Add unavailable time"
        disabled={busy || !canAdd}
        onPress={onAddLeave}
      />
      {unavailable
        ?.filter((item) => item.state === "active")
        .map((item) => (
          <View key={item.id} style={{ gap: 6 }}>
            <Label>
              {formatDisplayDateTime(item.starts_at, timeZone)} –{" "}
              {formatDisplayDateTime(item.ends_at, timeZone)}
            </Label>
            <Label muted>
              {item.service_mode === "all"
                ? "All services"
                : item.service_mode === "home"
                  ? "Home visits"
                  : item.service_mode === "online"
                    ? "Online"
                    : "Clinic"}{" "}
              · {item.reason}
            </Label>
            <Button
              loading={pendingAction === `remove-leave:${item.id}`}
              theme="doctor"
              variant="outline"
              label="Remove"
              disabled={busy}
              onPress={() => void onRemoveLeave(item)}
            />
          </View>
        ))}
      {isError ? (
        <Label style={ui.error}>Could not load unavailable time.</Label>
      ) : null}
    </>
  );
}
