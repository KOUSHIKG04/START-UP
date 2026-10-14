import { router } from "expo-router";
import { Pressable, View } from "react-native";
import { Building2, House, Video, ChevronRight } from "lucide-react-native";
import { DoctorScreen, Heading, Label } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

export function ScheduleOptionsScreen() {
  return <DoctorScreen title="Manage Schedule" background="#F6F9F9">
    {([
      ["clinic", "Clinic appointments", "Manage visits at your clinic or hospital", Building2],
      ["home", "Home visits", "Manage home-visit times and travel radius", House],
      ["online", "Online consultations", "Manage video consultation times", Video],
    ] as const).map(([mode, title, description, Icon]) =>
      <Pressable key={mode} accessibilityRole="button" accessibilityLabel={title}
        onPress={() => router.push(`/manage-schedule/${mode}`)}
        style={({ pressed }) => [ui.panel, { flexDirection: "row", alignItems: "center", gap: 14, minHeight: 80, backgroundColor: pressed ? "#F1F5F5" : palette.white }]}>
        <Icon size={24} color={palette.primary} />
        <View style={{ flex: 1, gap: 4 }}><Heading style={{ fontSize: 16 }}>{title}</Heading><Label muted style={{ fontSize: 13 }}>{description}</Label></View>
        <ChevronRight size={20} color={palette.muted} />
      </Pressable>)}
  </DoctorScreen>;
}
