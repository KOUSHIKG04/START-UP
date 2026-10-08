import { Button } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import * as ImagePicker from "expo-image-picker";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { LockKeyhole } from "lucide-react-native";
import {
  ageFromBirthDate,
  formatDisplayDate,
  parseDisplayDate,
} from "@startup/contracts";
import { Controller, useForm } from "react-hook-form";
import { colors, fontFamilies } from "@startup/design-tokens";
import { SelectDropdown } from "./SelectDropdown";
import { AddressSheet, type PatientAddress } from "./AddressSheet";
import { emptyAddress } from "./addressTypes";
import { onboardingButtonStyles, OnboardingShell } from "./OnboardingShell";
import {
  Input,
  ProfilePhotoButton,
  useToastFeedback,
} from "@startup/mobile-ui";
import { BloodGroupSelector } from "./BloodGroupSelector";
import { FamilyRelationFields } from "./FamilyRelationFields";
import { PersonalAddressFields } from "./PersonalAddressFields";
import { supabase } from "../../../services/supabase";
import {
  PROFILE_PLACEHOLDER_COLOR,
  profileFormStyles,
} from "./profileFormStyles";

const bloodGroups = ["A+", "A−", "B+", "B−", "O+", "O−", "AB+", "AB−"] as const;
const genders = ["Male", "Female", "Other / Prefer not to say"] as const;
const relations = [
  "Son",
  "Daughter",
  "Father",
  "Mother",
  "Spouse",
  "Sibling",
  "Other",
] as const;

export type ProfileDetails = {
  fullName: string;
  age: number;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  email?: string;
  address?: PatientAddress;
  relation?: string;
  phone?: string;
  notify?: boolean;
  photo?: { uri: string; mimeType: string };
};

export type ProfileFormValues = {
  fullName: string;
  dateOfBirth: string;
  gender: string;
  bloodGroup: string;
  email: string;
  address?: PatientAddress;
  relation: string;
  phone: string;
  notify: boolean;
};

function getInitialFormValues(
  initialProfile?: {
    full_name: string;
    age_years: number | null;
    birth_date?: string | null;
    gender: string | null;
    blood_group: string | null;
    email: string | null;
    contact_phone?: string | null;
    address: PatientAddress | null;
  },
  family = false,
  initialEmail = "",
  initialPhone = ""
): ProfileFormValues {
  return {
    fullName: initialProfile?.full_name ?? "",
    dateOfBirth: initialProfile?.birth_date
      ? formatDisplayDate(initialProfile.birth_date)
      : "",
    gender: initialProfile?.gender ?? "Male",
    bloodGroup: (initialProfile?.blood_group ?? "").replace("-", "−"),
    email: initialProfile?.email ?? (!family ? initialEmail : ""),
    address: initialProfile?.address ?? undefined,
    relation: "Son",
    phone: initialProfile?.contact_phone || (!family ? initialPhone : ""),
    notify: false,
  };
}

function formatProfilePayload(
  values: ProfileFormValues,
  family: boolean
): ProfileDetails {
  const birthDate = parseDisplayDate(values.dateOfBirth)!;
  const years = ageFromBirthDate(birthDate)!;
  return {
    fullName: values.fullName.trim(),
    age: years,
    dateOfBirth: birthDate,
    gender: values.gender,
    bloodGroup: values.bloodGroup.replace("−", "-"),
    email: values.email?.trim() || undefined,
    address: values.address,
    relation: family ? values.relation : undefined,
    phone: values.phone.trim().startsWith("+")
      ? `+${values.phone.replace(/\D/g, "")}`
      : `+91${values.phone.replace(/\D/g, "")}`,
    notify: family ? values.notify : undefined,
  };
}

