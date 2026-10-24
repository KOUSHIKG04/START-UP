import { styles } from "./Appointments.styles";
import type { DayPillProps } from "../types/day-pill";
import { memo } from "react";
import { Pressable } from "react-native";
import { Heading, Label } from "../../../components/DoctorScreen";

export const DayPill = memo(function DayPill({
  day,
  selected,
  onPress,
}: DayPillProps) {
  const handlePress = () => onPress(day.key);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityLabel={`${day.day} ${day.month}`}
      accessibilityState={{ checked: selected }}
      onPress={handlePress}
      style={[styles.dayPill, selected && styles.dayPillSelected]}
    >
      <Heading style={selected ? styles.dayTextSelected : styles.dayText}>
        {day.day}
      </Heading>
      <Label style={selected ? styles.dayLabelSelected : styles.dayLabel}>
        {day.label}
      </Label>
    </Pressable>
  );
});
