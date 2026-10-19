import { useDoctorProfileEditor } from "../hooks/useDoctorProfileEditor";
import { PersonalAddressField } from "../components/PersonalAddressField";
import { emptyPersonalAddress } from "../utils/personalAddressConstants";
import { doctorPersonalAddressInputSchema } from "@startup/contracts";

import { View } from "react-native";

import { Button, Chip, Input, Skeleton } from "@startup/mobile-ui";
import {
  doctorLanguageName,
  doctorQualificationSchema,
} from "@startup/contracts";

import { DoctorScreen, Label, Panel } from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";

export function EditProfileScreen() {
  const {
    showToast,
    profile,
    addressQuery,
    personalAddress,
    setPersonalAddress,
    addressInitialized,
    name,
    setName,
    bio,
    setBio,
    qualification,
    setQualification,
    languages,
    setLanguages,
    initialized,
    error,
    setError,
    clinic,
    save,
    submitQualification,
  } = useDoctorProfileEditor();
  return (
    <DoctorScreen title="Edit profile" bottomNav={false}>
      <Panel>
        {profile.isLoading ? (
          <Skeleton theme="doctor" height={120} radius={12} />
        ) : null}
        {profile.error ? (
          <Label style={ui.error}>{profile.error.message}</Label>
        ) : null}
        {!profile.isLoading && !profile.error && !profile.data ? (
          <Label muted>Complete your doctor profile before editing it.</Label>
        ) : null}
        {initialized ? (
          <>
            <Input label="Full name" value={name} onChangeText={setName} />
            {addressQuery.isError ? (
              <Button
                theme="doctor"
                label="Retry loading address"
                onPress={() => {
                  void addressQuery.refetch();
                }}
              />
            ) : addressInitialized ? (
              <PersonalAddressField
                value={personalAddress}
                onChange={setPersonalAddress}
                clinicAddress={
                  clinic
                    ? {
                        ...emptyPersonalAddress,
                        building: clinic.address.slice(0, 160),
                        street: clinic.address.slice(160, 360),
                        instructions: clinic.address.slice(360),
                        locality: clinic.locality ?? "",
                        city: clinic.city ?? "",
                        state: clinic.state ?? "",
                        pincode: clinic.pincode ?? "",
                        latitude: clinic.latitude ?? null,
                        longitude: clinic.longitude ?? null,
                      }
                    : undefined
                }
              />
            ) : (
              <Skeleton theme="doctor" height={54} radius={12} />
            )}
            <Input label="About" value={bio} onChangeText={setBio} multiline />
            <Input
              label="Qualifications"
              value={qualification}
              onChangeText={setQualification}
              placeholder="e.g. MBBS, MD"
              maxLength={160}
            />
            <Label muted>
              Approved qualifications:{" "}
              {profile.data?.qualification ?? "Not verified yet"}
            </Label>
            {qualification.trim() !==
            (profile.data?.qualification_claim ??
              profile.data?.qualification ??
              "") ? (
              <Button
                loading={submitQualification.isPending}
                theme="doctor"
                label={
                  submitQualification.isPending
                    ? "Submitting…"
                    : "Submit qualifications for review"
                }
                disabled={
                  submitQualification.isPending ||
                  !doctorQualificationSchema.safeParse(qualification).success
                }
                onPress={() => {
                  setError("");
                  submitQualification.mutate();
                }}
              />
            ) : null}
            <Input
              label="Languages (separated by commas)"
              value={languages}
              onChangeText={setLanguages}
              placeholder="English, Hindi, Kannada"
            />
            <View style={ui.wrap}>
              {Array.from(
                new Set(
                  languages.split(",").map(doctorLanguageName).filter(Boolean)
                )
              ).map((language) => (
                <Chip key={language} label={language} theme="doctor" />
              ))}
            </View>
            <Button
              loading={save.isPending}
              theme="doctor"
              label={save.isPending ? "Saving…" : "Save profile"}
              disabled={save.isPending || !addressInitialized}
              onPress={() => {
                setError("");
                if (
                  !doctorPersonalAddressInputSchema.safeParse(personalAddress)
                    .success
                ) {
                  showToast({
                    title: "Complete your personal address",
                    message:
                      "Enter the building, locality, city, state and pincode.",
                    type: "error",
                  });
                  return;
                }
                save.mutate();
              }}
            />
          </>
        ) : null}
      </Panel>
    </DoctorScreen>
  );
}
