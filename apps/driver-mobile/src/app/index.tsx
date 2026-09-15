import { router } from "expo-router";
import { WelcomeScreen } from "../screens/registration/RegistrationScreens";
export default function WelcomeRoute() {
  return <WelcomeScreen onNext={() => router.push("/details")} />;
}
