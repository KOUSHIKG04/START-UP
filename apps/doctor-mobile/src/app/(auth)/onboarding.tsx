import { Loader, useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import { Image, Linking, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { Check, ChevronDown } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { doctorQualificationSchema, parseDisplayDate } from "@startup/contracts";
import { completeOnboarding, getMyDoctorProfile, listRegisteredCareFacilities, submitMyDoctorClaim, updateMyDoctorProfile, updateMyOwnedClinicLocation, type RegisteredCareFacility } from "@startup/data-access";
import { OnboardingButton, OnboardingShell } from "../../features/auth/components/OnboardingShell";
import { mobileSession, supabase, useMobileSession } from "../../services/supabase";

const genders = ["Male", "Female", "Other", "Prefer not to say"];
const specialties = ["General Physician", "Cardiologist", "Dermatologist", "Paediatrician", "Gynaecologist", "Orthopaedist", "Neurologist", "ENT Specialist", "Dentist", "Psychiatrist", "Other"];
const languages = ["English", "Hindi", "Kannada", "Tamil", "Telugu", "Malayalam", "Other"];
const languageCodes: Record<string, string> = { English: "en", Hindi: "hi", Kannada: "kn", Tamil: "ta", Telugu: "te", Malayalam: "ml" };
const city = require("../../../assets/images/onboarding/city.png");

function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const localNumber = digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^\d{10}$/.test(localNumber) ? `+91${localNumber}` : null;
}

export default function DoctorOnboarding() {
  const { session } = useMobileSession();
  const [name, setName] = useState(""); const [age, setAge] = useState(""); const [gender, setGender] = useState("Male"); const [specialty, setSpecialty] = useState("General Physician");
  const [authority, setAuthority] = useState(""); const [registration, setRegistration] = useState(""); const [started, setStarted] = useState(""); const [selectedLanguages, setSelectedLanguages] = useState<string[]>(["English"]); const [otherLanguageCode, setOtherLanguageCode] = useState(""); const [about, setAbout] = useState("");
  const [qualification, setQualification] = useState("");
  const [clinic, setClinic] = useState(""); const [email, setEmail] = useState(""); const [phone, setPhone] = useState(""); const [license, setLicense] = useState<DocumentPicker.DocumentPickerAsset | null>(null); const [degree, setDegree] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [solo, setSolo] = useState(false); const [address, setAddress] = useState(""); const [locality, setLocality] = useState(""); const [practiceCity, setPracticeCity] = useState(""); const [practiceState, setPracticeState] = useState(""); const [pincode, setPincode] = useState("");
  const [facilities, setFacilities] = useState<RegisteredCareFacility[]>([]); const [facilityId, setFacilityId] = useState(""); const [facilityOpen, setFacilityOpen] = useState(false); const [facilityLoadError, setFacilityLoadError] = useState("");
  const [clinicLocation, setClinicLocation] = useState<{ latitude: number; longitude: number; accuracy: number | null } | null>(null);
  const [locating, setLocating] = useState(false); const [locationError, setLocationError] = useState("");
  const [genderOpen, setGenderOpen] = useState(false); const [specialtyOpen, setSpecialtyOpen] = useState(false); const [languageOpen, setLanguageOpen] = useState(false);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useToastFeedback({ error });

  useEffect(() => {
    let active = true;
    if (supabase) void listRegisteredCareFacilities(supabase).then(items => { if (active) setFacilities(items); }).catch(() => { if (active) setFacilityLoadError("Could not load registered hospitals. Try again later."); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        if (!current.granted) {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (active && !permission.granted) setLocationError("Allow location access before capturing your clinic location.");
        }
      } catch {
        if (active) setLocationError("Location permission is unavailable. Check your device settings.");
      }
    })();
    return () => { active = false; };
  }, []);

  async function captureClinicLocation() {
    setLocating(true); setLocationError("");
    try {
      const permission = await Location.getForegroundPermissionsAsync();
      if (!permission.granted) {
        setLocationError("Allow Doctor to use location in device settings, then try again.");
        return;
      }
      if (!(await Location.hasServicesEnabledAsync())) {
        setLocationError("Turn on device location, then try again at your clinic.");
        return;
      }
      const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const { latitude, longitude, accuracy } = position.coords;
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error("Invalid device coordinates.");
      setClinicLocation({ latitude, longitude, accuracy });
      setError("");
    } catch {
      setLocationError("Could not get your current location. Try again while at your clinic.");
    } finally { setLocating(false); }
  }

  async function pickDocument(kind: "license" | "degree") {
    try { const result = await DocumentPicker.getDocumentAsync({ type: ["application/pdf", "image/jpeg", "image/png"], copyToCacheDirectory: true }); if (!result.canceled) { const file = result.assets[0]; if ((file.size ?? 0) > 10 * 1024 * 1024) setError(`Choose a ${kind} file smaller than 10 MB.`); else { if (kind === "license") setLicense(file); else setDegree(file); setError(""); } } }
    catch { setError(`Could not select the ${kind} file.`); }
  }
  async function uploadDocument(userId: string, document: DocumentPicker.DocumentPickerAsset) {
    if (!supabase) throw new Error("Sign in to upload documents.");
    const extension = document.mimeType === "application/pdf" ? "pdf" : document.mimeType === "image/png" ? "png" : "jpg";
    const path = `${userId}/${Crypto.randomUUID()}.${extension}`;
    const bytes = await new File(document.uri).arrayBuffer();
    const upload = await supabase.storage.from("doctor-licenses").upload(path, bytes, { contentType: document.mimeType ?? "application/pdf", upsert: false });
    if (upload.error) throw upload.error;
    return path;
  }
  async function submit() {
    if (!supabase || !session) { setError("Sign in to submit your profile."); return; }
    if (name.trim().length < 2) { setError("Enter your full name."); return; }
    if (!/^\d{2,3}$/.test(age) || Number(age) < 18 || Number(age) > 100) { setError("Enter a valid age between 18 and 100."); return; }
    if (authority.trim().length < 2 || registration.trim().length < 2) { setError("Enter your registration authority and license number."); return; }
    if (!doctorQualificationSchema.safeParse(qualification).success) { setError("Enter your qualifications, such as MBBS, MD (2–160 characters)."); return; }
    const startedIso = parseDisplayDate(started);
    if (!startedIso) { setError("Enter the practice start date as DD-MM-YYYY."); return; }
    if (!about.trim() || about.trim().length > 2000) { setError("Enter an About description of up to 2000 characters."); return; }
    if (!selectedLanguages.length) { setError("Select at least one language."); return; }
    const customLanguageCode = otherLanguageCode.trim().toLowerCase();
    if (selectedLanguages.includes("Other") && !/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(customLanguageCode)) { setError("Enter a valid language code for Other, such as fr."); return; }
    if (solo && clinic.trim().length < 2) { setError("Enter your clinic name."); return; }
    const selectedFacility = facilities.find(item => item.id === facilityId);
    if (!solo && !selectedFacility) { setError("Select a registered hospital or clinic."); return; }
    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) { setError("Enter a 10-digit phone number, with or without +91."); return; }
    if (!license) { setError("Upload your license document to continue."); return; }
    if (!degree) { setError("Upload your degree document to continue."); return; }
    if (solo && (address.trim().length < 5 || locality.trim().length < 2 || practiceCity.trim().length < 2 || practiceState.trim().length < 2 || !/^\d{6}$/.test(pincode.trim()))) { setError("Enter the clinic address, locality, city, state and pincode."); return; }
    if (solo && !clinicLocation) { setError("At your clinic, tap Use current clinic location before saving."); return; }
    setBusy(true); setError("");
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw userError ?? new Error("Session expired.");
      const licensePath = await uploadDocument(userData.user.id, license);
      const degreePath = await uploadDocument(userData.user.id, degree);
      const details = { full_name: name.trim(), registration_authority: authority.trim(), registration_number: registration.trim(), practice_started_on: startedIso };
      const fullPracticeAddress = [address, locality, practiceCity, practiceState, pincode].map(part => part.trim()).join(", ");
      await completeOnboarding(supabase, solo && clinicLocation ? { kind: "solo_doctor", details: { ...details, clinic_name: clinic.trim(), address: fullPracticeAddress, latitude: clinicLocation.latitude, longitude: clinicLocation.longitude } } : { kind: "doctor", details });
      const doctorProfile = await getMyDoctorProfile(supabase);
      if (solo) {
        const matchingClinics = doctorProfile?.facilities.filter(item => item.facility_kind === "clinic" && item.facility_name === clinic.trim()) ?? [];
        if (matchingClinics.length !== 1) throw new Error("Could not identify your clinic. Please retry profile setup.");
        if (!clinicLocation) throw new Error("Clinic location is required.");
        await updateMyOwnedClinicLocation(supabase, { facilityId: matchingClinics[0].facility_id, name: clinic.trim(), address: fullPracticeAddress, locality: locality.trim(), city: practiceCity.trim(), state: practiceState.trim(), pincode: pincode.trim(), latitude: clinicLocation.latitude, longitude: clinicLocation.longitude });
      }
      const selectedLanguageCodes = selectedLanguages.map(item => item === "Other" ? customLanguageCode : languageCodes[item]).filter((code): code is string => Boolean(code));
      if (!doctorProfile) throw new Error("Could not load your new doctor profile. Please retry.");
      await updateMyDoctorProfile(supabase, { fullName: name.trim(), bio: about.trim(), languages: Array.from(new Set([...doctorProfile.languages, ...selectedLanguageCodes])) });
      await submitMyDoctorClaim(supabase, { ageYears: Number(age), gender, specialty, qualification: qualification.trim(), language: selectedLanguages.map(item => item === "Other" ? `Other (${customLanguageCode})` : item).join(", "), facilityName: solo ? clinic.trim() : selectedFacility!.name, facilityId: solo ? undefined : selectedFacility?.id, email: email.trim() || undefined, phone: normalizedPhone, licensePath, degreePath });
      await mobileSession.refresh();
      router.replace("/review-status");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not submit your credentials."); }
    finally { setBusy(false); }
  }
  function field(label: string, value: string, setValue: (value: string) => void, placeholder: string, keyboardType?: "number-pad" | "phone-pad" | "email-address") { return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} placeholder={placeholder} value={value} onChangeText={setValue} keyboardType={keyboardType} autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"} style={styles.input} /></View>; }
  function select(label: string, value: string, options: string[], open: boolean, setOpen: (open: boolean) => void, setValue: (value: string) => void) { return <View style={styles.field}><Text style={styles.label}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={`${label}: ${value}`} onPress={() => setOpen(!open)} style={styles.select}><Text style={styles.selectText}>{value}</Text><ChevronDown size={17} color={colors.patient.primaryDark} /></Pressable>{open ? <View style={styles.options}>{options.map(item => <Pressable key={item} style={styles.option} onPress={() => { setValue(item); setOpen(false); }}><Text>{item}</Text></Pressable>)}</View> : null}</View>; }
  function toggleLanguage(language: string) {
    setSelectedLanguages(current => current.includes(language) ? current.filter(item => item !== language) : [...current, language]);
  }
  return <OnboardingShell onBack={() => router.back()} bottomArt={false} scroll><View style={styles.body}>
    <View style={styles.head}><View style={styles.avatar}><View style={styles.avatarHead} /><View style={styles.avatarBody} /></View><View style={{ flex: 1 }}><Text style={styles.title}>Your Profile</Text></View></View>
    {field("Full Name", name, setName, "Enter your full name")}
    <View style={styles.row}><View style={{ flex: 0.8 }}>{field("Age", age, setAge, "Age", "number-pad")}</View><View style={{ flex: 1.2 }}>{select("Gender", gender, genders, genderOpen, setGenderOpen, setGender)}</View></View>
    {select("Specialization", specialty, specialties, specialtyOpen, setSpecialtyOpen, setSpecialty)}
    <View style={styles.row}><View style={{ flex: 1 }}>{field("Registration authority", authority, setAuthority, "e.g. State Medical Council")}</View><View style={{ flex: 1 }}>{field("License No.", registration, setRegistration, "Registration no.")}</View></View>
    {field("Practice start date", started, setStarted, "DD-MM-YYYY")}
    <View style={styles.field}><Text style={styles.label}>About</Text><TextInput accessibilityLabel="About" placeholder="Describe your experience and approach to patient care" value={about} onChangeText={setAbout} multiline maxLength={2000} textAlignVertical="top" style={[styles.input, styles.aboutInput]} /></View>
    <View style={styles.field}><Text style={styles.label}>Languages</Text><Pressable accessibilityRole="button" accessibilityLabel={`Languages: ${selectedLanguages.join(", ") || "none selected"}`} accessibilityState={{ expanded: languageOpen }} onPress={() => setLanguageOpen(!languageOpen)} style={styles.select}><Text style={styles.selectText}>{selectedLanguages.join(", ") || "Select languages"}</Text><ChevronDown size={17} color={colors.patient.primaryDark} /></Pressable>{languageOpen ? <View style={styles.options}>{languages.map(item => { const checked = selectedLanguages.includes(item); return <Pressable key={item} accessibilityRole="checkbox" accessibilityState={{ checked }} style={[styles.option, styles.languageOption]} onPress={() => toggleLanguage(item)}><Text style={styles.selectText}>{item}</Text>{checked ? <Check size={17} color={colors.patient.primaryDark} /> : null}</Pressable>; })}<Pressable accessibilityRole="button" style={styles.option} onPress={() => setLanguageOpen(false)}><Text style={styles.doneText}>Done</Text></Pressable></View> : null}{selectedLanguages.includes("Other") ? <TextInput accessibilityLabel="Other language code" placeholder="Other language code (e.g. fr)" autoCapitalize="none" maxLength={20} value={otherLanguageCode} onChangeText={setOtherLanguageCode} style={styles.input} /> : null}</View>
    <View style={styles.field}><Text style={styles.label}>Upload Your License here</Text><Pressable accessibilityRole="button" onPress={() => void pickDocument("license")} style={styles.select}><Text style={styles.selectText} numberOfLines={1}>{license?.name ?? "Choose PDF or image (max 10 MB)"}</Text></Pressable></View>
    {field("Qualifications", qualification, setQualification, "e.g. MBBS, MD")}
    <View style={styles.field}><Text style={styles.label}>Upload Your Degree here</Text><Pressable accessibilityRole="button" onPress={() => void pickDocument("degree")} style={styles.select}><Text style={styles.selectText} numberOfLines={1}>{degree?.name ?? "Choose PDF or image (max 10 MB)"}</Text></Pressable></View>
    {solo ? field("Clinic Name", clinic, setClinic, "Your clinic name") : <View style={styles.field}><Text style={styles.label}>Hospital/Clinic Name</Text><Pressable accessibilityRole="button" accessibilityLabel="Select registered hospital or clinic" onPress={() => setFacilityOpen(!facilityOpen)} style={styles.select}><Text style={styles.selectText}>{facilities.find(item => item.id === facilityId)?.name ?? "Select registered hospital or clinic"}</Text><ChevronDown size={17} color={colors.patient.primaryDark} /></Pressable>{facilityOpen ? <View style={styles.options}>{facilities.map(item => <Pressable key={item.id} style={styles.option} onPress={() => { setFacilityId(item.id); setFacilityOpen(false); }}><Text>{item.name} · {item.address}</Text></Pressable>)}</View> : null}{!facilities.length ? <Text style={styles.locationHint}>{facilityLoadError || "No company-verified hospital or clinic is registered yet."}</Text> : null}</View>}
    {field("Email (optional)", email, setEmail, "your@email.com", "email-address")}
    {field("Phone Number", phone, setPhone, "+91 98765 43210", "phone-pad")}
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: solo }} onPress={() => { setSolo(!solo); setFacilityOpen(false); }} style={styles.solo}><View style={[styles.checkbox, solo && styles.checked]} /><Text style={styles.soloText}>I run my own clinic</Text></Pressable>
    {solo ? <>{field("Clinic address", address, setAddress, "Street address")}{field("Area / locality", locality, setLocality, "Area or locality")}<View style={styles.row}><View style={{ flex: 1 }}>{field("City", practiceCity, setPracticeCity, "City")}</View><View style={{ flex: 1 }}>{field("State", practiceState, setPracticeState, "State")}</View></View>{field("Pincode", pincode, setPincode, "6-digit pincode", "number-pad")}<View style={styles.field}><Text style={styles.label}>Clinic location</Text><Text style={styles.locationHint}>Be at your clinic before capturing its location.</Text><Pressable accessibilityRole="button" disabled={locating} onPress={() => void captureClinicLocation()} style={styles.select}>{locating ? <Loader theme="doctor" /> : <Text style={styles.selectText}>{clinicLocation ? "Update clinic location while here" : "I'm at my clinic — use current location"}</Text>}</Pressable>{clinicLocation ? <Text style={styles.locationHint}>Location captured{clinicLocation.accuracy === null ? "" : ` (±${Math.round(clinicLocation.accuracy)} m)`}.</Text> : null}{locationError ? <Text accessibilityRole="alert" style={styles.error}>{locationError} <Text onPress={() => void Linking.openSettings()}>Open settings</Text></Text> : null}</View></> : null}
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
  title: { fontFamily: fontFamilies.regular, fontSize: 22, color: colors.black },
  field: { gap: 6 }, label: { marginLeft: 5, fontFamily: fontFamilies.regular, fontSize: 14, color: colors.doctor.header },
  input: { height: 48, borderWidth: 1, borderColor: "#D1D1D1", borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 13, fontFamily: fontFamilies.regular, fontSize: 15 },
  aboutInput: { height: 96, paddingTop: 12, paddingBottom: 12 },
  row: { flexDirection: "row", gap: 12 }, select: { minHeight: 48, borderWidth: 1, borderColor: "#D1D1D1", borderRadius: 10, backgroundColor: colors.white, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { fontFamily: fontFamilies.regular, fontSize: 15, color: colors.doctor.header, flexShrink: 1 }, options: { borderWidth: 1, borderColor: "#D1D1D1", borderRadius: 10, backgroundColor: colors.white }, option: { paddingHorizontal: 14, paddingVertical: 11 }, languageOption: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" }, doneText: { fontFamily: fontFamilies.medium, fontSize: 15, color: colors.patient.primaryDark, textAlign: "right" },
  solo: { flexDirection: "row", alignItems: "center", gap: 9 }, checkbox: { width: 18, height: 18, backgroundColor: "#D5D7D9" }, checked: { backgroundColor: colors.patient.primaryDark }, soloText: { fontFamily: fontFamilies.regular, fontSize: 14 },
  error: { color: colors.danger, fontFamily: fontFamilies.regular, fontSize: 13 }, privacy: { fontFamily: fontFamilies.regular, fontSize: 13, color: "#777", textAlign: "center" },
  locationHint: { color: "#777", fontFamily: fontFamilies.regular, fontSize: 13 },
  bottomArt: { width: "115%", height: 175, alignSelf: "center" },
});
