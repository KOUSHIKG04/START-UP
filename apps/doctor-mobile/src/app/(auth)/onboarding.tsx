import { Button } from "@startup/mobile-ui";
import { ModalSurface } from "@startup/mobile-ui";
import { Input } from "@startup/mobile-ui";
import {
  Dropdown,
  Checkbox,
  ProfilePhotoButton,
  useToast,
  useToastFeedback,
} from "@startup/mobile-ui";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  Linking,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { PersonalAddressField, emptyPersonalAddress } from "../../features/profile/components/PersonalAddressField";
import { doctorPersonalAddressInputSchema, type DoctorPersonalAddressInput } from "@startup/contracts";
import { useClinicLocationDraft } from "../../features/locations/clinicLocationDraft";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { File } from "expo-file-system";
import * as Crypto from "expo-crypto";
import * as Location from "expo-location";
import { Check, ChevronDown, LockKeyhole, MapPin, X } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import {
  doctorQualificationSchema,
  doctorSpecialtiesSchema,
  ageFromBirthDate,
  parseDisplayDate,
} from "@startup/contracts";
import {
  completeOnboarding,
  getMyDoctorProfile,
  listRegisteredCareFacilities,
  setMyProfilePhoto,
  submitMyDoctorClaim,
  updateMyDoctorProfile,
  updateMyOwnedClinicLocation,
  type RegisteredCareFacility,
} from "@startup/data-access";
import {
  OnboardingButton,
  OnboardingShell,
} from "../../features/auth/components/OnboardingShell";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../services/supabase";

const genders = ["Male", "Female", "Other / Prefer not to say"];
const specialties = [
  "General Physician",
  "Cardiologist",
  "Dermatologist",
  "Paediatrician",
  "Gynaecologist",
  "Orthopaedist",
  "Neurologist",
  "ENT Specialist",
  "Dentist",
  "Psychiatrist",
  "Other",
];
const languages = [
  "English",
  "Hindi",
  "Kannada",
  "Tamil",
  "Telugu",
  "Malayalam",
  "Other",
];
const languageCodes: Record<string, string> = {
  English: "en",
  Hindi: "hi",
  Kannada: "kn",
  Tamil: "ta",
  Telugu: "te",
  Malayalam: "ml",
};

function normalizeIndianPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const localNumber =
    digits.length === 12 && digits.startsWith("91") ? digits.slice(2) : digits;
  return /^\d{10}$/.test(localNumber) ? `+91${localNumber}` : null;
}

