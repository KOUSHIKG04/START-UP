import { Redirect } from "expo-router";
import { useMobileSession } from "../../services/supabase";

export default function AuthIndex() {
  const { session } = useMobileSession();
  return <Redirect href={session ? "/onboarding" : "/login"} />;
}
