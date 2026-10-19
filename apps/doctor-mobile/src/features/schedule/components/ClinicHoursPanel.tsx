import { ScheduleSection } from "./ScheduleSection";

import type { ClinicHoursPanelProps } from "../types/clinic-hours-panel";
import { View } from "react-native";
import { ClockTimePicker } from "@startup/mobile-ui";
import { Label } from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";
export function ClinicHoursPanel({
  title = "Clinic Hours",
  start,
  end,
  onUpdate,
}: ClinicHoursPanelProps) {
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
