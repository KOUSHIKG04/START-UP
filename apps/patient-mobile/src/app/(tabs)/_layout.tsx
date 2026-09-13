import { StyleSheet } from "react-native";
import { Tabs, router, type Href } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Calendar, FileText, Home, User } from "lucide-react-native";
import { colors } from "@startup/design-tokens";
import { BottomNavBar, type NavItem } from "@startup/mobile-ui";

const patientNavItems: NavItem[] = [
  { key: "index", label: "Home", icon: Home },
  { key: "appointments", label: "Appointments", icon: Calendar },
  { key: "records", label: "Records", icon: FileText },
  { key: "profile", label: "Profile", icon: User },
];

const patientTabRoutes: Record<string, Href> = {
  index: "/",
  appointments: "/appointments",
  records: "/records",
  profile: "/profile",
};

export default function TabsLayout() {
  return (
    <>
      <Tabs
        backBehavior="history"
        detachInactiveScreens={false}
        screenOptions={{
          headerShown: false,
          animation: "none",
          lazy: false,
          sceneStyle: styles.scene,
        }}
        tabBar={({ state }) => (
          <BottomNavBar
            items={patientNavItems}
            activeTab={
              ["find-doctor", "doctor-results"].includes(
                state.routes[state.index]?.name.split("/")[0] ?? ""
              )
                ? "index"
                : (state.routes[state.index]?.name.split("/")[0] ?? "index")
            }
            onTabChange={(routeName) => {
              const href = patientTabRoutes[routeName];
              if (href) router.navigate(href);
            }}
            showSOS
          />
        )}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="appointments/index" />
        <Tabs.Screen name="records/index" />
        <Tabs.Screen name="profile/index" />
        <Tabs.Screen name="find-doctor/index" options={{ href: null }} />
        <Tabs.Screen name="doctor-results/index" options={{ href: null }} />
      </Tabs>

      <StatusBar style="light" />
    </>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.patient.background,
  },
});
