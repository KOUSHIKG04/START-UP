import { useState } from "react";
import { Image, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as Crypto from "expo-crypto";
import { ChevronDown } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { completeOnboarding, getMyDoctorProfile, submitMyDoctorClaim, updateMyDoctorProfile, updateMyOwnedClinicLocation } from "@startup/data-access";
import { OnboardingButton, OnboardingShell } from "../../features/auth/components/OnboardingShell";
import { mobileSession, supabase, useMobileSession } from "../../services/supabase";

const genders = ["Male", "Female", "Other", "Prefer not to say"];
const specialties = ["General Physician", "Cardiologist", "Dermatologist", "Paediatrician", "Gynaecologist", "Orthopaedist", "Neurologist", "Other"];
const languages = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Other"];
const languageCodes: Record<string, string> = { English: "en", Hindi: "hi", Kannada: "kn", Tamil: "ta", Telugu: "te", Malayalam: "ml" };
const city = require("../../../assets/images/onboarding/city.png");

export default function DoctorOnboarding() {
  const { session } = useMobileSession();
  const [name, setName] = useState(""); const [age, setAge] = useState(""); const [gender, setGender] = useState("Male"); const [specialty, setSpecialty] = useState("General Physician");
  const [authority, setAuthority] = useState(""); const [registration, setRegistration] = useState(""); const [started, setStarted] = useState(""); const [language, setLanguage] = useState("English");
  const [clinic, setClinic] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [license, setLicense] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [solo, setSolo] = useState(false); const [address, setAddress] = useState(""); const [locality, setLocality] = useState(""); const [practiceCity, setPracticeCity] = useState(""); const [practiceState, setPracticeState] = useState(""); const [pincode, setPincode] = useState(""); const [latitude, setLatitude] = useState(""); const [longitude, setLongitude] = useState("");
  const [genderOpen, setGenderOpen] = useState(false); const [specialtyOpen, setSpecialtyOpen] = useState(false); const [languageOpen, setLanguageOpen] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");

  async function pickLicense() {
    try { const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true }); if (!result.canceled) { const file = result.assets[0]; if ((file.size ?? 0) > 10 * 1024 * 1024) setError("Choose a license file smaller than 10 MB."); else { setLicense(file); setError(""); } } }
    catch { setError("Could not select the license file."); }
  }
  async function submit() {
    if (!supabase || !session) { setError("Sign in to submit your profile."); return; }
    if (name.trim().length < 2 || !/^\d{2,3}$/.test(age) || Number(age) < 18 || Number(age) > 100 || authority.trim().length < 2 || registration.trim().length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(started) || clinic.trim().length < 2 || phone.replace(/\D/g, "").length !== 10 || !license) { setError("Complete your credentials, clinic, phone and license document."); return; }
    if (solo && (address.trim().length < 5 || locality.trim().length < 2 || practiceCity.trim().length < 2 || practiceState.trim().length < 2 || !/^\d{6}$/.test(pincode.trim()) || !Number.isFinite(Number(latitude)) || !Number.isFinite(Number(longitude)) || !latitude || !longitude)) { setError("Enter the clinic address, locality, city, state, pincode and coordinates."); return; }
    setBusy(true); setError("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Session expired.");
      const extension = license.mimeType === "application/pdf" ? "pdf" : license.mimeType === "image/png" ? "png" : "jpg";
      const path = `${userData.user.id}/${Crypto.randomUUID()}.${extension}`;
      const bytes = await new File(license.uri).arrayBuffer();
      const upload = await supabase.storage.from("doctor-licenses").upload(path, bytes, { contentType: license.mimeType ?? "application/pdf", upsert: false });
      if (upload.error) throw upload.error;
      const details = { full_name: name.trim(), registration_authority: authority.trim(), registration_number: registration.trim(), practice_started_on: started };
      const fullPracticeAddress = [address, locality, practiceCity, practiceState, pincode].map(part => part.trim()).join(", ");
      await completeOnboarding(supabase, solo ? { kind: "solo_doctor", details: { ...details, clinic_name: clinic.trim(), address: fullPracticeAddress, latitude: Number(latitude), longitude: Number(longitude) } } : { kind: "doctor", details });
      const doctorProfile = await getMyDoctorProfile(supabase);
      if (solo) {
        const matchingClinics = doctorProfile?.facilities.filter(item => item.facility_kind === "clinic" && item.facility_name === clinic.trim()) ?? [];
        if (matchingClinics.length !== 1) throw new Error("Could not identify your clinic. Please retry profile setup.");
        await updateMyOwnedClinicLocation(supabase, { facilityId: matchingClinics[0].facility_id, name: clinic.trim(), address: fullPracticeAddress, locality: locality.trim(), city: practiceCity.trim(), state: practiceState.trim(), pincode: pincode.trim(), latitude: Number(latitude), longitude: Number(longitude) });
      }
      const selectedLanguageCode = languageCodes[language];
      if (selectedLanguageCode && doctorProfile) {
        await updateMyDoctorProfile(supabase, { fullName: name.trim(), bio: doctorProfile.bio, languages: Array.from(new Set([...doctorProfile.languages, selectedLanguageCode])) });
      }
      await submitMyDoctorClaim(supabase, { ageYears: Number(age), gender, specialty, language, facilityName: clinic.trim(), email: email.trim() || undefined, phone: `+91${phone.replace(/\D/g, "")}`, licensePath: path });
      await mobileSession.refresh();
      router.replace("/review-status");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit your credentials."); }
    finally { setBusy(false); }
  }
  function field(label: string, value: string, setValue: (value: string) => void, placeholder: string, keyboardType?: "number-pad" | "phone-pad" | "email-address") { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholder={placeholder} value={value} onChangeText={setValue} keyboardType={keyboardType} autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"} style={styles.input} /></View>; }
  function select(label: string, value: string, options: string[], open: boolean, setOpen: (open: boolean) => void, setValue: (value: string) => void) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={() => setOpen(!open)} style={styles.select}><Text style={styles.selectText}>{value}</Text><ChevronDown size={17} color={colors.patient.primaryDark} /></Pressable>{open ? <View style={styles.options}>{options.map(item => <Pressable key={item} style={styles.option} onPress={() => { setValue(item); setOpen(false); }}><Text>{item}</Text></Pressable>)}</View> : null}</View>; }
  return <OnboardingShell onBack={() => router.back()} bottomArt={false} scroll><View style={styles.body}>
    <View style={styles.head}><View style={styles.avatar}><View style={styles.avatarHead} /><View style={styles.avatarBody} /></View><View style={{ flex: 1 }}><Text style={styles.title}>Your Profile</Text><Text style={styles.subtitle}>Set up your clinical profile to{"\n"}care for patients</Text></View></View>
    {field("Full Name", name, setName, "Enter your full name")}
    <View style={styles.row}><View style={{ flex: 0.8 }}>{field("Age", age, setAge, "Age", "number-pad")}</View><View style={{ flex: 1.2 }}>{select("Gender", gender, genders, genderOpen, setGenderOpen, setGender)}</View></View>
    {select("Specialization", specialty, specialties, specialtyOpen, setSpecialtyOpen, setSpecialty)}
    <View style={styles.row}><View style={{ flex: 1 }}>{field("Registration authority", authority, setAuthority, "e.g. State Medical Council")}</View><View style={{ flex: 1 }}>{field("License No.", registration, setRegistration, "Registration no.")}</View></View>
    {field("Practice start date", started, setStarted, "YYYY-MM-DD")}
    {select("Language", language, languages, languageOpen, setLanguageOpen, setLanguage)}
    <View style={styles.field}><Text style={styles.label}>Upload Your License here</Text><Pressable accessibilityRole="button" onPress={() => void pickLicense()} style={styles.select}><Text style={styles.selectText} numberOfLines={1}>{license?.name ?? "Choose PDF or image (max 10 MB)"}</Text></Pressable></View>
    {field("Hospital/Clinic Name", clinic, setClinic, "Hospital or clinic name")}
    {field("Email (optional)", email, setEmail, "your@email.com", "email-address")}
    {field("Phone Number", phone, setPhone, "+91 98765 43210", "phone-pad")}
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: solo }} onPress={() => setSolo(!solo)} style={styles.solo}><View style={[styles.checkbox, solo && styles.checked]} /><Text style={styles.soloText}>I run my own clinic</Text></Pressable>
    {solo ? <>{field("Clinic address", address, setAddress, "Street address")}{field("Area / locality", locality, setLocality, "Area or locality")}<View style={styles.row}><View style={{ flex: 1 }}>{field("City", practiceCity, setPracticeCity, "City")}</View><View style={{ flex: 1 }}>{field("State", practiceState, setPracticeState, "State")}</View></View>{field("Pincode", pincode, setPincode, "6-digit pincode", "number-pad")}<View style={styles.row}><View style={{ flex: 1 }}>{field("Latitude", latitude, setLatitude, "12.9716")}</View><View style={{ flex: 1 }}>{field("Longitude", longitude, setLongitude, "77.5946")}</View></View></> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    <OnboardingButton label={busy ? "Submitting…" : "Save Profile"} disabled={busy} onPress={() => void submit()} />
    <Text style={styles.privacy}>♢  Your information is secure and private</Text>
    <Image source={city} resizeMode="stretch" style={styles.bottomArt} />
  </View></OnboardingShell>;
}
const styles = StyleSheet.create({
  body: { alignSelf: "center", width: "100%", maxWidth: 360, gap: 17, paddingTop: 8, paddingBottom: 40 }, head: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 8 },
  avatar: { width: 76, height: 76, borderRadius: 38, backgroundColor: colors.patient.primaryDark, alignItems: "center", overflow: "hidden" },
  avatarHead: { width: 21, height: 21, borderRadius: 11, backgroundColor: colors.white, marginTop: 12 },
  avatarBody: { width: 55, height: 30, borderTopLeftRadius: 28, borderTopRightRadius: 28, backgroundColor: colors.white, marginTop: 6 },
  title: { fontFamily: fontFamilies.regular, fontSize: 22, color: colors.black }, subtitle: { fontFamily: fontFamilies.regular, fontSize: 16, lineHeight: 21, color: "#777" },
  field: { gap: 6 }, label: { marginLeft: 5, fontFamily: fontFamilies.regular, fontSize: 14, color: colors.doctor.header },
  input: { height: 48, borderWidth: 1, borderColor: "#D1D1D1", borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 13, fontFamily: fontFamilies.regular, fontSize: 15 },
  row: { flexDirection: "row", gap: 12 }, select: { minHeight: 48, borderWidth: 1, borderColor: "#D1D1D1", borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { fontFamily: fontFamilies.regular, fontSize: 15, color: colors.doctor.header, flexShrink: 1 }, options: { borderWidth: 1, borderColor: "#D1D1D1", borderRadius: 10, backgroundColor: colors.white }, option: { paddingHorizontal: 14, paddingVertical: 11 },
  solo: { flexDirection: "row", alignItems: "center", gap: 9 }, checkbox: { width: 18, height: 18, backgroundColor: "#D5D7D9" }, checked: { backgroundColor: colors.patient.primaryDark }, soloText: { fontFamily: fontFamilies.regular, fontSize: 14 },
  error: { color: colors.danger, fontFamily: fontFamilies.regular, fontSize: 13 }, privacy: { fontFamily: fontFamilies.regular, fontSize: 13, color: "#777", textAlign: "center" },
  bottomArt: { width: "115%", height: 175, alignSelf: "center" },
});
