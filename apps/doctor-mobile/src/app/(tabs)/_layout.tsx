import { Tabs, router, type Href } from "expo-router";
import { View, StyleSheet } from "react-native";
import { Home, Calendar, Calendars, User, ScanLine } from "lucide-react-native";
import { BottomNavBar, type NavItem } from "@startup/mobile-ui";
import { IconButton, palette } from "../../components/DoctorScreen";
const items: NavItem[] = [
  { key: "index", label: "Home", icon: Home },
  { key: "appointments", label: "Appointments", icon: Calendar },
  { key: "schedule", label: "Schedules", icon: Calendars },
  { key: "profile", label: "Profile", icon: User },
];
const fullScreen = ["online-consultation", "chat", "home-visit", "scan-qr"];
export default function TabsLayout() {
  return (
    <View style={styles.container}>
      <Tabs
        backBehavior="history"
        screenOptions={{
          headerShown: false,
          animation: "none",
          tabBarHideOnKeyboard: true,
          sceneStyle: { backgroundColor: palette.white },
        }}
        tabBar={({ state }) => {
          const route =
            state.routes[state.index]?.name.split("/")[0] ?? "index";
          if (fullScreen.includes(route)) return null;
          const active = ["clinical-notes", "prescription"].includes(route)
            ? "appointments"
            : route;
          return (
            <BottomNavBar
              items={items}
              activeTab={active}
              onTabChange={(key) =>
                router.navigate((key === "index" ? "/" : `/${key}`) as Href)
              }
              renderCenterButton={() => (
                <IconButton
                  label="Scan patient QR code"
                  onPress={() => router.push("/scan-qr")}
                  style={styles.scan}
                >
                  <ScanLine size={30} color={palette.primary} />
                </IconButton>
              )}
            />
          );
        }}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="appointments/index" />
        <Tabs.Screen name="schedule/index" />
        <Tabs.Screen name="profile/index" />
        {[
          "clinical-notes",
          "prescription",
          "online-consultation",
          "chat",
          "home-visit",
          "scan-qr",
        ].map((name) => (
          <Tabs.Screen
            key={name}
            name={`${name}/index`}
            options={{ href: null }}
          />
        ))}
      </Tabs>
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, width: "100%", maxWidth: 600, alignSelf: "center" },
  scan: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#E6F7F6",
    borderWidth: 1,
    borderColor: palette.primary,
  },
});
