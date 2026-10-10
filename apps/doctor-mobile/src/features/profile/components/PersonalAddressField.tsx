import { useEffect, useRef, useState } from "react";
import { Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { MapPin, X } from "lucide-react-native";
import { Button, Input, ModalSurface, useToast } from "@startup/mobile-ui";
import { colors, fontFamilies } from "@startup/design-tokens";
import { doctorPersonalAddressInputSchema, type DoctorPersonalAddressInput } from "@startup/contracts";
import { useMobileSession } from "../../../services/supabase";
import { useLocationDraft } from "../../locations/locationDraft";

export const emptyPersonalAddress: DoctorPersonalAddressInput = {
 label: "Home", kind: "house", building: "", street: "", locality: "", city: "", state: "", pincode: "",
 latitude: null, longitude: null, use_account_details: true,
};

/** Profile/contact address only; never reads or writes the clinic location draft. */
export function PersonalAddressField({ value, onChange }: {
 value: DoctorPersonalAddressInput; onChange: (value: DoctorPersonalAddressInput) => void;
}) {
 const { profile } = useMobileSession();
 const [open, setOpen] = useState(false);
 const waitingForMap = useRef(false);
 const chosen = useLocationDraft(state => state.chosen);
 const clear = useLocationDraft(state => state.clear);
 const { showToast } = useToast();
 const insets = useSafeAreaInsets();
 useEffect(() => {
  if (!waitingForMap.current || !chosen) return;
  waitingForMap.current = false;
  onChange({ ...value, latitude: chosen.latitude, longitude: chosen.longitude,
   street: chosen.street, locality: chosen.locality,
   city: chosen.city, state: chosen.state, pincode: chosen.pincode });
  clear(); setOpen(true);
 }, [chosen, clear, onChange, value]);
 const set = (key: "building" | "street" | "locality" | "city" | "state" | "pincode", text: string) => onChange({ ...value, [key]: text });
 const summary = [value.building, value.street, value.locality, value.city, value.state, value.pincode].filter(Boolean).join(", ");
 return <View style={styles.field}>
  <Text style={styles.label}>Personal Address</Text>
  <Pressable accessibilityRole="button" accessibilityLabel="Edit personal address" onPress={() => setOpen(true)} style={styles.trigger}>
   <Text numberOfLines={1} style={[styles.value, !summary && styles.placeholder]}>{summary || "Enter your personal address"}</Text>
   <MapPin size={18} color={colors.doctor.primary} />
  </Pressable>
  <Text style={styles.hint}>Your contact address is separate from your consultation location.</Text>
  <ModalSurface visible={open} onClose={() => { Keyboard.dismiss(); setOpen(false); }} layout="custom" transparent animationType="slide">
   <View style={styles.overlay}>
    <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close personal address" onPress={() => { Keyboard.dismiss(); setOpen(false); }} />
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={styles.drawerWrapper}>
     <View style={[styles.drawer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
      <View style={styles.header}><Text style={styles.title}>Personal Address</Text><Pressable accessibilityRole="button" accessibilityLabel="Close personal address" hitSlop={8} onPress={() => { Keyboard.dismiss(); setOpen(false); }}><X size={22} color={colors.textSecondary} /></Pressable></View>
      <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={styles.fields}>
       <Input label="Building / house" placeholder="House number, building or floor" value={value.building ?? ""} onChangeText={text => set("building", text)} maxLength={160} style={styles.input} />
       <Input label="Street" placeholder="Street or road" value={value.street ?? ""} onChangeText={text => set("street", text)} maxLength={200} style={styles.input} />
       <Input label="Area / locality" placeholder="Area or locality" value={value.locality ?? ""} onChangeText={text => set("locality", text)} maxLength={160} style={styles.input} />
       <Input label="City" placeholder="City" value={value.city ?? ""} onChangeText={text => set("city", text)} maxLength={120} style={styles.input} />
       <Input label="State" placeholder="State" value={value.state ?? ""} onChangeText={text => set("state", text)} maxLength={120} style={styles.input} />
       <Input label="Pincode" placeholder="6-digit pincode" keyboardType="number-pad" value={value.pincode ?? ""} onChangeText={text => set("pincode", text)} maxLength={6} style={styles.input} />
       <Button theme="doctor" variant="outline" label="Choose location on map" style={styles.input} onPress={() => {
        Keyboard.dismiss(); setOpen(false); clear(); waitingForMap.current = true;
        router.push({ pathname: profile?.doctor?.status === "verified" ? "/pick-location" : "/personal-location", params: { from: "profile", ...(value.latitude !== null && value.longitude !== null ? { latitude: String(value.latitude), longitude: String(value.longitude) } : {}) } });
       }} />
       <Button theme="doctor" label="Confirm Address" style={styles.input} onPress={() => {
        const result = doctorPersonalAddressInputSchema.safeParse(value);
        if (!result.success) { showToast({ title: "Complete your personal address", message: "Enter the building, locality, city, state and a 6-digit pincode.", type: "error" }); return; }
        Keyboard.dismiss(); setOpen(false);
       }} />
      </ScrollView>
     </View>
    </KeyboardAvoidingView>
   </View>
  </ModalSurface>
 </View>;
}
const styles = StyleSheet.create({
 field: { gap: 7 }, label: { color: colors.textPrimary, fontSize: 14, fontFamily: fontFamilies.medium },
 trigger: { height: 54, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 16, flexDirection: "row", alignItems: "center", gap: 10 },
 value: { flex: 1, color: colors.textPrimary, fontSize: 16, fontFamily: fontFamilies.regular }, placeholder: { color: "#9CA3AF" },
 hint: { color: colors.textSecondary, fontFamily: fontFamilies.regular, fontSize: 12 },
 overlay: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.ui.overlay },
 drawerWrapper: { maxHeight: "90%" }, drawer: { backgroundColor: colors.white, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
 header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 18 },
 title: { fontSize: 20, fontFamily: fontFamilies.semibold, color: colors.textPrimary }, fields: { gap: 16 }, input: { height: 54 },
});
