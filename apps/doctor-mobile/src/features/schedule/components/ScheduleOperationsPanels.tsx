import { View, Pressable } from "react-native";
import { Button, Input } from "@startup/mobile-ui";
import { Heading, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { formatTime, minutes } from "../utils/schedule";
import type { ClinicSession, ClinicUnavailability } from "@startup/contracts";

export function PublishSessionPanel({
  publishDate,
  onPublishDateChange,
  busy,
  disabled,
  onPublish,
  onPublishOnline,
  onlineDisabled,
}: {
  publishDate: string;
  onPublishDateChange: (date: string) => void;
  busy: boolean;
  disabled: boolean;
  onPublish: () => void;
  onPublishOnline: () => void;
  onlineDisabled: boolean;
}) {
  return (
    <Panel>
      <Heading style={{ fontSize: 13 }}>Publish clinic date</Heading>
      <Label muted>
        Saved preferences become bookable after you publish a date.
      </Label>
      <Input
        label="Date (YYYY-MM-DD)"
        value={publishDate}
        onChangeText={onPublishDateChange}
        placeholder="YYYY-MM-DD"
      />
      <Button
        theme="doctor"
        label="Publish clinic slots"
        disabled={busy || disabled}
        onPress={onPublish}
      />
      <Button
        theme="doctor"
        variant="outline"
        label="Publish online slots"
        disabled={busy || disabled || onlineDisabled}
        onPress={onPublishOnline}
      />
    </Panel>
  );
}

export function PublishedSessionsPanel({
  sessions,
  sessionLimits,
  onLimitChange,
  busy,
  onSaveLimit,
  isError,
}: {
  sessions?: ClinicSession[];
  sessionLimits: Record<string, string>;
  onLimitChange: (sessionId: string, value: string) => void;
  busy: boolean;
  onSaveLimit: (session: ClinicSession) => Promise<void>;
  isError: boolean;
}) {
  return (
    <Panel>
      <Heading style={{ fontSize: 13 }}>Published sessions</Heading>
      {sessions?.length === 0 ? (
        <Label muted>No sessions published yet.</Label>
      ) : null}
      {sessions?.map((session) => (
        <View key={session.id} style={{ gap: 8 }}>
          <View style={ui.between}>
            <Label>{new Date(session.starts_at).toLocaleString()}</Label>
            <Label muted>
              {session.state} · {session.hard_capacity} slots
            </Label>
          </View>
          <Input
            label="Auto-confirm limit"
            value={
              sessionLimits[session.id] ??
              String(session.auto_confirm_limit ?? 0)
            }
            onChangeText={(value) => onLimitChange(session.id, value)}
            keyboardType="number-pad"
          />
          <Button
            theme="doctor"
            variant="outline"
            label="Save approval limit"
            disabled={busy}
            onPress={() => void onSaveLimit(session)}
          />
        </View>
      ))}
      {isError ? (
        <Label style={ui.error}>Could not load sessions.</Label>
      ) : null}
    </Panel>
  );
}

export function UnavailableTimePanel({
  leaveDate,
  onLeaveDateChange,
  leaveStart,
  onLeaveStartChange,
  leaveEnd,
  onLeaveEndChange,
  leaveReason,
  onLeaveReasonChange,
  busy,
  canAdd,
  onAddLeave,
  unavailable,
  onRemoveLeave,
  isError,
}: {
  leaveDate: string;
  onLeaveDateChange: (val: string) => void;
  leaveStart: string;
  onLeaveStartChange: (val: string) => void;
  leaveEnd: string;
  onLeaveEndChange: (val: string) => void;
  leaveReason: string;
  onLeaveReasonChange: (val: string) => void;
  busy: boolean;
  canAdd: boolean;
  onAddLeave: () => void;
  unavailable?: ClinicUnavailability[];
  onRemoveLeave: (item: ClinicUnavailability) => Promise<void>;
  isError: boolean;
}) {
  return (
    <Panel>
      <Heading style={{ fontSize: 13 }}>Unavailable time</Heading>
      <Input
        label="Date (YYYY-MM-DD)"
        value={leaveDate}
        onChangeText={onLeaveDateChange}
      />
      <View style={ui.row}>
        <Input
          label="Start (HH:mm)"
          value={leaveStart}
          onChangeText={onLeaveStartChange}
          containerStyle={ui.flex}
        />
        <Input
          label="End (HH:mm)"
          value={leaveEnd}
          onChangeText={onLeaveEndChange}
          containerStyle={ui.flex}
        />
      </View>
      <Input
        label="Reason"
        value={leaveReason}
        onChangeText={onLeaveReasonChange}
      />
      <Button
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
              {new Date(item.starts_at).toLocaleString()} –{" "}
              {new Date(item.ends_at).toLocaleString()}
            </Label>
            <Label muted>{item.reason}</Label>
            <Button
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
    </Panel>
  );
}

export function ConsultationChargesPanel({
  draft,
  onUpdate,
}: {
  draft: {
    onlineFee: string;
    clinicFee: string;
    homeFee: string;
  };
  onUpdate: (changes: Partial<{ onlineFee: string; clinicFee: string; homeFee: string }>) => void;
}) {
  return (
    <Panel>
      <Heading style={{ fontSize: 13 }}>Consultation Charges</Heading>
      {(
        [
          ["Online Consultation", "onlineFee"],
          ["Clinic Visit", "clinicFee"],
          ["Home Visit", "homeFee"],
        ] as const
      ).map(([title, key]) => (
        <View key={key} style={ui.between}>
          <Label style={{ fontSize: 13, flex: 1 }}>{title}</Label>
          <Label>₹</Label>
          <Input
            accessibilityLabel={`${title} charge in rupees`}
            value={draft[key]}
            onChangeText={(value) => onUpdate({ [key]: value })}
            keyboardType="decimal-pad"
            containerStyle={{ width: 100 }}
          />
        </View>
      ))}
      <Label muted style={{ fontSize: 12 }}>
        The clinic charge is used when you publish clinic slots. Online and home visit booking are not connected yet.
      </Label>
    </Panel>
  );
}

export function WorkingDaysPanel({
  selectedDays,
  onToggleDay,
}: {
  selectedDays: number[];
  onToggleDay: (dayIndex: number) => void;
}) {
  return (
    <Panel>
      <Heading style={{ fontSize: 13 }}>Working Days</Heading>
      <View style={{ ...ui.row, gap: 4, justifyContent: "space-between" }}>
        {[
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
          "Sunday",
        ].map((day, index) => (
          <Pressable
            key={day}
            accessibilityRole="checkbox"
            accessibilityLabel={day}
            accessibilityState={{ checked: selectedDays.includes(index) }}
            onPress={() => onToggleDay(index)}
            style={{
              flex: 1,
              maxWidth: 46,
              minHeight: 44,
              borderRadius: 24,
              borderWidth: 1,
              borderColor: palette.primary,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selectedDays.includes(index)
                ? palette.primary
                : "white",
            }}
          >
            <Label
              style={{
                color: selectedDays.includes(index) ? "white" : palette.primary,
              }}
            >
              {day[0]}
            </Label>
          </Pressable>
        ))}
      </View>
    </Panel>
  );
}

export function ClinicHoursPanel({
  start,
  end,
  timeValid,
  onUpdate,
}: {
  start: string;
  end: string;
  timeValid: boolean;
  onUpdate: (changes: Partial<{ start: string; end: string }>) => void;
}) {
  return (
    <Panel>
      <View style={ui.between}>
        <Heading style={{ fontSize: 13 }}>Clinic Hours</Heading>
        <Label style={{ color: palette.primary, fontSize: 13 }}>
          {timeValid
            ? `${formatTime(minutes(start))} – ${formatTime(minutes(end))}`
            : "Enter valid hours"}
        </Label>
      </View>
      <View style={ui.row}>
        <Input
          label="Start Time"
          accessibilityLabel="Start Time"
          value={start}
          onChangeText={(newStart) => onUpdate({ start: newStart })}
          placeholder="09:00"
          maxLength={5}
          containerStyle={ui.flex}
        />
        <Input
          label="End Time"
          accessibilityLabel="End Time"
          value={end}
          onChangeText={(newEnd) => onUpdate({ end: newEnd })}
          placeholder="17:00"
          maxLength={5}
          containerStyle={ui.flex}
        />
      </View>
    </Panel>
  );
}

