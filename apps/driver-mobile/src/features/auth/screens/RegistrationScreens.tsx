import React, { useState, type ReactNode } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView, Button, Input } from "@startup/mobile-ui";
import { fontFamilies } from "@startup/design-tokens";
import { StatusBar } from "expo-status-bar";
import {
  Activity,
  Ambulance,
  ArrowLeft,
  ArrowRight,
  Baby,
  BadgeCheck,
  Camera,
  Check,
  CheckCheck,
  ClipboardCheck,
  Clock3,
  Crosshair,
  FileCheck,
  FileText,
  Headphones,
  HeartPulse,
  IdCard,
  Shield,
  Wallet,
  type LucideIcon,
} from "lucide-react-native";
import * as DocumentPicker from "expo-document-picker";

export type DriverProfile = {
  name: string;
  mobile: string;
  dob: string;
  city: string;
  photo?: string;
};
export type RegistrationDocuments = {
  classification: "BLS" | "ALS" | "NICU";
  registration: string;
  files: Record<string, DocumentPicker.DocumentPickerAsset>;
};
const teal = "#087F8C";

function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={s.header}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={onBack}
          style={s.back}
        >
          <ArrowLeft size={23} color="white" />
        </Pressable>
      )}
      <Text style={s.headerTitle}>{title}</Text>
    </View>
  );
}
function Frame({
  children,
  title,
  onBack,
}: {
  children: ReactNode;
  title: string;
  onBack?: () => void;
}) {
  return (
    <SafeAreaView style={s.headerSafeArea} edges={["top"]}>
      <StatusBar style="light" />
      <Header title={title} onBack={onBack} />
      <KeyboardAvoidingView
        style={s.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={s.screen} edges={["bottom"]}>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
function ErrorText({ message }: { message: string }) {
  return message ? (
    <Text accessibilityRole="alert" style={s.error}>
      {message}
    </Text>
  ) : null;
}

export function WelcomeScreen({ onNext }: { onNext: () => void }) {
  return (
    <SafeAreaView style={s.headerSafeArea} edges={["top"]}>
      <StatusBar style="light" />
      <ScrollView style={s.screen} contentContainerStyle={s.welcomeScroll}>
        <View style={s.hero}>
          <Image
            source={require("../../../../assets/figma/hero.png")}
            style={s.heroImage}
            resizeMode="cover"
          />
          <View style={s.heroShade} />
          <Text style={s.heroTitle}>Drive to{"\n"}save lives.</Text>
          <Text style={s.heroSubtitle}>
            Trusted emergency response{"\n"}network.
          </Text>
        </View>
        <View style={s.welcomeBody}>
          <View style={s.benefitHeading}>
            <View style={s.checkCircle}>
              <Shield size={20} color="white" />
            </View>
            <Text style={s.title}>Why partner with us</Text>
          </View>
          {[
            {
              icon: Wallet,
              title: "Fair trip earnings",
              body: "Transparent fare and incentives",
            },
            {
              icon: Crosshair,
              title: "Smart matching",
              body: "Equipment and ETA based requests",
            },
            {
              icon: Headphones,
              title: "24/7 support",
              body: "Emergency coordination team",
            },
          ].map(({ icon: Icon, title, body }) => (
            <View key={title} style={s.benefit}>
              <View
                style={[
                  s.checkCircle,
                  title === "Smart matching" && s.redCircle,
                ]}
              >
                <Check size={18} color="white" />
              </View>
              <View style={s.flex}>
                <Text style={s.rowTitle}>{title}</Text>
                <Text style={s.muted}>{body}</Text>
              </View>
              <View style={s.iconCircle}>
                <Icon
                  size={19}
                  color={title === "Smart matching" ? "#FB3748" : teal}
                />
              </View>
            </View>
          ))}
        </View>
        <SafeAreaView edges={["bottom"]} style={s.welcomeAction}>
          <Button
            theme="driver"
            label="Set up driver profile"
            onPress={onNext}
            style={s.welcomeButton}
            leftIcon={<ArrowRight size={19} color="white" />}
          />
        </SafeAreaView>
      </ScrollView>
    </SafeAreaView>
  );
}

export function DetailsScreen({
  profile,
  onSave,
  onBack,
}: {
  profile: DriverProfile;
  onSave: (profile: DriverProfile) => void;
  onBack: () => void;
}) {
  const [form, setForm] = useState(profile);
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [picking, setPicking] = useState(false);
  const change = (key: keyof DriverProfile, value: string) =>
    setForm((old) => ({ ...old, [key]: value }));
  const pickPhoto = async () => {
    setPicking(true);
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const file = result.assets[0];
        if ((file.size ?? 0) > 5 * 1024 * 1024)
          setError("Choose a profile photo smaller than 5 MB.");
        else change("photo", file.uri);
      }
    } catch {
      setError("Could not open your photos. Please try again.");
    } finally {
      setPicking(false);
    }
  };
  const save = () => {
    if (!form.name.trim() || !form.city.trim() || !form.dob.trim())
      return setError("Enter your full name, date of birth and city.");
    if (
      !/^\+?[\d\s()-]+$/.test(form.mobile) ||
      ![10, 12].includes(form.mobile.replace(/\D/g, "").length)
    )
      return setError(
        "Enter a 10-digit mobile number, with an optional +91 prefix."
      );
    const birthParts = form.dob
      .trim()
      .match(/^(\d{1,2})\s*\/\s*(\d{1,2})\s*\/\s*(\d{4})$/);
    const birthDate = birthParts
      ? new Date(
          Number(birthParts[3]),
          Number(birthParts[2]) - 1,
          Number(birthParts[1])
        )
      : new Date(form.dob);
    if (
      Number.isNaN(birthDate.getTime()) ||
      birthDate >= new Date() ||
      birthDate.getFullYear() < 1900 ||
      (birthParts &&
        (birthDate.getDate() !== Number(birthParts[1]) ||
          birthDate.getMonth() !== Number(birthParts[2]) - 1))
    )
      return setError(
        "Enter a valid date of birth, for example 14 / 06 / 1990."
      );
    if (!consent)
      return setError("Agree to verification and safety checks to continue.");
    setError("");
    onSave({ ...form, name: form.name.trim(), city: form.city.trim() });
  };
  return (
    <Frame title="Personal Details" onBack={onBack}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.detailsContent}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Choose profile photo"
          disabled={picking}
          onPress={pickPhoto}
          style={s.photoButton}
        >
          <View style={s.avatar}>
            {form.photo ? (
              <Image source={{ uri: form.photo }} style={s.avatarImage} />
            ) : (
              <Text style={s.initials}>
                {form.name
                  .trim()
                  .split(/\s+/)
                  .map((part) => part[0])
                  .slice(0, 2)
                  .join("")
                  .toUpperCase() || "DR"}
              </Text>
            )}
            <View style={s.camera}>
              <Camera size={16} color={teal} />
            </View>
          </View>
          <Text style={s.photoTitle}>
            {picking ? "Opening photos…" : "Add profile photo"}
          </Text>
          <Text style={s.caption}>JPG, PNG up to 5 MB</Text>
        </Pressable>
        <View style={s.fields}>
          <Input
            label="Full name"
            value={form.name}
            onChangeText={(v) => change("name", v)}
            placeholder="Enter your full name"
            autoComplete="name"
            containerStyle={s.inputContainer}
            style={s.input}
          />
          <Input
            label="Mobile number"
            value={form.mobile}
            onChangeText={(v) => change("mobile", v)}
            placeholder="+91 98765 43210"
            keyboardType="phone-pad"
            autoComplete="tel"
            containerStyle={s.inputContainer}
            style={s.input}
          />
          <Input
            label="Date of birth"
            value={form.dob}
            onChangeText={(v) => change("dob", v)}
            placeholder="DD / MM / YYYY"
            containerStyle={s.inputContainer}
            style={s.input}
          />
          <Input
            label="City"
            value={form.city}
            onChangeText={(v) => change("city", v)}
            placeholder="City, State"
            containerStyle={s.inputContainer}
            style={s.input}
          />
        </View>
        <View style={s.bottomForm}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: consent }}
            onPress={() => setConsent((v) => !v)}
            style={s.consent}
          >
            <View style={[s.checkbox, consent && s.checked]}>
              {consent && <Check size={16} color="white" />}
            </View>
            <Text style={s.consentText}>
              I agree to verification and safety checks
            </Text>
          </Pressable>
          <ErrorText message={error} />
          <Button theme="driver" label="Continue" onPress={save} />
        </View>
      </ScrollView>
    </Frame>
  );
}