function ProfileHeader({
  family,
  photoUrl,
  onPickPhoto,
}: {
  family: boolean;
  photoUrl?: string;
  onPickPhoto?: () => void;
}) {
  return (
    <View style={styles.head}>
      <ProfilePhotoButton
        theme="patient"
        source={photoUrl ? { uri: photoUrl } : undefined}
        onPress={onPickPhoto}
      />
      <View style={styles.headText}>
        <Text style={styles.title}>
          {family ? "Family member Profile" : "Your Profile"}
        </Text>
        {
          <Text style={styles.photoHint}>
            Tap the plus button on your profile icon to add a photo.
          </Text>
        }
      </View>
    </View>
  );
}

export function ProfileForm({
  family = false,
  initialEmail = "",
  initialPhone = "",
  initialProfile,
  onSave,
}: {
  family?: boolean;
  initialEmail?: string;
  initialPhone?: string;
  initialProfile?: {
    full_name: string;
    age_years: number | null;
    birth_date?: string | null;
    gender: string | null;
    blood_group: string | null;
    email: string | null;
    contact_phone?: string | null;
    address: PatientAddress | null;
    profile_photo_path?: string | null;
  };
  onSave: (details: ProfileDetails) => Promise<void>;
}) {
  const [submitError, setSubmitError] = useState("");
  const [photo, setPhoto] = useState<ProfileDetails["photo"]>();
  const [photoUrl, setPhotoUrl] = useState<string>();

  useEffect(() => {
    if (!initialProfile?.profile_photo_path || !supabase) return;
    let active = true;
    void supabase.storage
      .from("patient-profile-photos")
      .createSignedUrl(initialProfile.profile_photo_path, 3600)
      .then(({ data }) => {
        if (active && data?.signedUrl) setPhotoUrl(data.signedUrl);
      });
    return () => {
      active = false;
    };
  }, [initialProfile?.profile_photo_path, family]);

  async function pickPhoto() {
    try {
      const permission =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSubmitError("Allow photo access to choose a profile picture.");
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
        setSubmitError("Choose a photo under 5 MB.");
        return;
      }
      if (asset.mimeType !== "image/jpeg" && asset.mimeType !== "image/png") {
        setSubmitError("Choose a JPG or PNG photo.");
        return;
      }
      setPhoto({ uri: asset.uri, mimeType: asset.mimeType });
      setPhotoUrl(asset.uri);
      setSubmitError("");
    } catch {
      setSubmitError("Could not select a photo. Try again.");
    }
  }

  const {
    control,
    handleSubmit,
    setValue,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormValues>({
    defaultValues: getInitialFormValues(
      initialProfile,
      family,
      initialEmail,
      initialPhone
    ),
  });

  useEffect(() => {
    if (initialProfile) {
      reset(
        getInitialFormValues(initialProfile, family, initialEmail, initialPhone)
      );
    } else if (!family && initialEmail) {
      setValue("email", initialEmail);
    }
    if (!initialProfile && !family && initialPhone) {
      setValue("phone", initialPhone);
    }
  }, [initialProfile, initialEmail, initialPhone, family, reset, setValue]);

  const onSubmit = async (values: ProfileFormValues) => {
    setSubmitError("");
    try {
      await onSave({
        ...formatProfilePayload(values, family),
        photo,
      });
    } catch (cause) {
      setSubmitError(
        cause instanceof Error ? cause.message : "Could not save the profile."
      );
    }
  };

  const displayError =
    submitError ||
    errors.fullName?.message ||
    errors.email?.message ||
    errors.dateOfBirth?.message ||
    errors.bloodGroup?.message ||
    errors.phone?.message ||
    errors.address?.message;
  useToastFeedback({ error: displayError });

  return (
    <OnboardingShell
      scroll
      showArt
      bottomArt={false}
      keepArtFixed
      centerContent
      onBack={() => {
        if (router.canGoBack()) router.back();
        else router.replace(initialProfile || family ? "/(app)/(tabs)/profile" : "/login");
      }}
    >
      <View style={styles.body}>
        <ProfileHeader
          family={family}
          photoUrl={photoUrl}
          onPickPhoto={() => void pickPhoto()}
        />

        <Controller
          control={control}
          name="fullName"
          rules={{
            required: "Enter a name, valid date of birth, and blood group.",
            validate: (val) =>
              val.trim().length >= 2 ||
              "Enter a name, valid date of birth, and blood group.",
          }}
          render={({ field: { onChange, onBlur, value } }) => (
            <Input
              label="Full Name"
              invalid={Boolean(errors.fullName)}
              labelStyle={profileFormStyles.label}
              accessibilityLabel="Full name"
              autoComplete="name"
              placeholder="Enter your full name"
              placeholderTextColor={PROFILE_PLACEHOLDER_COLOR}
              value={value}
              onChangeText={(text) => {
                setSubmitError("");
                onChange(text);
              }}
              onBlur={onBlur}
              style={[profileFormStyles.control, profileFormStyles.text]}
            />
          )}
        />

        {!family ? (
          <PersonalAddressFields
            field="email"
            control={control}
            onClearError={() => setSubmitError("")}
          />
        ) : null}

        {!family ? (
          <Controller
            control={control}
            name="phone"
            rules={{
              required: "Enter your phone number.",
              validate: (value) =>
                (value.trim().startsWith("+")
                  ? /^\+[1-9]\d{7,14}$/.test(value.trim())
                  : /^\d{10}$/.test(value.replace(/\D/g, ""))) ||
                "Enter a valid mobile number, including the country code for international numbers.",
            }}
            render={({ field, fieldState }) => (
              <Input
                label="Phone Number"
                labelStyle={profileFormStyles.label}
                containerStyle={styles.sectionLabel}
                invalid={fieldState.invalid}
                keyboardType="phone-pad"
                autoComplete="tel"
                placeholder="+91 mobile number"
                placeholderTextColor={PROFILE_PLACEHOLDER_COLOR}
                value={field.value}
                onChangeText={field.onChange}
                onBlur={field.onBlur}
                style={[profileFormStyles.control, profileFormStyles.text]}
              />
            )}
          />
        ) : null}
        <View style={styles.twoColumns}>
          <View style={styles.ageColumn}>
            <Controller
              control={control}
              name="dateOfBirth"
              rules={{
                required: "Enter your date of birth in DD-MM-YYYY format.",
                validate: (val) => {
                  const birthDate = parseDisplayDate(val);
                  return (
                    (birthDate !== null &&
                      ageFromBirthDate(birthDate) !== null) ||
                    "Enter a valid date of birth in DD-MM-YYYY format."
                  );
                },
              }}
              render={({ field: { onChange, onBlur, value } }) => (
                <Input
                  label="Date of Birth"
                  invalid={Boolean(errors.dateOfBirth)}
                  labelStyle={profileFormStyles.label}
                  accessibilityLabel="Date of birth"
                  keyboardType="numbers-and-punctuation"
                  maxLength={10}
                  placeholder="DD-MM-YYYY"
                  placeholderTextColor={PROFILE_PLACEHOLDER_COLOR}
                  value={value}
                  onChangeText={(text) => {
                    setSubmitError("");
                    onChange(text);
                  }}
                  onBlur={onBlur}
                  style={[profileFormStyles.text, profileFormStyles.control]}
                />
              )}
            />
          </View>

          <View style={styles.genderColumn}>
            <Text style={styles.label}>Gender</Text>
            <Controller
              control={control}
              name="gender"
              render={({ field: { onChange, value } }) => (
                <SelectDropdown
                  label="Gender"
                  value={
                    value === "Other" || value === "Prefer not to say"
                      ? "Other / Prefer not to say"
                      : value
                  }
                  options={genders as unknown as string[]}
                  onChange={(selected) =>
                    onChange(
                      selected === "Other / Prefer not to say"
                        ? "Other"
                        : selected
                    )
                  }
                />
              )}
            />
          </View>
        </View>

        <Text style={[styles.label, styles.sectionLabel]}>Blood Group</Text>
        <Controller
          control={control}
          name="bloodGroup"
          rules={{
            required: "Enter a name, valid date of birth, and blood group.",
            validate: (val) =>
              Boolean(val) ||
              "Enter a name, valid date of birth, and blood group.",
          }}
          render={({ field: { onChange, value } }) => (
            <BloodGroupSelector
              bloodGroups={bloodGroups}
              invalid={Boolean(errors.bloodGroup)}
              value={value}
              onChange={(item) => {
                setSubmitError("");
                onChange(item);
              }}
            />
          )}
        />

        {family ? (
          <FamilyRelationFields
            control={control}
            onClearError={() => setSubmitError("")}
          />
        ) : (
          <PersonalAddressFields
            control={control}
            onClearError={() => setSubmitError("")}
          />
        )}

        <View
          style={[styles.save, family && { flexDirection: "row", gap: 12 }]}
        >
          {family ? (
            <View style={{ flex: 1 }}>
              <Button
                theme="patient"
                style={[
                  onboardingButtonStyles.button,
                  onboardingButtonStyles.outline,
                ]}
                labelStyle={onboardingButtonStyles.outlineLabel}
               
                label="Skip for now"
                variant="outline"
                disabled={isSubmitting}
                onPress={() => router.back()}
              />
            </View>
          ) : null}
          <View style={family ? { flex: 1 } : undefined}>
            <Button loading={isSubmitting}
              theme="patient"
              style={onboardingButtonStyles.button}
              labelStyle={onboardingButtonStyles.label}
           
              label={isSubmitting ? "Saving…" : "Save Profile"}
              disabled={isSubmitting}
              onPress={handleSubmit(onSubmit)}
            />
          </View>
        </View>
        <View style={styles.privacyRow}>
          <LockKeyhole size={16} color={colors.textSecondary} />
          <Text style={styles.privacy}>
            Your Information is secure and private
          </Text>
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: {
    paddingVertical: 24,
    width: "100%",
    maxWidth: 360,
    alignSelf: "center",
  },
  head: {
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    marginBottom: 29,
  },
  headText: { flex: 1 },
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
  label: {
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    color: colors.textPrimary,
    marginLeft: 6,
    marginBottom: 8,
  },
  sectionLabel: { marginTop: 16 },
  input: {
    width: "100%",
    height: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    paddingHorizontal: 18,
    fontFamily: fontFamilies.regular,
    fontSize: 17,
    backgroundColor: colors.white,
  },
  twoColumns: { flexDirection: "row", gap: 18, marginTop: 16 },
  ageColumn: { flex: 1 },
  genderColumn: { flex: 1 },
  select: {
    width: "100%",
    minHeight: 54,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.white,
  },
  selectText: { fontFamily: fontFamilies.regular, fontSize: 17, color: "#777" },
  placeholder: {
    fontFamily: fontFamilies.regular,
    fontSize: 17,
    color: "#777",
    flexShrink: 1,
  },
  selectTextFilled: {
    color: colors.textPrimary,
  },
  options: {
    borderWidth: 1,
    borderColor: "#D1D1D1",
    borderRadius: 10,
    marginTop: 4,
    backgroundColor: colors.white,
  },
  option: { paddingHorizontal: 16, paddingVertical: 11 },
  bloodGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  blood: {
    width: "22%",
    height: 36,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#D1D1D1",
    alignItems: "center",
    justifyContent: "center",
  },
  selectedBlood: {
    backgroundColor: colors.patient.primaryDark,
    borderColor: colors.patient.primaryDark,
  },
  bloodText: { fontFamily: fontFamilies.regular, fontSize: 14 },
  selectedBloodText: { color: colors.white },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 26,
  },
  checkbox: { width: 20, height: 20, backgroundColor: "#D5D7D9" },
  checked: { backgroundColor: colors.patient.primaryDark },
  checkboxText: {
    color: "#777",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  save: { marginTop: 18 },
  privacy: {
    flexShrink: 1,
    textAlign: "center",
    color: "#777",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
  },
  privacyRow: {
    marginTop: 18,
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  error: {
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    marginTop: 12,
  },
  skip: { marginTop: 14, alignItems: "center", padding: 8 },
  skipText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
  },
});
