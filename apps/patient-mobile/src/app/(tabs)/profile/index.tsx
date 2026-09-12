import { router } from "expo-router";
import { ProfileScreen } from "../../../screens/profile/ProfileScreen";

export default function ProfileRoute() {
  return (
    <ProfileScreen onBackPress={() => router.navigate("/")} />
  );
}
