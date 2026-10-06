import { useToastFeedback } from "@startup/mobile-ui";
import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { router } from "expo-router";
import * as DocumentPicker from "expo-document-picker";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { CheckCircle2, FileUp } from "lucide-react-native";
import { useQueryClient } from "@tanstack/react-query";
import { submitMyDriverVehicle } from "@startup/data-access";
import type { DriverDocumentKind } from "@startup/contracts";
import { parseDisplayDate } from "@startup/contracts";
import { colors, fontFamilies } from "@startup/design-tokens";
import { supabase, useMobileSession } from "../../services/supabase";

const documents: { kind: DriverDocumentKind; title: string }[] = [
  { kind: "aadhaar", title: "Aadhaar" },
  { kind: "pan", title: "PAN" },
  { kind: "driving_licence", title: "Driving licence" },
  { kind: "vehicle_rc", title: "Vehicle RC" },
  { kind: "insurance", title: "Insurance" },
  { kind: "fitness", title: "Fitness certificate" },
  { kind: "ambulance_image", title: "Ambulance image" },
  { kind: "equipment_images", title: "Equipment images" },
];
type Picked = Partial<
  Record<DriverDocumentKind, DocumentPicker.DocumentPickerAsset>
>;
export default function DriverDocuments() {
  const { session } = useMobileSession();
  const queryClient = useQueryClient();
  const [capability, setCapability] = useState<"BLS" | "ALS" | "NICU">("BLS");
  const [registration, setRegistration] = useState("");
  const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState("");
  const [equipment, setEquipment] = useState("");
  const [crew, setCrew] = useState("");
  const [picked, setPicked] = useState<Picked>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useToastFeedback({ error });

  async function choose(kind: DriverDocumentKind) {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type:
          kind.endsWith("image") || kind === "equipment_images"
            ? ["image/jpeg", "image/png"]
            : ["application/pdf", "image/jpeg", "image/png"],
        copyToCacheDirectory: true,
      });
      if (!result.canceled) {
        const file = result.assets[0];
        if ((file.size ?? 0) > 10 * 1024 * 1024)
          setError("Each file must be under 10 MB.");
        else {
          setPicked((current) => ({ ...current, [kind]: file }));
          setError("");
        }
      }
    } catch {
      setError("Could not select the file.");
    }
  }


  async function submit() {
    if (!supabase || !session) {
      setError("Sign in to continue.");
      return;
    }
    if (documents.some((item) => !picked[item.kind])) {
      setError("Upload all eight documents for company review.");
      return;
    }
    if (
      !registration.trim() ||
      !label.trim() ||
      !parseDisplayDate(expiry) ||
      equipment.trim().length < 10 ||
      crew.trim().length < 10
    ) {
      setError("Complete the vehicle, inspection, equipment and crew details.");
      return;
    }

    setBusy(true);
    setError("");

    const client = supabase;
    const currentSession = session;
    try {
      const entries = await Promise.all(
        documents.map(async (item) => {
          const file = picked[item.kind]!;
          const ext =
            file.mimeType === "application/pdf"
              ? "pdf"
              : file.mimeType === "image/png"
                ? "png"
                : "jpg";
          const path = `${currentSession.user.id}/vehicle/${item.kind}/${Crypto.randomUUID()}.${ext}`;
          const bytes = await new File(file.uri).arrayBuffer();
          const upload = await client.storage
            .from("driver-evidence")
            .upload(path, bytes, {
              contentType: file.mimeType ?? "application/pdf",
              upsert: false,
            });
          if (upload.error) throw upload.error;
          return [item.kind, path] as const;
        })
      );

      const paths = Object.fromEntries(entries) as Record<
        DriverDocumentKind,
        string
      >;

      await submitMyDriverVehicle(client, {
        vehicle: {
          registrationNumber: registration,
          displayLabel: label,
          inspectionExpiresOn: parseDisplayDate(expiry)!,
          capabilityCode: capability,
          equipmentNotes: equipment,
          crewNotes: crew,
        },
        documents: paths,
      });
      await queryClient.invalidateQueries({ queryKey: ["driver-fleet"] });
      router.replace("/(app)/verification");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not submit vehicle documents."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Vehicle & documents</Text>
        <Text style={styles.headerCopy}>
          Add your ambulance and upload proof for review.
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.body}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.label}>Ambulance category</Text>
        <View style={styles.categories}>
          {(["BLS", "ALS", "NICU"] as const).map((code) => (
            <Pressable
              key={code}
              accessibilityRole="button"
              accessibilityState={{ selected: capability === code }}
              onPress={() => setCapability(code)}
              style={[styles.category, capability === code && styles.selected]}
            >
              <Text
                style={[
                  styles.categoryText,
                  capability === code && styles.selectedText,
                ]}
              >
                {code}
              </Text>
            </Pressable>
          ))}
        </View>
        {field(
          "Registration number",
          registration,
          setRegistration,
          "Vehicle registration"
        )}
        {field("Vehicle name", label, setLabel, "Name shown to dispatch")}
        {field("Inspection expiry", expiry, setExpiry, "DD-MM-YYYY")}
        <Text style={styles.section}>Upload documents</Text>
        <Text style={styles.hint}>
          PDF, JPG or PNG · 10 MB maximum per file
        </Text>
        <View style={styles.grid}>
          {documents.map((item) => (
            <Pressable
              key={item.kind}
              accessibilityRole="button"
              accessibilityLabel={`Upload ${item.title}`}
              onPress={() => void choose(item.kind)}
              style={styles.tile}
            >
              {picked[item.kind] ? (
                <CheckCircle2 color={colors.driver.primary} size={24} />
              ) : (
                <FileUp color={colors.driver.primary} size={24} />
              )}
              <Text style={styles.tileTitle}>{item.title}</Text>
              <Text numberOfLines={1} style={styles.tileStatus}>
                {picked[item.kind]?.name ?? "Tap to upload"}
              </Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.section}>Review details</Text>
        <Text style={styles.hint}>
          Company reviewers use these notes to check that your vehicle is ready
          for its selected category.
        </Text>
        {field(
          "Equipment details",
          equipment,
          setEquipment,
          "List available equipment"
        )}
        {field(
          "Clinical crew details",
          crew,
          setCrew,
          "Describe crew qualifications"
        )}

        <Pressable
          accessibilityRole="button"
          disabled={busy}
          onPress={() => void submit()}
          style={[styles.button, busy && { opacity: 0.6 }]}
        >
          <Text style={styles.buttonText}>
            {busy ? "Uploading…" : "Submit for Verification"}
          </Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}
function field(
  label: string,
  value: string,
  setValue: (value: string) => void,
  placeholder: string
) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        value={value}
        onChangeText={setValue}
        placeholder={placeholder}
        style={styles.input}
      />
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#F7FBFA" },
  header: {
    backgroundColor: colors.driver.primary,
    paddingHorizontal: 24,
    paddingTop: 56,
    paddingBottom: 29,
  },
  headerTitle: { color: "white", fontFamily: fontFamilies.bold, fontSize: 25 },
  headerCopy: { color: "#E3F7F2", marginTop: 6, fontSize: 14 },
  body: { padding: 22, paddingBottom: 40, gap: 13 },
  label: {
    color: colors.driver.text,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  field: { gap: 7 },
  input: {
    height: 53,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#CBDFE0",
    backgroundColor: "white",
    paddingHorizontal: 15,
    fontSize: 16,
  },
  categories: { flexDirection: "row", gap: 10, marginBottom: 8 },
  category: {
    flex: 1,
    height: 49,
    borderWidth: 1,
    borderColor: colors.driver.primary,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "white",
  },
  selected: { backgroundColor: colors.driver.primary },
  categoryText: { color: colors.driver.primary, fontFamily: fontFamilies.bold },
  selectedText: { color: "white" },
  section: {
    fontFamily: fontFamilies.bold,
    fontSize: 19,
    color: colors.driver.text,
    marginTop: 12,
  },
  hint: { color: colors.driver.textSecondary, fontSize: 13, lineHeight: 19 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 11 },
  tile: {
    width: "48%",
    minHeight: 104,
    borderRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#CFDDDE",
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    gap: 5,
  },
  tileTitle: {
    color: colors.driver.text,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    textAlign: "center",
  },
  tileStatus: {
    color: colors.driver.textSecondary,
    fontSize: 11,
    textAlign: "center",
  },
  error: { color: colors.danger },
  button: {
    minHeight: 54,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.driver.primary,
    marginTop: 12,
  },
  buttonText: { color: "white", fontFamily: fontFamilies.bold, fontSize: 16 },
});