const documentTypes: { name: string; icon: LucideIcon; image?: boolean }[] = [
  { name: "Aadhaar Card", icon: IdCard },
  { name: "PAN Card", icon: IdCard },
  { name: "Driving licence", icon: FileText },
  { name: "Vehicle RC", icon: FileCheck },
  { name: "Insurance", icon: Shield },
  { name: "Fitness certificate", icon: ClipboardCheck },
  { name: "Ambulance Image", icon: Ambulance, image: true },
  { name: "Equipment Images", icon: HeartPulse, image: true },
];
export function DocumentsScreen({
  onSubmit,
  onBack,
  initialDocuments,
}: {
  onSubmit: (documents: RegistrationDocuments) => void;
  onBack: () => void;
  initialDocuments?: RegistrationDocuments;
}) {
  const [classification, setClassification] = useState<
    RegistrationDocuments["classification"]
  >(initialDocuments?.classification ?? "ALS");
  const [registration, setRegistration] = useState(
    initialDocuments?.registration ?? ""
  );
  const [files, setFiles] = useState<RegistrationDocuments["files"]>(
    initialDocuments?.files ?? {}
  );
  const [error, setError] = useState("");
  const [picking, setPicking] = useState<string | null>(null);
  const pick = async (doc: (typeof documentTypes)[number]) => {
    setPicking(doc.name);
    setError("");
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: doc.image
          ? ["image/jpeg", "image/png"]
          : ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const file = result.assets[0];
        if ((file.size ?? 0) > 10 * 1024 * 1024)
          setError("Choose a file smaller than 10 MB.");
        else setFiles((old) => ({ ...old, [doc.name]: file }));
      }
    } catch {
      setError("Could not open your files. Please try again.");
    } finally {
      setPicking(null);
    }
  };
  const submit = () => {
    if (!registration.trim())
      return setError("Enter the ambulance registration number.");
    const missing = documentTypes.filter((doc) => !files[doc.name]);
    if (missing.length)
      return setError(
        `Add all required documents to continue. ${missing.length} remaining.`
      );
    onSubmit({
      classification,
      registration: registration.trim().toUpperCase(),
      files,
    });
  };
  return (
    <Frame title="Vehicle & documents" onBack={onBack}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.documentContent}
      >
        <Text style={s.sectionTitle}>Ambulance classification</Text>
        <View style={s.classifications}>
          {(
            [
              { id: "BLS", label: "Basic", icon: Shield },
              { id: "ALS", label: "Advanced", icon: Activity },
              { id: "NICU", label: "Neonatal", icon: Baby },
            ] as const
          ).map(({ id, label, icon: Icon }) => (
            <Pressable
              key={id}
              accessibilityRole="radio"
              accessibilityState={{ selected: classification === id }}
              onPress={() => setClassification(id)}
              style={[
                s.classification,
                classification === id && s.classificationSelected,
              ]}
            >
              <View style={s.classTop}>
                <Text style={[s.rowTitle, classification === id && s.red]}>
                  {id}
                </Text>
                <Icon
                  size={22}
                  color={classification === id ? "#DE372B" : teal}
                />
              </View>
              <Text style={s.caption}>{label}</Text>
            </Pressable>
          ))}
        </View>
        <Input
          label="Registration number"
          value={registration}
          onChangeText={setRegistration}
          autoCapitalize="characters"
          placeholder="KA 01 AB 1001"
          containerStyle={s.registrationInput}
          labelStyle={s.sectionTitle}
          style={s.input}
        />
        <Text style={s.sectionTitle}>Required documents</Text>
        <View style={s.documentGrid}>
          {documentTypes.map((doc) => (
            <Pressable
              key={doc.name}
              onPress={() => pick(doc)}
              disabled={picking !== null}
              accessibilityRole="button"
              accessibilityLabel={`${files[doc.name] ? "Replace" : "Add"} ${doc.name}`}
              style={[s.documentTile, files[doc.name] && s.documentAdded]}
            >
              <View style={s.smallIcon}>
                <doc.icon size={19} color={teal} />
              </View>
              <View style={s.flex}>
                <Text style={s.docTitle}>{doc.name}</Text>
                <Text
                  numberOfLines={1}
                  style={[s.caption, files[doc.name] && s.teal]}
                >
                  {picking === doc.name
                    ? "Opening…"
                    : files[doc.name]
                      ? "File selected"
                      : "Add file"}
                </Text>
              </View>
              {files[doc.name] && <Check size={13} color={teal} />}
            </Pressable>
          ))}
        </View>
        <Text style={s.fileHelp}>
          PDF, JPG or PNG up to 10 MB. Photos must be JPG or PNG.
        </Text>
        <View style={s.documentFooter}>
          <ErrorText message={error} />
          <Button
            theme="driver"
            label="Submit for Verification"
            disabled={picking !== null}
            onPress={submit}
          />
        </View>
      </ScrollView>
    </Frame>
  );
}

