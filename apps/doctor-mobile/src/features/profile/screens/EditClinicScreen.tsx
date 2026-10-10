import { useEffect, useState } from "react";
import {
  Keyboard,
  StyleSheet,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MapPin } from "lucide-react-native";
import {
  Button,
  Input,
  Skeleton,
  useToast,
  useToastFeedback,
} from "@startup/mobile-ui";
import { ownedClinicLocationSchema } from "@startup/contracts";
import {
  getMyDoctorProfile,
  updateMyOwnedClinicLocation,
} from "@startup/data-access";
import { DoctorScreen, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";
import { useClinicLocationDraft } from "../../locations/clinicLocationDraft";
export function EditClinicScreen() {
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  const { profile: sessionProfile } = useMobileSession();
  const { showToast } = useToast();
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ["my-doctor-profile", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  const clinic = profile.data?.facilities.find(
    (item) => item.facility_id === facilityId && item.can_edit_clinic
  );
  const [draft, setDraft] = useState({
    name: "",
    address: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [initialized, setInitialized] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const chosen = useClinicLocationDraft((s) => s.chosen);
  const clear = useClinicLocationDraft((s) => s.clear);
  useEffect(() => {
    if (!clinic || initialized) return;
    // Registration stores the exact structured suffix in the display address.
    // Strip only that known suffix; never guess address parts for legacy rows.
    const suffix = [clinic.locality, clinic.city, clinic.state, clinic.pincode]
      .filter(Boolean)
      .join(", ");
    const street =
      suffix && clinic.address.endsWith(`, ${suffix}`)
        ? clinic.address.slice(0, -(suffix.length + 2))
        : clinic.address;
    setDraft({
      name: clinic.facility_name,
      address: street,
      locality: clinic.locality ?? "",
      city: clinic.city ?? "",
      state: clinic.state ?? "",
      pincode: clinic.pincode ?? "",
      latitude: clinic.latitude ?? null,
      longitude: clinic.longitude ?? null,
    });
    setInitialized(true);
  }, [clinic, initialized]);
  useEffect(() => {
    if (!chosen) return;
    setDraft((previous) => ({
      ...previous,
      latitude: chosen.latitude,
      longitude: chosen.longitude,
      address: chosen.street || previous.address,
      locality: chosen.locality || previous.locality,
      city: chosen.city || previous.city,
      state: chosen.state || previous.state,
      pincode: chosen.pincode || previous.pincode,
    }));
    clear();
  }, [chosen, clear]);
  const parsed = ownedClinicLocationSchema.safeParse({ facilityId, ...draft });
  const invalid = new Set(
    parsed.success
      ? []
      : parsed.error.issues.map((issue) => String(issue.path[0]))
  );
  const save = useMutation({
    mutationFn: async () => {
      if (!clinic?.can_edit_clinic)
        throw new Error("Only the clinic owner can edit this location.");
      const location = ownedClinicLocationSchema.parse({
        facilityId,
        ...draft,
        address: [
          draft.address,
          draft.locality,
          draft.city,
          draft.state,
          draft.pincode,
        ]
          .map((part) => part.trim())
          .join(", "),
      });
      return updateMyOwnedClinicLocation(supabase!, location);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["my-doctor-profile"] }),
        client.invalidateQueries({ queryKey: ["my-practices"] }),
      ]);
      showToast({ title: "Clinic details saved", type: "success" });
      router.back();
    },
    onError: (error) =>
      showToast({
        title: "Could not save clinic",
        message: error.message,
        type: "error",
      }),
  });
  useToastFeedback({
    error: profile.isError ? "Could not load clinic details." : "",
  });
  function field(
    key: "name" | "address" | "locality" | "city" | "state" | "pincode",
    label: string,
    placeholder: string
  ) {
    return (
      <Input
        label={label}
        placeholder={placeholder}
        value={draft[key]}
        onChangeText={(value) =>
          setDraft((previous) => ({ ...previous, [key]: value }))
        }
        keyboardType={key === "pincode" ? "number-pad" : "default"}
        maxLength={key === "pincode" ? 6 : undefined}
        invalid={attempted && invalid.has(key)}
        style={styles.input}
        labelStyle={styles.label}
        placeholderTextColor="#9A9A9A"
      />
    );
  }
  return (
    <DoctorScreen title="Edit Clinic" bottomNav={false}>
      {profile.isLoading ? (
        <Skeleton height={120} />
      ) : !clinic ? (
        <Label>
          Only your own active clinic can be edited here. Associated hospital
          details are managed by its administration.
        </Label>
      ) : (
        <>
          <Panel>
            {field("name", "Clinic Name", "Your clinic name")}
            {field("address", "Clinic address", "Street address")}
            {field("locality", "Area / locality", "Area or locality")}
            <View style={ui.row}>
              <View style={ui.flex}>{field("city", "City", "City")}</View>
              <View style={ui.flex}>{field("state", "State", "State")}</View>
            </View>
            {field("pincode", "Pincode", "6-digit pincode")}
            <Button theme="doctor" variant="outline" label="Choose location on map" style={styles.input}
              leftIcon={<MapPin size={18} color={palette.primary} />}
              onPress={() => {
                Keyboard.dismiss();
                clear();
                router.push({ pathname: "/practice-location", params:
                  draft.latitude !== null && draft.longitude !== null
                    ? { latitude: String(draft.latitude), longitude: String(draft.longitude) } : {} });
              }} />
          </Panel>
          <Button
            theme="doctor"
            label="Save clinic details"
            loading={save.isPending}
            style={styles.input}
            onPress={() => {
              setAttempted(true);
              if (!parsed.success) {
                showToast({
                  title:
                    "Complete the clinic address and choose its map location",
                  type: "error",
                });
                return;
              }
              Keyboard.dismiss();
              save.mutate();
            }}
          />
        </>
      )}
    </DoctorScreen>
  );
}
const styles = StyleSheet.create({
  input: { height: 54, minHeight: 54, borderRadius: 12 },
  label: { color: palette.text, fontSize: 13 },
});
