import { Redirect, useLocalSearchParams } from "expo-router";
import { ScheduleScreen } from "../../../features/schedule/screens/ScheduleScreen";

export default function ManageServiceSchedule() {
  const { mode } = useLocalSearchParams<{ mode: string }>();
  if (mode !== "clinic" && mode !== "online" && mode !== "home")
    return <Redirect href="/schedule" />;
  return <ScheduleScreen key={mode} mode={mode} />;
}
