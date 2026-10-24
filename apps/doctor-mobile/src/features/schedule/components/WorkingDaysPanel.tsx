import { workingDayLabels } from "../utils/workingDaysPanelConstants";
import { ScheduleSection } from "./ScheduleSection";

import type { WorkingDaysPanelProps } from "../types/working-days-panel";
import { Pressable } from "react-native";
import { FadedScrollView } from "@startup/mobile-ui";
import { Label } from "../../../components/DoctorScreen";
import { palette } from "../../../components/theme";

export function WorkingDaysPanel({
  selectedDays,
  onToggleDay,
}: WorkingDaysPanelProps) {
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
        {workingDayLabels.map((day, index) => (
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
