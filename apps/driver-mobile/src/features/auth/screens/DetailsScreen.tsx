import { useRegistrationDetails } from "../hooks/useRegistrationDetails";
import type { DetailsScreenProps } from "../types/details-screen";

import { Keyboard, Pressable, ScrollView, Text, View } from "react-native";
import { Button, Input, ProfilePhotoButton } from "@startup/mobile-ui";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Check, MapPin } from "lucide-react-native";

import { AddressSheet } from "../components/DriverAddressSheet";
import { emptyAddress } from "../utils/addressConstants";
import { s } from "../components/Registration.styles";
import { Frame } from "../components/RegistrationFrame";
import { teal } from "../utils/registrationConstants";

export function DetailsScreen({
  initialProfile,
  profile,
  onSave,
  onBack,
  initialConsent = false,
}: DetailsScreenProps) {
  const {
    form,
    setForm,
    consent,
    setConsent,
    picking,
    saving,
    addressOpen,
    setAddressOpen,
    change,
    pickPhoto,
    save,
  } = useRegistrationDetails({
    initialProfile,
    profile,
    onSave,
    onBack,
    initialConsent,
  });
  return (
    <Frame title="Personal Details" onBack={onBack}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={s.detailsContent}
      >
        <View style={s.photoButton}>
          <ProfilePhotoButton
            theme="driver"
            size={84}
            loading={picking}
            disabled={picking}
            source={form.photo ? { uri: form.photo } : undefined}
            onPress={() => void pickPhoto()}
          />
          <Text style={s.photoTitle}>
            {picking ? "Opening photos…" : "Add profile photo"}
          </Text>
          <Text style={s.caption}>JPG, PNG up to 5 MB</Text>
        </View>
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
            placeholder="DD-MM-YYYY"
            containerStyle={s.inputContainer}
            style={s.input}
          />
          <Input
            label="City"
            value={form.city}
            editable={!form.address}
            onChangeText={(v) => change("city", v)}
            placeholder="City, State"
            containerStyle={s.inputContainer}
            style={s.input}
          />
          <View style={{ gap: 8 }}>
            <Text
              style={{
                fontFamily: fontFamilies.medium,
                fontSize: 14,
                color: colors.driver.text,
              }}
            >
              Address
            </Text>
            <Button
              theme="driver"
              variant="outline"
              style={{
                height: 54,
                backgroundColor: colors.white,
                borderColor: colors.borderDefault,
                borderRadius: 12,
              }}
              labelStyle={{ flexShrink: 1 }}
              label={
                form.address
                  ? [
                      form.address.building,
                      form.address.line1,
                      form.address.city,
                    ]
                      .filter(Boolean)
                      .join(", ")
                  : "Add address"
              }
              leftIcon={<MapPin size={18} color={teal} />}
              onPress={() => {
                Keyboard.dismiss();
                setAddressOpen(true);
              }}
            />
          </View>
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
          <Button
            loading={saving}
            theme="driver"
            label="Continue"
            disabled={saving}
            onPress={() => void save()}
          />
        </View>
      </ScrollView>
      <AddressSheet
        visible={addressOpen}
        value={form.address ?? emptyAddress}
        onClose={() => setAddressOpen(false)}
        onReopen={() => setAddressOpen(true)}
        onConfirm={(address) => {
          setForm((current) => ({ ...current, address, city: address.city }));
          setAddressOpen(false);
        }}
      />
    </Frame>
  );
}
