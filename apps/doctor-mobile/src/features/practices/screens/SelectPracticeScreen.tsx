import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin } from "lucide-react-native";
import { getMyDoctorProfile, listMyPractices } from "@startup/data-access";
import type { ClinicPractice, DoctorProfile } from "@startup/contracts";
import { Loader, useToast, useToastFeedback } from "@startup/mobile-ui";
import { DoctorScreen, Heading, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";
import { getSelectedPracticeId, selectedPracticeQueryKey, setSelectedPracticeId } from "../selectedPractice";

export function SelectPracticeScreen() {
  const { profile } = useMobileSession();
  const doctorId = profile?.doctor?.id;
  const client = useQueryClient();
  const { showToast } = useToast();
  const practices = useQuery({ queryKey: ["my-practices"], queryFn: () => listMyPractices(supabase!), enabled: Boolean(supabase) });
  const doctorProfile = useQuery({ queryKey: ["my-doctor-profile", doctorId], queryFn: () => getMyDoctorProfile(supabase!), enabled: Boolean(supabase && doctorId) });
  const selected = useQuery({ queryKey: selectedPracticeQueryKey(doctorId), queryFn: () => getSelectedPracticeId(doctorId!), enabled: Boolean(doctorId) });
  useToastFeedback({ error: practices.isError || doctorProfile.isError || selected.isError ? "Could not load your practice locations. Reopen this page to retry." : "" });
  const approved = (practices.data as ClinicPractice[] | undefined)?.filter(item => item.is_clinician && item.verified) ?? [];
  const selectedId = approved.some(item => item.practice_id === selected.data) ? selected.data : approved[0]?.practice_id;

  async function choose(practiceId: string) {
    if (!doctorId) return;
    try {
      await setSelectedPracticeId(doctorId, practiceId);
      client.setQueryData(selectedPracticeQueryKey(doctorId), practiceId);
      router.back();
    } catch {
      showToast({ title: "Could not select practice", message: "Try again.", type: "error" });
    }
  }

  return <DoctorScreen title="Select Practice Location" bottomNav={false} contentStyle={styles.content}>
    <Label muted>Choose from your approved clinics or hospitals. Practice addresses are managed through verification.</Label>
    {practices.isLoading || doctorProfile.isLoading || selected.isLoading ? <Loader theme="doctor" /> : null}
    {!practices.isLoading && approved.length === 0 ? <Panel><Label muted>No approved practice location is available yet.</Label></Panel> : null}
    {approved.map(practice => {
      const address = (doctorProfile.data as DoctorProfile | undefined)?.facilities.find(item => item.practice_id === practice.practice_id)?.address;
      const active = practice.practice_id === selectedId;
      return <Pressable
        key={practice.practice_id}
        accessibilityRole="button"
        accessibilityLabel={`Select ${practice.facility_name}${address ? `, ${address}` : ""}`}
        accessibilityState={{ selected: active }}
        onPress={() => void choose(practice.practice_id)}
        style={({ pressed }) => [styles.practice, active && styles.selected, pressed && styles.pressed]}
      >
        <View style={[ui.row, ui.flex]}><MapPin size={19} color={palette.primary} /><View style={ui.flex}><Heading>{practice.facility_name}</Heading>{address ? <Label muted>{address}</Label> : null}</View></View>
        {active ? <Check size={20} color={palette.primary} /> : null}
      </Pressable>;
    })}
  </DoctorScreen>;
}

const styles = StyleSheet.create({
  content: { gap: 14 },
  practice: { minHeight: 72, borderWidth: 1, borderColor: palette.border, borderRadius: 14, padding: 16, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: palette.white },
  selected: { borderColor: palette.primary, backgroundColor: palette.subtle },
  pressed: { opacity: 0.65 },
});
