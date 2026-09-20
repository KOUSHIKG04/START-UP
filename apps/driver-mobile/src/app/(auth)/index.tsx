import { router } from "expo-router";
import { WelcomeScreen } from "../../features/auth/screens/RegistrationScreens";
export default function WelcomeRoute() {
  return <WelcomeScreen onNext={() => router.push("/details")} />;
}
