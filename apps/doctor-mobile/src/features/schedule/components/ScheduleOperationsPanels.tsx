import { View, Pressable } from "react-native";
import type { ReactNode } from "react";
import {
  Button,
  Input,
  ClockTimePicker,
  FadedScrollView,
} from "@startup/mobile-ui";
import { Heading, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { UnavailableDatePicker } from "./UnavailableDatePicker";
import {
  formatDisplayDateTime,
  type ClinicUnavailability,
} from "@startup/contracts";

export function ScheduleSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Heading style={{ fontSize: 14 }}>{title}</Heading>
      <Panel>{children}</Panel>
    </View>
  );
}

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
}: {
  timeZone?: string;
  leaveDate: string;
  onLeaveDateChange: (val: string) => void;
  leaveStart: string;
  onLeaveStartChange: (val: string) => void;
  leaveEnd: string;
  onLeaveEndChange: (val: string) => void;
  leaveReason: string;
  onLeaveReasonChange: (val: string) => void;
  busy: boolean;
  pendingAction: string | null;
  canAdd: boolean;
  onAddLeave: () => void;
  unavailable?: ClinicUnavailability[];
  onRemoveLeave: (item: ClinicUnavailability) => Promise<void>;
  isError: boolean;
}) {
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

export function ConsultationChargesPanel({
  mode,
  draft,
  onUpdate,
}: {
  mode: "clinic" | "online" | "home";
  draft: {
    onlineFee: string;
    clinicFee: string;
    homeFee: string;
  };
  onUpdate: (
    changes: Partial<{ onlineFee: string; clinicFee: string; homeFee: string }>
  ) => void;
}) {
  return (
    <ScheduleSection title="Consultation Charges">
      <Label muted style={{ fontSize: 12 }}>
        Set your appointment fee.
      </Label>
      {(
        [
          ["Online Consultation", "onlineFee"],
          ["Clinic Visit", "clinicFee"],
          ["Home Visit", "homeFee"],
        ] as const
      )
        .filter(
          ([, key]) =>
            key ===
            (mode === "clinic"
              ? "clinicFee"
              : mode === "online"
                ? "onlineFee"
                : "homeFee")
        )
        .map(([title, key]) => (
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
    </ScheduleSection>
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
    <ScheduleSection title="Working Days">
      <Label muted style={{ fontSize: 12 }}>
        Select your working days.
      </Label>
      <FadedScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8, paddingVertical: 4 }}
      >
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
              width: 54,
              height: 64,
              borderRadius: 14,
              borderWidth: 1,
              borderColor: selectedDays.includes(index)
                ? palette.dark
                : "#D2D2D2",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: selectedDays.includes(index)
                ? palette.dark
                : palette.white,
            }}
          >
            <Label
              style={{
                fontSize: 13,
                color: selectedDays.includes(index)
                  ? palette.white
                  : palette.text,
              }}
            >
              {day.slice(0, 3)}
            </Label>
          </Pressable>
        ))}
      </FadedScrollView>
    </ScheduleSection>
  );
}

export function ClinicHoursPanel({
  title = "Clinic Hours",
  start,
  end,
  onUpdate,
}: {
  title?: string;
  start: string;
  end: string;
  onUpdate: (changes: Partial<{ start: string; end: string }>) => void;
}) {
  return (
    <ScheduleSection title={title}>
      <Label muted style={{ fontSize: 12 }}>
        Set your start and end times.
      </Label>
      <View style={ui.row}>
        <ClockTimePicker
          theme="doctor"
          label="Start Time"
          value={start}
          onChange={(newStart) => onUpdate({ start: newStart })}
        />
        <ClockTimePicker
          theme="doctor"
          label="End Time"
          value={end}
          onChange={(newEnd) => onUpdate({ end: newEnd })}
          endOfDay
        />
      </View>
    </ScheduleSection>
  );
}
