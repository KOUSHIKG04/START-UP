import { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Button, Input } from "@startup/mobile-ui";
import { Calendar, Check } from "lucide-react-native";
import {
  DoctorScreen,
  Heading,
  Label,
  palette,
  Panel,
  ui,
} from "../../../components/DoctorScreen";
import { useDoctorStore } from "../../../stores/useDoctorStore";
import {
  formatTime,
  minutes,
  previewSlots,
  scheduleError,
} from "../utils/schedule";
import type { Schedule } from "../../../types/doctor";

function Range({
  title,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ gap: 5 }}>
      <View style={ui.between}>
        <Label style={{ fontSize: 13 }}>{title}</Label>
        <Label style={{ color: palette.primary, fontSize: 12 }}>
          {value} {suffix}
        </Label>
      </View>
      <Slider
        accessibilityLabel={title}
        accessibilityValue={{ min, max, now: value }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={palette.primary}
        maximumTrackTintColor={palette.border}
        thumbTintColor={palette.primary}
        style={{ height: 36 }}
      />
      <View style={ui.between}>
        <Label muted style={{ fontSize: 11 }}>
          {min}
        </Label>
        <Label muted style={{ fontSize: 11 }}>
          {max}
        </Label>
      </View>
    </View>
  );
}
export function ScheduleScreen() {
  const savedSchedule = useDoctorStore((s) => s.schedule);
  const save = useDoctorStore((s) => s.saveSchedule);
  const [draft, setDraft] = useState<Schedule>(savedSchedule);
  useEffect(() => {
    setDraft(savedSchedule);
  }, [savedSchedule]);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const update = (changes: Partial<Schedule>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setMessage("");
    setError("");
  };
  const slots = previewSlots(draft);
  const timeValid =
    Number.isFinite(minutes(draft.start)) &&
    Number.isFinite(minutes(draft.end));
  return (
    <DoctorScreen
      title="Manage Schedule"
      subtitle="Define your working hours and booking preferences"
      background="#F6F9F9"
    >
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
              accessibilityState={{ checked: draft.days.includes(index) }}
              onPress={() =>
                update({
                  days: draft.days.includes(index)
                    ? draft.days.filter((d) => d !== index)
                    : [...draft.days, index],
                })
              }
              style={{
                flex: 1,
                maxWidth: 46,
                minHeight: 44,
                borderRadius: 24,
                borderWidth: 1,
                borderColor: palette.primary,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: draft.days.includes(index)
                  ? palette.primary
                  : "white",
              }}
            >
              <Label
                style={{
                  color: draft.days.includes(index) ? "white" : palette.primary,
                }}
              >
                {day[0]}
              </Label>
            </Pressable>
          ))}
        </View>
      </Panel>
      <Panel>
        <View style={ui.between}>
          <Heading style={{ fontSize: 13 }}>Clinic Hours</Heading>
          <Label style={{ color: palette.primary, fontSize: 13 }}>
            {timeValid
              ? `${formatTime(minutes(draft.start))} – ${formatTime(minutes(draft.end))}`
              : "Enter valid hours"}
          </Label>
        </View>
        <View style={ui.row}>
          <Input
            label="Start Time"
            accessibilityLabel="Start Time"
            value={draft.start}
            onChangeText={(start) => update({ start })}
            placeholder="09:00"
            maxLength={5}
            containerStyle={ui.flex}
          />
          <Input
            label="End Time"
            accessibilityLabel="End Time"
            value={draft.end}
            onChangeText={(end) => update({ end })}
            placeholder="17:00"
            maxLength={5}
            containerStyle={ui.flex}
          />
        </View>
      </Panel>
      <Panel>
        <Range
          title="Slot Duration"
          value={draft.duration}
          min={10}
          max={60}
          step={5}
          suffix="minutes"
          onChange={(duration) => update({ duration })}
        />
      </Panel>
      <Panel>
        <Heading style={{ fontSize: 13 }}>Daily Slot Limits</Heading>
        <Range
          title="Online appointments"
          value={draft.online}
          min={1}
          max={15}
          suffix="slots"
          onChange={(online) => update({ online })}
        />
        <Range
          title="Walk-in appointments"
          value={draft.walkIn}
          min={1}
          max={15}
          suffix="slots"
          onChange={(walkIn) => update({ walkIn })}
        />
      </Panel>
      <Panel>
        <Heading style={{ fontSize: 13 }}>
          Slot Preview ({slots.length} slots/day)
        </Heading>
        <View style={ui.wrap}>
          {slots.map((slot) => (
            <View
              key={slot}
              style={{
                borderWidth: 1,
                borderColor: palette.primary,
                backgroundColor: palette.surface,
                borderRadius: 6,
                paddingHorizontal: 9,
                paddingVertical: 5,
              }}
            >
              <Label style={{ color: palette.header, fontSize: 12 }}>
                {slot}
              </Label>
            </View>
          ))}
        </View>
        {!slots.length && (
          <Label muted>Adjust clinic hours to preview available slots.</Label>
        )}
      </Panel>
      <Panel>
        <View style={ui.between}>
          <Heading style={{ fontSize: 13 }}>Auto Accept Bookings</Heading>
          <Switch
            accessibilityLabel="Auto Accept Bookings"
            value={draft.autoAccept}
            onValueChange={(autoAccept) => update({ autoAccept })}
            trackColor={{ false: "#D1D5DB", true: palette.primary }}
          />
        </View>
        <Label muted style={{ fontSize: 12 }}>
          {draft.autoAccept
            ? `New bookings will be auto-accepted up to ${draft.autoLimit} per day.`
            : "All new bookings will need manual approval."}
        </Label>
        {draft.autoAccept && (
          <>
            <Range
              title="Daily auto-accept limit"
              value={draft.autoLimit}
              min={1}
              max={50}
              suffix="bookings"
              onChange={(autoLimit) => update({ autoLimit })}
            />
            {[
              "Bookings are accepted instantly under limit",
              "Bookings beyond the limit will need manual approval",
            ].map((text) => (
              <View key={text} style={ui.row}>
                <Check size={14} color={palette.primary} />
                <Label muted style={{ fontSize: 12, flex: 1 }}>
                  {text}
                </Label>
              </View>
            ))}
          </>
        )}
      </Panel>
      <Panel>
        <View style={ui.between}>
          <Heading style={{ fontSize: 13 }}>Home Visit Appointments</Heading>
          <Switch
            accessibilityLabel="Home Visit Appointments"
            value={draft.homeVisits}
            onValueChange={(homeVisits) => update({ homeVisits })}
            trackColor={{ false: "#D1D5DB", true: palette.primary }}
          />
        </View>
        <Label muted style={{ fontSize: 12 }}>
          {draft.homeVisits
            ? "Patients can request home visit appointments."
            : "Home visit bookings are disabled. Clinic and online appointments remain available."}
        </Label>
      </Panel>
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
              onChangeText={(value) => update({ [key]: value })}
              keyboardType="decimal-pad"
              containerStyle={{ width: 100 }}
            />
          </View>
        ))}
        <Label muted style={{ fontSize: 12 }}>
          Patients will see these charges while booking
        </Label>
      </Panel>
      {!!error && <Label style={ui.error}>{error}</Label>}
      {!!message && <Label style={ui.success}>{message}</Label>}
      <Button
        theme="doctor"
        label="Save Schedule"
        leftIcon={<Calendar size={17} color="white" />}
        onPress={() => {
          const problem = scheduleError(draft);
          if (problem) {
            setError(problem);
            return;
          }
          save({ ...draft, days: [...draft.days] });
          setMessage("Schedule saved for this demo session.");
          setError("");
        }}
      />
    </DoctorScreen>
  );
}
