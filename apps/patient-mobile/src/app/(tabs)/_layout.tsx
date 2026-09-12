import { StyleSheet } from "react-native";
import { Tabs, usePathname } from "expo-router";
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

export default function TabsLayout() {
  const pathname = usePathname();

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
        tabBar={({ state, navigation }) => (
          <BottomNavBar
            items={patientNavItems}
            activeTab={state.routes[state.index]?.name ?? "index"}
            onTabChange={(routeName) => navigation.navigate(routeName)}
            showSOS
          />
        )}
      >
        <Tabs.Screen name="index" />
        <Tabs.Screen name="appointments" />
        <Tabs.Screen name="records" />
        <Tabs.Screen name="profile" />
      </Tabs>

      <StatusBar style={pathname === "/" ? "dark" : "light"} />
    </>
  );
}

const styles = StyleSheet.create({
  scene: {
    backgroundColor: colors.patient.background,
  },
});
