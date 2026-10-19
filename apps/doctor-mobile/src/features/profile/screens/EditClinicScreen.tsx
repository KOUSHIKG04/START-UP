import { useClinicEditor } from "../hooks/useClinicEditor";

import { Keyboard, StyleSheet, View } from "react-native";
import { router } from "expo-router";

import { MapPin } from "lucide-react-native";
import { Button, Input, Skeleton } from "@startup/mobile-ui";

import { DoctorScreen, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

export function EditClinicScreen() {
  const {
    showToast,
    profile,
    clinic,
    draft,
    setDraft,
    attempted,
    setAttempted,
    clear,
    parsed,
    invalid,
    save,
  } = useClinicEditor();
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
            <Button
              theme="doctor"
              variant="outline"
              label="Choose location on map"
              style={styles.input}
              leftIcon={<MapPin size={18} color={palette.primary} />}
              onPress={() => {
                Keyboard.dismiss();
                clear();
                router.push({
                  pathname: "/practice-location",
                  params:
                    draft.latitude !== null && draft.longitude !== null
                      ? {
                          latitude: String(draft.latitude),
                          longitude: String(draft.longitude),
                        }
                      : {},
                });
              }}
            />
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
