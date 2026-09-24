import { StyleSheet, Text } from "react-native";
import { Button, SafeAreaView } from "@startup/mobile-ui";
import { mobileSession, supabase, useMobileSession } from "../../services/supabase";

export default function DriverVerification() {
  const { profile, error } = useMobileSession();
  return <SafeAreaView style={styles.screen}>
    <Text style={styles.title}>Driver verification</Text>
    <Text>Your driver account is {profile?.driver?.status ?? "not yet registered"}. A reviewer must verify your credentials before trips are available.</Text>
    {error ? <Text accessibilityRole="alert">{error}</Text> : null}
    <Button label="Check status" onPress={() => void mobileSession.refresh()} />
    <Button label="Sign out" variant="outline" onPress={() => void supabase?.auth.signOut()} />
  </SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1, justifyContent: "center", padding: 24, gap: 20 }, title: { fontSize: 25, fontWeight: "700" } });
