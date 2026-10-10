import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Building2, MapPin, Search } from "lucide-react-native";
import { getMyDoctorProfile, listMyPractices } from "@startup/data-access";
import { fontFamilies } from "@startup/design-tokens";
import { Input, Loader, useToast, useToastFeedback } from "@startup/mobile-ui";
import { DoctorScreen } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";
import { getSelectedPracticeId, selectedPracticeQueryKey, setSelectedPracticeId } from "../selectedPractice";

export function SelectPracticeScreen() {
  const { profile } = useMobileSession();
  const doctorId = profile?.doctor?.id;
  const client = useQueryClient();
  const { showToast } = useToast();
  const [search, setSearch] = useState("");
  const [saving, setSaving] = useState<string | null>(null);
  const practices = useQuery({ queryKey: ["my-practices"], queryFn: () => listMyPractices(supabase!), enabled: Boolean(supabase) });
  const doctorProfile = useQuery({ queryKey: ["my-doctor-profile", doctorId], queryFn: () => getMyDoctorProfile(supabase!), enabled: Boolean(supabase && doctorId) });
  const selected = useQuery({ queryKey: selectedPracticeQueryKey(doctorId), queryFn: () => getSelectedPracticeId(doctorId!), enabled: Boolean(doctorId) });
  useToastFeedback({ error: practices.isError || doctorProfile.isError || selected.isError ? "Could not load your practice locations. Reopen this page to retry." : "" });
  const approved = practices.data?.filter(item => item.is_clinician && item.verified) ?? [];
  const selectedId = approved.some(item => item.practice_id === selected.data) ? selected.data : approved[0]?.practice_id;
  const loading = practices.isLoading || doctorProfile.isLoading || selected.isLoading;
  const locations = approved.map(practice => ({ ...practice, address: doctorProfile.data?.facilities.find(item => item.practice_id === practice.practice_id)?.address ?? "" }));
  const filtered = locations.filter(item => `${item.facility_name} ${item.address}`.toLowerCase().includes(search.trim().toLowerCase()));

  async function choose(practiceId: string) {
    if (!doctorId || saving) return;
    setSaving(practiceId);
    try {
      await setSelectedPracticeId(doctorId, practiceId);
      client.setQueryData(selectedPracticeQueryKey(doctorId), practiceId);
      setSaving(null);
      router.back();
    } catch {
      setSaving(null);
      showToast({ title: "Could not select practice", message: "Try again.", type: "error" });
    }
  }

  return <DoctorScreen title="Select Your Location" bottomNav={false} background={palette.subtle} contentStyle={styles.content}>
    <View style={styles.search}><Input variant="unstyled" accessibilityLabel="Search approved practice locations" placeholder="Search a hospital or clinic" value={search} onChangeText={setSearch} style={styles.searchInput} /><Search size={20} color={palette.muted} /></View>
    <Text style={styles.sectionTitle}>APPROVED PRACTICES</Text>
    {loading ? <Loader theme="doctor" /> : null}
    {!loading && filtered.length === 0 ? <Text style={styles.empty}>{approved.length ? "No matching practice locations." : "No approved practice location is available yet."}</Text> : null}
    <View style={styles.cards}>
      {filtered.map(practice => {
        const active = practice.practice_id === selectedId;
        return <Pressable key={practice.practice_id} accessibilityRole="button"
          accessibilityLabel={`Select ${practice.facility_name}${practice.address ? `, ${practice.address}` : ""}`}
          accessibilityState={{ selected: active, disabled: Boolean(saving), busy: saving === practice.practice_id }}
          disabled={Boolean(saving)} onPress={() => void choose(practice.practice_id)}
          style={({ pressed }) => [styles.practice, pressed && styles.pressed]}>
          <View style={styles.iconBox}>{saving === practice.practice_id ? <Loader theme="doctor" size="small" /> : <Building2 size={25} color={palette.primary} />}</View>
          <View style={ui.flex}>
            <View style={styles.titleRow}><Text style={styles.name} numberOfLines={1}>{practice.facility_name}</Text>{active ? <Text style={styles.selected}>Selected</Text> : null}</View>
            {practice.address ? <Text style={styles.address} numberOfLines={1} ellipsizeMode="tail">{practice.address}</Text> : null}
          </View>
          <MapPin size={18} color={palette.primary} />
        </Pressable>;
      })}
    </View>
  </DoctorScreen>;
}
const styles = StyleSheet.create({
  content: { gap: 16, paddingHorizontal: 20, paddingTop: 20 },
  search: { flexDirection: "row", alignItems: "center", minHeight: 52, backgroundColor: palette.white, borderWidth: 1, borderColor: "#D9DDE0", borderRadius: 14, paddingHorizontal: 14, gap: 10 },
  searchInput: { flex: 1, minWidth: 0, minHeight: 50, fontFamily: fontFamilies.regular, fontSize: 15, color: palette.text },
  sectionTitle: { fontFamily: fontFamilies.semibold, fontSize: 13, color: palette.muted, marginTop: 4 },
  cards: { gap: 12 },
  practice: { borderWidth: 1, borderColor: "#D9DDE0", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 10, flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: palette.white },
  iconBox: { width: 56, minHeight: 56, alignItems: "center", justifyContent: "center", backgroundColor: palette.surface, borderRadius: 10 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 5 },
  name: { flexShrink: 1, fontFamily: fontFamilies.semibold, fontSize: 16, color: palette.text },
  selected: { fontFamily: fontFamilies.semibold, fontSize: 11, color: palette.dark, backgroundColor: palette.surface, borderRadius: 9, overflow: "hidden", paddingHorizontal: 8, paddingVertical: 3 },
  address: { fontFamily: fontFamilies.regular, fontSize: 13.5, color: palette.muted },
  empty: { fontFamily: fontFamilies.regular, fontSize: 14, color: palette.muted },
  pressed: { opacity: 0.76 },
});
