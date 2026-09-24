import { Tabs, router, type Href, Redirect } from "expo-router";
import { Home, Navigation, User } from "lucide-react-native";
import { BottomNavBar, type NavItem } from "@startup/mobile-ui";
import { useMobileSession } from "../../../services/supabase";
const items: NavItem[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "trip", label: "Trip", icon: Navigation },
  { key: "profile", label: "Profile", icon: User },
];
export default function TabsLayout() {
  const hasDriver = Boolean(useMobileSession().profile?.driver?.id);
  if (!hasDriver) return <Redirect href="/onboarding" />;
  return (
    <Tabs
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: "none",
        sceneStyle: { backgroundColor: "white" },
      }}
      tabBar={({ state }) => (
        <BottomNavBar
          items={items}
          activeTab={state.routes[state.index].name}
          onTabChange={(key) => router.navigate(`/${key}` as Href)}
        />
      )}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="trips" options={{ href: null }} />
      <Tabs.Screen name="earnings" options={{ href: null }} />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="trip" />
    </Tabs>
  );
}
