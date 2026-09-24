import { Redirect } from "expo-router";
import { useMobileSession } from "../../services/supabase";

export default function AuthIndex() {
  const { session, profile } = useMobileSession();
  return (
    <Redirect
      href={
        !session ? "/login" : profile?.doctor ? "/review-status" : "/onboarding"
      }
    />
  );
}