export function VerificationScreen({
  verified,
  onDashboard,
  onBack,
}: {
  verified: boolean;
  onDashboard: () => void;
  onBack: () => void;
}) {
  return (
    <Frame title="Verification" onBack={onBack}>
      <ScrollView contentContainerStyle={s.verificationContent}>
        <Image
          source={require("../../../../assets/figma/verified.png")}
          style={s.verifiedImage}
          resizeMode="contain"
        />
        <Text style={s.thankYou}>Thank You!</Text>
        <Text style={s.verificationSubtitle}>
          {verified
            ? "You’re ready to respond."
            : "Please Wait Until We Verify Your Profile"}
        </Text>
        {verified ? (
          <View style={s.statusCard}>
            <Text style={s.sectionTitle}>Verification status</Text>
            {[
              {
                title: "Identity verified",
                body: "Personal details confirmed",
              },
              { title: "Vehicle approved", body: "Vehicle details match" },
              { title: "Documents valid", body: "Uploaded files accepted" },
            ].map((item) => (
              <View key={item.title} style={s.statusRow}>
                <BadgeCheck color={teal} size={23} />
                <View style={s.flex}>
                  <Text style={s.rowTitle}>{item.title}</Text>
                  <Text style={s.caption}>{item.body}</Text>
                </View>
                <View style={s.pill}>
                  <Text style={s.pillText}>Verified</Text>
                </View>
              </View>
            ))}
          </View>
        ) : (
          <View style={s.waiting}>
            <Clock3 color={teal} size={26} />
            <Text style={s.waitTitle}>Verification in progress</Text>
            <Text style={s.waitBody}>
              Your personal details, vehicle and documents are ready for review.
              Your dashboard will be available after approval.
            </Text>
            <View style={s.received}>
              <CheckCheck size={18} color={teal} />
              <Text style={s.receivedText}>
                All required documents selected
              </Text>
            </View>
          </View>
        )}
        <View style={s.verificationFooter}>
          {verified ? (
            <Button
              theme="driver"
              label="Open Driver Dashboard"
              onPress={onDashboard}
            />
          ) : (
            <Button
              theme="driver"
              variant="outline"
              label="Review submitted details"
              onPress={onBack}
            />
          )}
        </View>
      </ScrollView>
    </Frame>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#fff" },
  headerSafeArea: { flex: 1, backgroundColor: teal },
  flex: { flex: 1 },
  header: {
    minHeight: 82,
    backgroundColor: teal,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 56,
  },
  headerTitle: { fontFamily: fontFamilies.bold, fontSize: 18, color: "#fff" },
  back: {
    position: "absolute",
    left: 16,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 18,
    color: "#102E40",
    flexShrink: 1,
  },
  rowTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    color: "#102E40",
  },
  muted: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 16,
    color: "#64798A",
    marginTop: 5,
  },
  caption: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 16,
    color: "#718394",
    marginTop: 5,
  },
  hero: { height: 340, overflow: "hidden" },
  heroImage: { ...StyleSheet.absoluteFill, width: "100%", height: "100%" },
  heroShade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(0,30,35,0.15)",
  },
  heroTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 26,
    lineHeight: 30,
    color: "white",
    position: "absolute",
    left: 37,
    top: 110,
  },
  heroSubtitle: {
    position: "absolute",
    left: 37,
    top: 180,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    color: "#C9E0E3",
  },
  welcomeScroll: { flexGrow: 1 },
  welcomeBody: {
    backgroundColor: "white",
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: -26,
    padding: 26,
    borderWidth: 1,
    borderColor: "#D0E1E6",
    boxShadow: "0 8px 16px rgba(17, 50, 65, 0.12)",
  },
  benefitHeading: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 15,
  },
  checkCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: teal,
    alignItems: "center",
    justifyContent: "center",
  },
  redCircle: { backgroundColor: "#FB3748" },
  benefit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 64,
    paddingVertical: 10,
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EAF7F8",
    alignItems: "center",
    justifyContent: "center",
  },
  welcomeAction: {
    marginTop: "auto",
    paddingTop: 64,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  welcomeButton: { minHeight: 56, borderRadius: 18 },
  detailsContent: { flexGrow: 1, paddingHorizontal: 20, paddingBottom: 24 },
  photoButton: { alignItems: "center", paddingTop: 0, paddingBottom: 32 },
  avatar: {
    height: 84,
    width: 84,
    borderRadius: 42,
    backgroundColor: "#E9F7F7",
    borderWidth: 1,
    borderColor: "#D6E5E7",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
  },
  avatarImage: { width: 82, height: 82, borderRadius: 41 },
  initials: { fontFamily: fontFamilies.semibold, fontSize: 26, color: teal },
  camera: {
    position: "absolute",
    right: -1,
    bottom: 0,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "white",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#D6E5E7",
  },
  photoTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    color: "#102E40",
    marginTop: 20,
  },
  fields: { gap: 16 },
  inputContainer: { maxWidth: undefined, width: "100%" },
  input: {
    borderColor: "#D8E4E7",
    minHeight: 55,
    borderRadius: 12,
    fontSize: 15,
  },
  bottomForm: { paddingTop: 36, marginTop: "auto" },
  consent: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    gap: 12,
    marginBottom: 14,
  },
  checkbox: {
    width: 21,
    height: 21,
    borderWidth: 1,
    borderColor: "#879AA5",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 3,
  },
  checked: { backgroundColor: teal, borderColor: teal },
  consentText: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    color: "#243E50",
    flex: 1,
  },
  error: {
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 19,
    color: "#B12A24",
    marginBottom: 14,
  },
  documentContent: { padding: 20, paddingBottom: 28, flexGrow: 1 },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
    color: "#102E40",
    marginBottom: 12,
  },
  classifications: { flexDirection: "row", gap: 10, marginBottom: 20 },
  classification: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#D1E0E5",
    borderRadius: 12,
    padding: 12,
    minHeight: 76,
  },
  classificationSelected: {
    backgroundColor: "#F8ECEA",
    borderColor: "#F2837A",
  },
  classTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 4,
  },
  red: { color: "#DB3329" },
  registrationInput: { maxWidth: undefined, marginBottom: 20 },
  documentGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  documentTile: {
    width: "auto",
    flexBasis: "46%",
    flexGrow: 1,
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    minHeight: 76,
    borderWidth: 1,
    borderColor: "#D1E0E5",
    borderRadius: 14,
    padding: 12,
  },
  documentAdded: { backgroundColor: "#F4FBFB" },
  smallIcon: {
    height: 31,
    width: 31,
    borderRadius: 16,
    backgroundColor: "#EAF7F8",
    alignItems: "center",
    justifyContent: "center",
  },
  docTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    color: "#102E40",
    lineHeight: 15,
  },
  teal: { color: teal },
  fileHelp: {
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 16,
    color: "#64798A",
    marginTop: 12,
  },
  documentFooter: { marginTop: "auto", paddingTop: 30 },
  verificationContent: { padding: 22, flexGrow: 1, alignItems: "center" },
  verifiedImage: { height: 220, width: "100%", marginTop: 8 },
  thankYou: {
    fontFamily: fontFamilies.bold,
    fontSize: 30,
    color: "#102E40",
    marginTop: 12,
  },
  verificationSubtitle: {
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    lineHeight: 24,
    color: "#546E7D",
    textAlign: "center",
    marginTop: 10,
    maxWidth: 280,
  },
  statusCard: {
    width: "100%",
    borderWidth: 1,
    borderColor: "#D8E5E8",
    borderRadius: 16,
    padding: 16,
    marginTop: 30,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 13,
  },
  pill: {
    backgroundColor: "#E9F7F5",
    borderRadius: 15,
    paddingHorizontal: 9,
    paddingVertical: 5,
  },
  pillText: {
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
    color: "#087D72",
  },
  waiting: { alignItems: "center", paddingVertical: 28, gap: 12 },
  waitTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 17,
    color: "#173D4A",
  },
  waitBody: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 22,
    color: "#64798A",
    textAlign: "center",
  },
  received: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
    marginTop: 8,
  },
  receivedText: { fontFamily: fontFamilies.medium, fontSize: 12, color: teal },
  verificationFooter: {
    width: "100%",
    marginTop: "auto",
    paddingTop: 30,
    paddingBottom: 5,
  },
});
