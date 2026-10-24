import { ScheduleSection } from "./ScheduleSection";

import type { ClinicHoursPanelProps } from "../types/clinic-hours-panel";
import { View } from "react-native";
import { Button, ClockTimePicker } from "@startup/mobile-ui";
import { Label } from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";

export function ClinicHoursPanel({
  title = "Clinic Hours",
  start,
  end,
  blocks = [{ start, end }],
  disabled = false,
  onUpdate,
}: ClinicHoursPanelProps) {
  function change(next: typeof blocks) {
    onUpdate({
      timeBlocks: next,
      start: [...next].sort((a, b) => a.start.localeCompare(b.start))[0].start,
      end: [...next].sort((a, b) => b.end.localeCompare(a.end))[0].end,
    });
  }
  return (
    <ScheduleSection title={title}>
      <Label muted style={{ fontSize: 12 }}>
        Add separate time blocks for these working days. Leave gaps for online
        consultations, other visits or breaks.
      </Label>
      {blocks.map((block, index) => (
        <View key={index} style={{ gap: 8 }}>
          <Label>Time block {index + 1}</Label>
          <View style={ui.row}>
            <ClockTimePicker
              theme="doctor"
              label="Start Time"
              value={block.start}
              disabled={disabled}
              onChange={(newStart) =>
                change(
                  blocks.map((item, i) =>
                    i === index ? { ...item, start: newStart } : item
                  )
                )
              }
            />
            <ClockTimePicker
              theme="doctor"
              label="End Time"
              value={block.end}
              disabled={disabled}
              onChange={(newEnd) =>
                change(
                  blocks.map((item, i) =>
                    i === index ? { ...item, end: newEnd } : item
                  )
                )
              }
              endOfDay
            />
          </View>
          {blocks.length > 1 ? (
            <Button
              theme="doctor"
              variant="outline"
              label={`Remove time block ${index + 1}`}
              disabled={disabled}
              onPress={() => change(blocks.filter((_, i) => i !== index))}
            />
          ) : null}
        </View>
      ))}
      <Button
        theme="doctor"
        variant="outline"
        label="Add time block"
        disabled={disabled || blocks.length >= 8 || end === "24:00"}
        onPress={() => {
          const [h, m] = end.split(":").map(Number);
          const finish = Math.min(h * 60 + m + 60, 1440);
          change([
            ...blocks,
            {
              start: end,
              end: `${String(Math.floor(finish / 60)).padStart(2, "0")}:${String(finish % 60).padStart(2, "0")}`,
            },
          ]);
        }}
      />
    </ScheduleSection>
  );
}
