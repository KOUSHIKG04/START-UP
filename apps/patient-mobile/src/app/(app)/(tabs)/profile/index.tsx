import { router } from "expo-router";
import { ProfileScreen } from "../../../../features/profile/screens/ProfileScreen";

export default function ProfileRoute() {
  return (
    <ProfileScreen onBackPress={() => router.navigate("/")} />
  );
}