export default function DoctorOnboarding() {
  const { showToast } = useToast();
  const { session } = useMobileSession();
  const chosenClinic = useClinicLocationDraft(state => state.chosen);
  const clearChosenClinic = useClinicLocationDraft(state => state.clear);
  const [name, setName] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("Male");
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(["General Physician"]);
  const [otherSpecialty, setOtherSpecialty] = useState("");
  const [authority, setAuthority] = useState("");
  const [registration, setRegistration] = useState("");
  const [started, setStarted] = useState("");
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([
    "English",
  ]);
  const [otherLanguageCode, setOtherLanguageCode] = useState("");
  const [about, setAbout] = useState("");
  const [qualification, setQualification] = useState("");
  const [photo, setPhoto] = useState<{ uri: string; mimeType: string } | null>(
    null
  );
  const [clinic, setClinic] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [personalAddress, setPersonalAddress] = useState<DoctorPersonalAddressInput>(emptyPersonalAddress);
  const [addressOpen, setAddressOpen] = useState(false);
  const [license, setLicense] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [degree, setDegree] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [clinicLicense, setClinicLicense] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [solo, setSolo] = useState(false);
  const [address, setAddress] = useState("");
  const [locality, setLocality] = useState("");
  const [practiceCity, setPracticeCity] = useState("");
  const [practiceState, setPracticeState] = useState("");
  const [pincode, setPincode] = useState("");
  const [facilities, setFacilities] = useState<RegisteredCareFacility[]>([]);
  const [facilityId, setFacilityId] = useState("");
  const [facilityLoadError, setFacilityLoadError] = useState("");
  const [clinicLocation, setClinicLocation] = useState<{
    latitude: number;
    longitude: number;
    accuracy: number | null;
  } | null>(null);

  const [locationError, setLocationError] = useState("");
  const [languageOpen, setLanguageOpen] = useState(false);
  const languageTrigger = useRef<View>(null);
  const specialtyTrigger = useRef<View>(null);
  const [menuKind, setMenuKind] = useState<"languages" | "specialties">("languages");
  const [languageAnchor, setLanguageAnchor] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const { height: windowHeight } = useWindowDimensions();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastFeedback({ error });
  useFocusEffect(useCallback(() => {
    if (!chosenClinic) return;
    setClinicLocation({ latitude: chosenClinic.latitude, longitude: chosenClinic.longitude, accuracy: null });
    setAddress(current => chosenClinic.street || current);
    setLocality(current => chosenClinic.locality || current);
    setPracticeCity(current => chosenClinic.city || current);
    setPracticeState(current => chosenClinic.state || current);
    setPincode(current => chosenClinic.pincode || current);
    setLocationError("");
    clearChosenClinic();
    setAddressOpen(true);
    showToast({ title: "Clinic location selected", type: "success" });
  }, [chosenClinic, clearChosenClinic, showToast]));

  useEffect(() => {
    if (!session?.user) return;
    setEmail(current => current || session.user.email || "");
    setPhone(current => current || session.user.phone || "");
  }, [session?.user.id, session?.user.email, session?.user.phone]);

  useEffect(() => {
    let active = true;
    if (supabase)
      void listRegisteredCareFacilities(supabase)
        .then((items) => {
          if (active) setFacilities(items);
        })
        .catch(() => {
          if (active)
            setFacilityLoadError(
              "Could not load registered hospitals. Try again later."
            );
        });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const current = await Location.getForegroundPermissionsAsync();
        if (!current.granted) {
          const permission = await Location.requestForegroundPermissionsAsync();
          if (active && !permission.granted)
            setLocationError(
              "Allow location access before capturing your clinic location."
            );
        }
      } catch {
        if (active)
          setLocationError(
            "Location permission is unavailable. Check your device settings."
          );
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  async function pickDocument(kind: "license" | "degree" | "clinic operating licence") {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const file = result.assets[0];
        if ((file.size ?? 0) > 10 * 1024 * 1024)
          setError(`Choose a ${kind} file smaller than 10 MB.`);
        else {
          if (kind === "license") setLicense(file);
          else if (kind === "degree") setDegree(file);
          else setClinicLicense(file);
          setError("");
        }
      }
    } catch {
      setError(`Could not select the ${kind} file.`);
    }
  }
  async function pickPhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Allow photo access to choose your profile picture.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      if ((asset.fileSize ?? 0) > 5 * 1024 * 1024) {
        setError("Choose a photo under 5 MB.");
        return;
      }
      if (!["image/jpeg", "image/png"].includes(asset.mimeType ?? "")) {
        setError("Choose a JPG or PNG photo.");
        return;
      }
      setPhoto({ uri: asset.uri, mimeType: asset.mimeType! });
      setError("");
    } catch {
      setError("Could not select your photo. Try again.");
    }
  }
  async function uploadDocument(
    userId: string,
    document: DocumentPicker.DocumentPickerAsset
  ) {
    if (!supabase) throw new Error("Sign in to upload documents.");
    const extension =
      document.mimeType === "application/pdf"
        ? "pdf"
        : document.mimeType === "image/png"
          ? "png"
          : "jpg";
    const path = `${userId}/${Crypto.randomUUID()}.${extension}`;
    const bytes = await new File(document.uri).arrayBuffer();
    const upload = await supabase.storage
      .from("doctor-licenses")
      .upload(path, bytes, {
        contentType: document.mimeType ?? "application/pdf",
        upsert: false,
      });
    if (upload.error) throw upload.error;
    return path;
  }

  async function submit() {
    if (!supabase || !session) {
      setError("Sign in to submit your profile.");
      return;
    }
    if (name.trim().length < 2) {
      setError("Enter your full name.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) {
      setError("Enter a valid email address.");
      return;
    }
    const birthDateIso = parseDisplayDate(dateOfBirth);
    const ageYears = birthDateIso ? ageFromBirthDate(birthDateIso) : null;
    if (ageYears === null || ageYears < 18 || ageYears > 100) {
      setError("Enter your date of birth as DD-MM-YYYY. Age must be between 18 and 100.");
      return;
    }
    if (authority.trim().length < 2 || registration.trim().length < 2) {
      setError("Enter your registration authority and license number.");
      return;
    }
    if (!doctorQualificationSchema.safeParse(qualification).success) {
      setError(
        "Enter your qualifications, such as MBBS, MD (2–160 characters)."
      );
      return;
    }
    const specialtyNames = selectedSpecialties.map(item => item === "Other" ? otherSpecialty.trim() : item);
    if (!doctorSpecialtiesSchema.safeParse(specialtyNames).success) {
      setError("Select at least one specialty. For Other, enter a specialty name (2–120 characters).");
      return;
    }
    const startedIso = parseDisplayDate(started);
    if (!startedIso) {
      setError("Enter the practice start date as DD-MM-YYYY.");
      return;
    }
    if (!about.trim() || about.trim().length > 2000) {
      setError("Enter an About description of up to 2000 characters.");
      return;
    }
    if (!selectedLanguages.length) {
      setError("Select at least one language.");
      return;
    }
    const customLanguageCode = otherLanguageCode.trim().toLowerCase();
    if (
      selectedLanguages.includes("Other") &&
      !/^[a-z]{2,3}(-[a-z0-9]{2,8})*$/.test(customLanguageCode)
    ) {
      setError("Enter a valid language code for Other, such as fr.");
      return;
    }
    if (solo && clinic.trim().length < 2) {
      setError("Enter your clinic name.");
      return;
    }
    const selectedFacility = facilities.find((item) => item.id === facilityId);
    if (!solo && !selectedFacility) {
      setError("Select a registered hospital or clinic.");
      return;
    }
    const normalizedPhone = normalizeIndianPhone(phone);
    if (!normalizedPhone) {
      setError("Enter a 10-digit phone number, with or without +91.");
      return;
    }
    if (!license) {
      setError("Upload your license document to continue.");
      return;
    }
    if (!degree) {
      setError("Upload your degree document to continue.");
      return;
    }
    if (
      solo &&
      (address.trim().length < 5 ||
        locality.trim().length < 2 ||
        practiceCity.trim().length < 2 ||
        practiceState.trim().length < 2 ||
        !/^\d{6}$/.test(pincode.trim()))
    ) {
      setError("Enter the clinic address, locality, city, state and pincode.");
      return;
    }
    if (solo && !clinicLicense) {
      setError("Upload your clinic operating licence to continue.");
      return;
    }
    if (solo && !clinicLocation) {
      setError(
        "Choose your clinic location on the map before saving."
      );
      return;
    }
    if (!doctorPersonalAddressInputSchema.safeParse(personalAddress).success) {
      setError("Complete your personal address before saving your profile.");
      return;
    }
    setBusy(true);
    setError("");

    try {
      const { data: userData, error: userError } =
        await supabase.auth.getUser();
      if (userError || !userData.user)
        throw userError ?? new Error("Session expired.");
      const licensePath = await uploadDocument(userData.user.id, license);
      const degreePath = await uploadDocument(userData.user.id, degree);
      const clinicLicensePath = solo && clinicLicense ? await uploadDocument(userData.user.id, clinicLicense) : undefined;
      const details = {
        full_name: name.trim(),
        registration_authority: authority.trim(),
        registration_number: registration.trim(),
        practice_started_on: startedIso,
      };
      const fullPracticeAddress = [
        address,
        locality,
        practiceCity,
        practiceState,
        pincode,
      ]
        .map((part) => part.trim())
        .join(", ");
      await completeOnboarding(
        supabase,
        solo && clinicLocation
          ? {
              kind: "solo_doctor",
              details: {
                ...details,
                clinic_name: clinic.trim(),
                address: fullPracticeAddress,
                latitude: clinicLocation.latitude,
                longitude: clinicLocation.longitude,
              },
            }
          : { kind: "doctor", details }
      );
      const doctorProfile = await getMyDoctorProfile(supabase);
      if (solo) {
        const matchingClinics =
          doctorProfile?.facilities.filter(
            (item) =>
              item.facility_kind === "clinic" &&
              item.facility_name === clinic.trim()
          ) ?? [];
        if (matchingClinics.length !== 1)
          throw new Error(
            "Could not identify your clinic. Please retry profile setup."
          );
        if (!clinicLocation) throw new Error("Clinic location is required.");
        await updateMyOwnedClinicLocation(supabase, {
          facilityId: matchingClinics[0].facility_id,
          name: clinic.trim(),
          address: fullPracticeAddress,
          locality: locality.trim(),
          city: practiceCity.trim(),
          state: practiceState.trim(),
          pincode: pincode.trim(),
          latitude: clinicLocation.latitude,
          longitude: clinicLocation.longitude,
        });
      }

      const selectedLanguageCodes = selectedLanguages
        .map((item) =>
          item === "Other" ? customLanguageCode : languageCodes[item]
        )
        .filter((code): code is string => Boolean(code));
      if (!doctorProfile)
        throw new Error(
          "Could not load your new doctor profile. Please retry."
        );
      if (photo) {
        const path = `${userData.user.id}/${Crypto.randomUUID()}.${photo.mimeType === "image/png" ? "png" : "jpg"}`;
        const upload = await supabase.storage
          .from("provider-profile-photos")
          .upload(path, await new File(photo.uri).arrayBuffer(), {
            contentType: photo.mimeType,
            upsert: false,
          });
        if (upload.error) throw upload.error;
        await setMyProfilePhoto(supabase, "doctor", path);
      }
      await updateMyDoctorProfile(supabase, {
        personalAddress,
        fullName: name.trim(),
        bio: about.trim(),
        languages: Array.from(
          new Set([...doctorProfile.languages, ...selectedLanguageCodes])
        ),
      });
      await submitMyDoctorClaim(supabase, {
        ageYears,
        dateOfBirth: birthDateIso!,
        gender: gender === "Other / Prefer not to say" ? "Other" : gender,
        specialty: specialtyNames[0],
        specialties: specialtyNames,
        qualification: qualification.trim(),
        language: selectedLanguages
          .map((item) =>
            item === "Other" ? `Other (${customLanguageCode})` : item
          )
          .join(", "),
        facilityName: solo ? clinic.trim() : selectedFacility!.name,
        facilityId: solo ? undefined : selectedFacility?.id,
        email: email.trim(),
        phone: normalizedPhone,
        licensePath,
        degreePath,
        clinicLicensePath,
      });
      await mobileSession.refresh();
      router.replace("/review-status");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not submit your credentials."
      );
    } finally {
      setBusy(false);
    }
  }

  function field(
    label: string,
    value: string,
    setValue: (value: string) => void,
    placeholder: string,
    keyboardType?: "number-pad" | "phone-pad" | "email-address"
  ) {
    return (
      <Input
        variant="unstyled"
        label={label}
        labelStyle={[styles.label, styles.inputLabel]}
        containerStyle={styles.field}
        accessibilityLabel={label}
        placeholder={placeholder}
        placeholderTextColor="#9CA3AF"
        value={value}
        onChangeText={setValue}
        keyboardType={keyboardType}
        autoCapitalize={keyboardType === "email-address" ? "none" : "sentences"}
        style={styles.input}
      />
    );
  }

  function select(
    label: string,
    value: string,
    options: string[],
    setValue: (value: string) => void
  ) {
    return (
      <View style={styles.field}>
        <Text style={styles.label}>{label}</Text>
        <Dropdown
          accessibilityLabel={`${label}: ${value}`}
          options={options.map((item) => ({ label: item, value: item }))}
          value={value}
          onValueChange={setValue}
          triggerStyle={styles.select}
          valueStyle={styles.selectText}
          chevronColor={colors.patient.primaryDark}
          backdropColor="#00000066"
          selectedOptionBackgroundColor="#F3F4F6"
        />
      </View>
    );
  }

  function openLanguageMenu() {
    setMenuKind("languages");
    languageTrigger.current?.measureInWindow((x, y, width, height) => {
      setLanguageAnchor({ x, y, width, height });
      setLanguageOpen(true);
    });
  }
  function openSpecialtyMenu() {
    specialtyTrigger.current?.measureInWindow((x, y, width, height) => {
      setMenuKind("specialties");
      setLanguageAnchor({ x, y, width, height });
      setLanguageOpen(true);
    });
  }
  function toggleLanguage(language: string) {
    setSelectedLanguages((current) =>
      current.includes(language)
        ? current.filter((item) => item !== language)
        : [...current, language]
    );
  }

  return (
    <OnboardingShell onBack={() => router.back()} scroll keepArtFixed bottomArt={false}>
      <View style={styles.body}>
        <View style={styles.head}>
          <ProfilePhotoButton
            theme="doctor"
            source={photo ? { uri: photo.uri } : undefined}
            onPress={() => void pickPhoto()}
            accessibilityLabel="Choose doctor profile photo"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Your Profile</Text>
            <Text style={styles.photoHint}>
              Tap the plus button on your profile icon to add a photo.
            </Text>
          </View>
        </View>
        {field("Full Name", name, setName, "Enter your full name")}
        {field(
          "Email",
          email,
          setEmail,
          "your@email.com",
          "email-address"
        )}
        {field("Phone Number", phone, setPhone, "+91 98765 43210", "phone-pad")}
        <PersonalAddressField value={personalAddress} onChange={setPersonalAddress} />
        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            {field("Date of Birth", dateOfBirth, setDateOfBirth, "DD-MM-YYYY")}
          </View>
          <View style={{ flex: 1 }}>
            {select("Gender", gender, genders, setGender)}
          </View>
        </View>
        {field(
          "Qualifications",
          qualification,
          setQualification,
          "e.g. MBBS, MD"
        )}
        <View style={styles.field}>
          <Text style={styles.label}>Upload Your Degree here</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void pickDocument("degree")}
            style={styles.select}
          >
            <Text style={[styles.selectText, !degree && styles.placeholder]} numberOfLines={1}>
              {degree?.name ?? "Choose PDF or image (max 10 MB)"}
            </Text>
          </Pressable>
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Specializations</Text>
          <Pressable ref={specialtyTrigger} accessibilityRole="button"
            accessibilityLabel={`Specializations: ${selectedSpecialties.join(", ") || "none selected"}`}
            accessibilityState={{ expanded: languageOpen && menuKind === "specialties" }}
            onPress={openSpecialtyMenu} style={styles.select}>
            <Text style={[styles.selectText, !selectedSpecialties.length && styles.placeholder]}>
              {selectedSpecialties.join(", ") || "Select specializations"}
            </Text>
            <ChevronDown size={17} color={colors.patient.primaryDark} />
          </Pressable>
        </View>
        {selectedSpecialties.includes("Other") ? field("Other specialization", otherSpecialty, setOtherSpecialty, "Enter your specialization") : null}
        {field(
          "Registration authority",
          authority,
          setAuthority,
          "e.g. State Medical Council"
        )}
        {field(
          "License No.",
          registration,
          setRegistration,
          "Registration no."
        )}
        <View style={styles.field}>
          <Text style={styles.label}>Upload Your License here</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Upload your license document"
            onPress={() => void pickDocument("license")}
            style={styles.select}
          >
            <Text style={[styles.selectText, !license && styles.placeholder]} numberOfLines={1}>
              {license?.name ?? "Choose PDF or image (max 10 MB)"}
            </Text>
          </Pressable>
        </View>
        {field("Practice start date", started, setStarted, "DD-MM-YYYY")}
        <Input
          variant="unstyled"
          label="About"
          labelStyle={[styles.label, styles.inputLabel]}
          containerStyle={styles.field}
          accessibilityLabel="About"
          placeholder="Describe your experience and approach to patient care"
          placeholderTextColor="#9CA3AF"
          value={about}
          onChangeText={setAbout}
          multiline
          maxLength={2000}
          textAlignVertical="top"
          style={[styles.input, styles.aboutInput]}
        />
        <View style={styles.field}>
          <Text style={styles.label}>Languages</Text>
          <Pressable
            ref={languageTrigger}
            accessibilityRole="button"
            accessibilityLabel={`Languages: ${selectedLanguages.join(", ") || "none selected"}`}
            accessibilityState={{ expanded: languageOpen && menuKind === "languages" }}
            onPress={openLanguageMenu}
            style={styles.select}
          >
            <Text style={[styles.selectText, !selectedLanguages.length && styles.placeholder]}>
              {selectedLanguages.join(", ") || "Select languages"}
            </Text>
            <ChevronDown size={17} color={colors.patient.primaryDark} />
          </Pressable>
          {selectedLanguages.includes("Other") ? (
            <Input
              variant="unstyled"
              accessibilityLabel="Other language code"
              placeholder="Other language code (e.g. fr)"
              placeholderTextColor="#9CA3AF"
              autoCapitalize="none"
              maxLength={20}
              value={otherLanguageCode}
              onChangeText={setOtherLanguageCode}
              style={styles.input}
            />
          ) : null}
        </View>
        {solo ? (
          field("Clinic Name", clinic, setClinic, "Your clinic name")
        ) : (
          <View style={styles.field}>
            <Text style={styles.label}>Hospital/Clinic Name</Text>
            <Dropdown
              accessibilityLabel="Select registered hospital or clinic"
              placeholder="Select registered hospital or clinic"
              options={facilities.map((item) => ({
                label: `${item.name} · ${item.address}`,
                value: item.id,
              }))}
              value={facilityId}
              onValueChange={setFacilityId}
              triggerLabel={
                facilities.find((item) => item.id === facilityId)?.name
              }
              triggerStyle={styles.select}
              valueStyle={[styles.selectText, !facilityId && styles.placeholder]}
              chevronColor={colors.patient.primaryDark}
              backdropColor="#00000066"
              selectedOptionBackgroundColor="#F3F4F6"
            />
            {!facilities.length ? (
              <Text style={styles.locationHint}>
                {facilityLoadError ||
                  "No company-verified hospital or clinic is registered yet."}
              </Text>
            ) : null}
            <View style={styles.facilityInfoCard}>
              <Text style={styles.facilityHintTitle}>Hospital or clinic not listed?</Text>
              <Text style={styles.facilityHint}>
                Ask its administrator to register it first. If you operate an independent clinic, select the option below.
              </Text>
            </View>
          </View>
        )}
        <Checkbox
          theme="doctor"
          label="I own and operate an independent clinic"
          checked={solo}
          onCheckedChange={setSolo}
          disabled={busy}
          style={styles.solo}
          labelStyle={styles.soloText}
        />
        {solo ? (
          <View style={styles.field}>
            <Text style={styles.label}>Clinic operating licence</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Upload clinic operating licence"
              onPress={() => void pickDocument("clinic operating licence")} style={styles.select}>
              <Text style={[styles.selectText, !clinicLicense && styles.placeholder]} numberOfLines={1}>
                {clinicLicense?.name ?? "Choose PDF or image (max 10 MB)"}
              </Text>
            </Pressable>
          </View>
        ) : null}
        {solo ? (
          <View style={styles.field}>
            <Text style={styles.label}>Clinic Address</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Add or edit clinic address"
              onPress={() => { Keyboard.dismiss(); setAddressOpen(true); }} style={styles.select}>
              <Text numberOfLines={1} style={[styles.selectText, !address && styles.placeholder]}>
                {address ? [address, locality, practiceCity, pincode].filter(Boolean).join(', ') : 'Add clinic address'}
              </Text>
              <ChevronDown size={17} color={colors.patient.primaryDark} />
            </Pressable>
          </View>
        ) : null}
        <OnboardingButton
          loading={busy}
          label={busy ? "Submitting…" : "Save Profile"}
          disabled={busy}
          onPress={() => void submit()}
        />
        <View style={styles.privacyRow}>
          <LockKeyhole size={16} color={colors.textSecondary} />
          <Text style={styles.privacy}>Your Information is secure and private</Text>
        </View>
      </View>
      <ModalSurface layout="custom" visible={addressOpen} transparent animationType="slide"
        statusBarTranslucent navigationBarTranslucent onClose={() => { Keyboard.dismiss(); setAddressOpen(false); }}>
        <View style={styles.addressOverlay}>
          <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Dismiss clinic address drawer"
            onPress={() => { Keyboard.dismiss(); setAddressOpen(false); }} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.addressContainer}>
            <View style={styles.addressSheet}>
              <View style={styles.drawerHandle} />
              <View style={styles.addressHeader}>
                <Text style={styles.title}>Clinic Address</Text>
                <Pressable accessibilityRole="button" accessibilityLabel="Close clinic address drawer" hitSlop={8}
                  onPress={() => { Keyboard.dismiss(); setAddressOpen(false); }}>
                  <X size={22} color={colors.textSecondary} />
                </Pressable>
              </View>
              <ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag"
                contentContainerStyle={styles.addressFields} showsVerticalScrollIndicator={false}>
            {field("Clinic address", address, setAddress, "Street address")}
            {field(
              "Area / locality",
              locality,
              setLocality,
              "Area or locality"
            )}
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                {field("City", practiceCity, setPracticeCity, "City")}
              </View>
              <View style={{ flex: 1 }}>
                {field("State", practiceState, setPracticeState, "State")}
              </View>
            </View>
            {field(
              "Pincode",
              pincode,
              setPincode,
              "6-digit pincode",
              "number-pad"
            )}
            <View style={styles.field}>
              <Button theme="doctor" variant="outline" label="Choose location on map" leftIcon={<MapPin size={18} color={colors.patient.primaryDark} />} style={styles.mapButton}
                onPress={() => {
                  Keyboard.dismiss();
                  setAddressOpen(false);
                  clearChosenClinic();
                  router.push({ pathname: "/clinic-location", params: clinicLocation ? {
                    latitude: String(clinicLocation.latitude), longitude: String(clinicLocation.longitude),
                  } : {} });
                }} />
              {locationError ? (
                <Text accessibilityRole="alert" style={styles.error}>
                  {locationError}{" "}
                  <Text onPress={() => void Linking.openSettings()}>
                    Open settings
                  </Text>
                </Text>
              ) : null}
            </View>

                <Button theme="doctor" label="Confirm Address" style={styles.confirmAddress}
                  onPress={() => {
                    if (address.trim().length < 5 || locality.trim().length < 2 || practiceCity.trim().length < 2
                      || practiceState.trim().length < 2 || !/^\d{6}$/.test(pincode.trim()) || !clinicLocation) {
                      setError('Complete the clinic address and choose its map location before confirming.');
                      return;
                    }
                    Keyboard.dismiss();
                    setAddressOpen(false);
                  }} />
              </ScrollView>
            </View>
          </KeyboardAvoidingView>
        </View>
      </ModalSurface>
      <ModalSurface
        layout="custom"
        transparent
        statusBarTranslucent
        visible={languageOpen}
        onClose={() => setLanguageOpen(false)}
        animationType="fade"
      >
        <View style={styles.menuOverlay}>
          <Pressable
            accessibilityLabel="Close selection options"
            style={StyleSheet.absoluteFill}
            onPress={() => setLanguageOpen(false)}
          />
          <View
            style={[
              styles.options,
              styles.languageMenu,
              languageAnchor && {
                left: languageAnchor.x,
                top:
                  languageAnchor.y + languageAnchor.height + 320 > windowHeight
                    ? Math.max(8, languageAnchor.y - 320)
                    : languageAnchor.y + languageAnchor.height,
                width: languageAnchor.width,
              },
            ]}
          >
            <ScrollView keyboardShouldPersistTaps="handled">
              {(menuKind === "languages" ? languages : specialties).map((item) => {
                const checked = (menuKind === "languages" ? selectedLanguages : selectedSpecialties).includes(item);
                return (
                  <Pressable
                    key={item}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked }}
                    style={[styles.option, styles.languageOption, checked && styles.selectedOption]}
                    onPress={() => menuKind === "languages" ? toggleLanguage(item) : setSelectedSpecialties(current => current.includes(item) ? current.filter(value => value !== item) : [...current, item])}
                  >
                    <Text style={styles.selectText}>{item}</Text>
                    {checked ? (
                      <Check size={17} color={colors.patient.primaryDark} />
                    ) : null}
                  </Pressable>
                );
              })}
            </ScrollView>
            <Pressable
              accessibilityRole="button"
              style={styles.option}
              onPress={() => setLanguageOpen(false)}
            >
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
        </View>
      </ModalSurface>
    </OnboardingShell>
  );
}
const styles = StyleSheet.create({
  body: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    gap: 16,
    paddingVertical: 24,
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 13,
  },
  photoHint: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
    color: colors.textSecondary,
    marginTop: 6,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: colors.patient.primaryDark,
    alignItems: "center",
    overflow: "hidden",
  },
  avatarImage: { width: 76, height: 76, borderRadius: 38 },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 27,
    height: 27,
    borderRadius: 14,
    backgroundColor: colors.patient.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarHead: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: colors.white,
    marginTop: 12,
  },
  avatarBody: {
    width: 55,
    height: 30,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    backgroundColor: colors.white,
    marginTop: 6,
  },
  title: {
    fontFamily: fontFamilies.regular,
    fontSize: 22,
    color: colors.black,
  },
  field: { gap: 8 },
  label: {
    marginLeft: 6,
    fontFamily: fontFamilies.medium,
    fontWeight: "500",
    fontSize: 14,
    lineHeight: 18,
    color: colors.textPrimary,
  },
  inputLabel: { marginBottom: 0 },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    color: colors.textPrimary,
    paddingVertical: 0,
  },
  aboutInput: { height: 96, paddingTop: 12, paddingBottom: 12 },
  row: { flexDirection: "row", gap: 18 },
  select: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 12,
    backgroundColor: colors.white,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  selectText: {
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  placeholder: { color: "#9CA3AF" },
  options: {
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 10,
    backgroundColor: colors.white,
  },
  option: { paddingHorizontal: 14, paddingVertical: 11 },
  languageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  selectedOption: { backgroundColor: "#F3F4F6" },
  addressOverlay: { flex: 1, backgroundColor: "#00000066", justifyContent: "flex-end" },
  addressContainer: { width: "100%", maxHeight: "90%" },
  addressSheet: { flexShrink: 1, backgroundColor: colors.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: "hidden" },
  drawerHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: "#D1D1D1", alignSelf: "center", marginTop: 12, marginBottom: 20 },
  addressHeader: { paddingHorizontal: 24, paddingBottom: 20, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  addressFields: { paddingHorizontal: 24, paddingBottom: 32, gap: 16 },
  confirmAddress: { height: 54, borderRadius: 12 },
  locationCard: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "flex-start", paddingHorizontal: 12, paddingVertical: 0, borderRadius: 12, backgroundColor: colors.white, borderWidth: 1, borderColor: colors.borderDefault, gap: 12 },
  mapButton: { height: 54, borderRadius: 12, borderColor: "#D1D1D1" },
  facilityInfoCard: { backgroundColor: "#E6F4F0", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 6 },
  facilityHintTitle: { fontFamily: fontFamilies.medium, fontSize: 13, color: colors.textPrimary, textAlign: "center" },
  facilityHint: { fontFamily: fontFamilies.regular, fontSize: 13, lineHeight: 18, color: colors.textSecondary, textAlign: "center" },
  locationIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: "#E6F4F4", alignItems: "center", justifyContent: "center" },
  locationText: { flex: 1, gap: 2 },
  locationTitle: { fontFamily: fontFamilies.semibold, fontSize: 14, color: colors.textPrimary },
  locationSub: { fontFamily: fontFamilies.regular, fontSize: 12, color: "#71818F", lineHeight: 16 },
  doneText: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    color: colors.patient.primaryDark,
    textAlign: "right",
  },
  menuOverlay: { flex: 1, backgroundColor: "#00000066" },
  languageMenu: { position: "absolute", maxHeight: 320, overflow: "hidden" },
  solo: { flexDirection: "row", alignItems: "center", gap: 9 },
  checkbox: { width: 18, height: 18, backgroundColor: "#D5D7D9" },
  checked: { backgroundColor: colors.patient.primaryDark },
  soloText: { fontFamily: fontFamilies.regular, fontSize: 14 },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
  privacy: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    color: "#777",
    textAlign: "center",
    flexShrink: 1,
  },
  privacyRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6 },
  locationHint: {
    color: "#777",
    fontFamily: fontFamilies.regular,
    fontSize: 13,
  },
});
