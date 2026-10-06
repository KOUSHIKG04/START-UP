import { View, Pressable } from "react-native";
import { Button, Chip, FadedScrollView, Input } from "@startup/mobile-ui";
import { Heading, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { endMinutes, formatTime, minutes, slotStartTimes } from "../utils/schedule";
import { formatDisplayDateTime, parseDisplayDate, type ClinicSession, type ClinicUnavailability } from "@startup/contracts";

export function PublishSessionPanel({
  publishDate,
  onPublishDateChange,
  busy,
  disabled,
  disabledReason,
  publishIssue,
  onPublish,
  onPublishOnline,
  onPublishHome,
  onlineDisabled,
  homeDisabled,
  selectedSlots,
  remainingSlots,
  usedSlots,
  dailyLimits,
  dailyUsageReady,
  dailyUsageError,
  slotMinutes,
  onToggleSlot,
  windows,
  onWindowChange,
}: {
  publishDate: string;
  onPublishDateChange: (date: string) => void;
  busy: boolean;
  disabled: boolean;
  disabledReason: string | null;
  publishIssue: { mode: "clinic" | "online" | "home"; message: string } | null;
  onPublish: () => void;
  onPublishOnline: () => void;
  onPublishHome: () => void;
  onlineDisabled: boolean;
  homeDisabled: boolean;
  selectedSlots: Record<"clinic" | "online" | "home", string[]>;
  remainingSlots: Record<"clinic" | "online" | "home", number>;
  usedSlots: { clinic: number; online: number } | undefined;
  dailyLimits: { clinic: number; online: number };
  dailyUsageReady: boolean;
  dailyUsageError: boolean;
  slotMinutes: Record<"clinic" | "online" | "home", number>;
  onToggleSlot: (mode: "clinic" | "online" | "home", slot: string) => void;
  windows: Record<"clinic" | "online" | "home", { start: string; end: string }>;
  onWindowChange: (mode: "clinic" | "online" | "home", part: "start" | "end", value: string) => void;
}) {
  return (
    <Panel>
      <Heading style={{ fontSize: 13 }}>Publish appointment slots</Heading>
      <Label muted>
        Saving working hours does not publish bookings. Choose a future date, tap the exact clinic, online or home-visit times, then publish that service. Only future published times appear in the Patient App.
      </Label>
      <Input
        label="Date (DD-MM-YYYY)"
        value={publishDate}
        onChangeText={onPublishDateChange}
        placeholder="DD-MM-YYYY"
      />
      {disabledReason ? <Label muted>{disabledReason}</Label> : null}
      {(["clinic", "online", "home"] as const).map(mode => {
        const available = slotStartTimes(windows[mode].start, windows[mode].end, slotMinutes[mode]);
        const isoDate = parseDisplayDate(publishDate);
        const futureAvailable = available.some(slot => isoDate && new Date(`${isoDate}T${slot}:00`) > new Date());
        const limitReached = mode !== "home" && dailyUsageReady && selectedSlots[mode].length >= remainingSlots[mode];
        const publishedLimitReached = mode !== "home" && dailyUsageReady && remainingSlots[mode] === 0;
        return <View key={mode} style={{ gap: 8 }}>
          <Heading style={{ fontSize: 13 }}>{mode === "clinic" ? "Clinic visit" : mode === "online" ? "Online consultation" : "Home visit"}</Heading>
          <Label muted>{slotMinutes[mode]} minutes per {mode === "home" ? "home visit" : "appointment"}</Label>
          <View style={ui.row}>
            <Input label="Start (HH:mm)" value={windows[mode].start} onChangeText={value => onWindowChange(mode, "start", value)} containerStyle={ui.flex} />
            <Input label="End (HH:mm)" value={windows[mode].end} onChangeText={value => onWindowChange(mode, "end", value)} containerStyle={ui.flex} />
          </View>
          <Label muted>
            Slot preview · tap a time pill to select it ({selectedSlots[mode].length} selected)
            {isoDate && available.length > 0 && !futureAvailable ? " · all times in this block have passed; choose a future date or later hours" : null}
            {mode === "online" && onlineDisabled ? " · increase online daily limit" : null}
            {mode === "home" && homeDisabled ? " · enable home visits and save schedule" : null}
            {mode !== "home" && isoDate ? dailyUsageReady ? publishedLimitReached ? ` · ${usedSlots?.[mode] ?? 0} of ${dailyLimits[mode]} daily slots published; raise the Daily Slot Limit above to add more` : limitReached ? " · selection fills the remaining daily slots" : ` · ${Math.max(0, remainingSlots[mode] - selectedSlots[mode].length)} remaining for this date` : dailyUsageError ? " · could not check daily limit; retry this screen" : " · checking daily limit…" : null}
          </Label>
          <FadedScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 2 }}>
            {available.map(slot => { const selected = selectedSlots[mode].includes(slot); const atLimit = !selected && (mode === "home" ? selectedSlots[mode].length >= 100 : !dailyUsageReady || limitReached); const past = Boolean(isoDate && new Date(`${isoDate}T${slot}:00`) <= new Date()); const pillDisabled = busy || disabled || atLimit || (!selected && past); return <Chip key={slot} label={formatTime(minutes(slot))} theme="doctor" selected={selected} disabled={pillDisabled} accessibilityRole="checkbox" accessibilityState={{ checked: selected }} accessibilityHint={selected ? "Tap to remove this time from publication" : past ? "This time has already started" : pillDisabled ? "Daily slot limit reached or schedule unavailable" : "Tap to include this time when publishing"} onPress={() => onToggleSlot(mode, slot)} style={{ minHeight: 48, paddingHorizontal: 14, borderWidth: 1, borderColor: selected ? palette.primary : palette.border, backgroundColor: selected ? palette.primary : pillDisabled ? palette.subtle : palette.surface }} labelStyle={{ color: selected ? palette.white : pillDisabled ? palette.muted : palette.header, fontSize: 13 }} />; })}
            {!available.length ? <Label muted>Enter valid start and end times.</Label> : null}
          </FadedScrollView>
          <Button theme="doctor" variant={mode === "clinic" ? undefined : "outline"}
            label={`Publish ${selectedSlots[mode].length} ${mode === "online" ? "online" : mode === "home" ? "home visit" : "clinic"} slots`}
            disabled={busy}
            onPress={mode === "clinic" ? onPublish : mode === "online" ? onPublishOnline : onPublishHome} />
          {publishIssue?.mode === mode ? <Label style={ui.error}>{publishIssue.message}</Label> : null}
        </View>
      })}
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
            <Label>{formatDisplayDateTime(session.starts_at, session.timezone)}</Label>
            <Label muted>
              {session.service_mode === "online" ? "Online" : session.service_mode === "home" ? "Home visit" : "Clinic"} · {new Date(session.ends_at) <= new Date() ? "past" : session.state} · {session.hard_capacity} slots
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
        label="Date (DD-MM-YYYY)"
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
              {formatDisplayDateTime(item.starts_at)} –{" "}
              {formatDisplayDateTime(item.ends_at)}
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
        These charges are used when you publish each service's slots.
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
            ? `${formatTime(minutes(start))} – ${end === "24:00" ? "12:00 AM (next day)" : formatTime(endMinutes(end))}`
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

