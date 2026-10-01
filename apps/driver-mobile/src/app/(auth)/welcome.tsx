import { router } from "expo-router";
import { WelcomeScreen } from "../../features/auth/screens/RegistrationScreens";
import { useMobileSession } from "../../services/supabase";

export default function WelcomeRoute() {
  const { session } = useMobileSession();
  return (
    <WelcomeScreen
      onNext={() => router.push(session ? "/details" : "/login")}
    />
  );
}
