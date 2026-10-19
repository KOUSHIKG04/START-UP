import type { ScheduleSectionProps } from "../types/schedule-section";
import { View } from "react-native";
import { Heading, Panel } from "../../../components/DoctorScreen";
export function ScheduleSection({ title, children }: ScheduleSectionProps) {
  return (
    <View style={{ gap: 8 }}>
      <Heading style={{ fontSize: 14 }}>{title}</Heading>
      <Panel>{children}</Panel>
    </View>
  );
}
