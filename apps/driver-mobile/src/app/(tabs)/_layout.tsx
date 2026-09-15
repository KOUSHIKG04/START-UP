import { Tabs, router, type Href, Redirect } from "expo-router";
import { Home, Ambulance, Wallet, User } from "lucide-react-native";
import { BottomNavBar, type NavItem } from "@startup/mobile-ui";
import { useDriver } from "../../store/driver";
const items: NavItem[] = [
  { key: "home", label: "Home", icon: Home },
  { key: "trips", label: "Trips", icon: Ambulance },
  { key: "earnings", label: "Earnings", icon: Wallet },
  { key: "profile", label: "Profile", icon: User },
];
export default function TabsLayout() {
  const verified = useDriver((s) => s.verified);
  if (!verified) return <Redirect href="/verification" />;
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
          activeTab={
            state.routes[state.index].name === "trip"
              ? "home"
              : state.routes[state.index].name
          }
          onTabChange={(key) => router.navigate(`/${key}` as Href)}
        />
      )}
    >
      <Tabs.Screen name="home" />
      <Tabs.Screen name="trips" />
      <Tabs.Screen name="earnings" />
      <Tabs.Screen name="profile" />
      <Tabs.Screen name="trip" options={{ href: null }} />
    </Tabs>
  );
}
