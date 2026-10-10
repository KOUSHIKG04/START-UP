import { PersonalAddressField, emptyPersonalAddress } from "../components/PersonalAddressField";
import { doctorPersonalAddressInputSchema, type DoctorPersonalAddressInput } from "@startup/contracts";
import { getMyDoctorPersonalAddress } from "@startup/data-access";
import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Input, Skeleton, useToast } from "@startup/mobile-ui";
import { doctorLanguageCode, doctorLanguageName, doctorQualificationSchema } from "@startup/contracts";
import { getMyDoctorProfile, submitMyDoctorQualification, updateMyDoctorProfile } from "@startup/data-access";
import { DoctorScreen, Label, Panel } from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";
import { mobileSession, supabase, useMobileSession } from "../../../services/supabase";

export function EditProfileScreen() {
  const client = useQueryClient();
  const { showToast } = useToast();
  const { profile: sessionProfile } = useMobileSession();
  const profile = useQuery({
    queryKey: ["my-doctor-profile", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  const addressQuery = useQuery({
    queryKey: ["my-doctor-personal-address", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorPersonalAddress(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  const [personalAddress, setPersonalAddress] = useState<DoctorPersonalAddressInput>(emptyPersonalAddress);
  const [addressInitialized, setAddressInitialized] = useState(false);
  useEffect(() => {
    if (!addressQuery.isSuccess || addressInitialized) return;
    const a = addressQuery.data;
    if (a) setPersonalAddress({ ...emptyPersonalAddress, building: a.building ?? "", street: a.street ?? "", locality: a.locality ?? "", city: a.city ?? "", state: a.state ?? "", pincode: a.pincode ?? "", latitude: a.latitude, longitude: a.longitude });
    setAddressInitialized(true);
  }, [addressQuery.isSuccess, addressQuery.data, addressInitialized]);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [qualification, setQualification] = useState("");
  const [languages, setLanguages] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  useToastFeedback({ error });

  useEffect(() => {
    if (!profile.data || initialized) return;
    setName(profile.data.full_name);
    setBio(profile.data.bio ?? "");
    setQualification(profile.data.qualification_claim ?? profile.data.qualification ?? "");
    setLanguages(profile.data.languages.map(doctorLanguageName).join(", "));
    setInitialized(true);
  }, [profile.data, initialized]);

  const save = useMutation({
    mutationFn: () => updateMyDoctorProfile(supabase!, {
      personalAddress,
      fullName: name.trim(),
      bio: bio.trim(),
      languages: Array.from(new Set(languages.split(",").map(doctorLanguageCode).filter(Boolean))),
    }),
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["my-doctor-profile"] }),
        client.invalidateQueries({ queryKey: ["my-doctor-personal-address"] }),
        client.invalidateQueries({ queryKey: ["my-doctor-locations"] }),
      ]);
      await mobileSession.refresh();
      showToast({ title: "Profile saved", type: "success" });
      if (router.canGoBack()) router.back();
      else router.replace("/profile");
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not save profile."),
  });
  const submitQualification = useMutation({
    mutationFn: () => submitMyDoctorQualification(supabase!, doctorQualificationSchema.parse(qualification)),
    onSuccess: async () => {
      setError("");
      await client.invalidateQueries({ queryKey: ["my-doctor-profile"] });
      showToast({ title: "Qualifications sent for review", message: "Company Admin will compare them with your degree certificate.", type: "success" });
    },
    onError: (cause) => showToast({
      title: "Qualifications not submitted",
      message: cause instanceof Error ? cause.message : "Please try again.",
      type: "error",
    }),
  });

  return (
    <DoctorScreen title="Edit profile" background="#F5F5F5" bottomNav={false}>
      <Panel>
        {profile.isLoading ? <Skeleton theme="doctor" height={120} radius={12} /> : null}
        {profile.error ? <Label style={ui.error}>{profile.error.message}</Label> : null}
        {!profile.isLoading && !profile.error && !profile.data ? <Label muted>Complete your doctor profile before editing it.</Label> : null}
        {initialized ? <>
          <Input label="Full name" value={name} onChangeText={setName} />
          {addressQuery.isError ? <Button theme="doctor" label="Retry loading address" onPress={() => { void addressQuery.refetch(); }} /> : addressInitialized ? <PersonalAddressField value={personalAddress} onChange={setPersonalAddress} /> : <Skeleton theme="doctor" height={54} radius={12} />}
          <Input label="About" value={bio} onChangeText={setBio} multiline />
          <Input label="Qualifications" value={qualification} onChangeText={setQualification} placeholder="e.g. MBBS, MD" maxLength={160} />
          <Label muted>Approved qualifications: {profile.data?.qualification ?? "Not verified yet"}</Label>
          {qualification.trim() !== (profile.data?.qualification_claim ?? profile.data?.qualification ?? "") ? <Button loading={submitQualification.isPending} theme="doctor" label={submitQualification.isPending ? "Submitting…" : "Submit qualifications for review"} disabled={submitQualification.isPending || !doctorQualificationSchema.safeParse(qualification).success} onPress={() => { setError(""); submitQualification.mutate(); }} /> : null}
          <Input label="Languages (separated by commas)" value={languages} onChangeText={setLanguages} placeholder="English, Hindi, Kannada" />
          <View style={ui.wrap}>
            {Array.from(new Set(languages.split(",").map(doctorLanguageName).filter(Boolean))).map(language => (
              <Chip key={language} label={language} theme="doctor" />
            ))}
          </View>
          <Button loading={save.isPending} theme="doctor" label={save.isPending ? "Saving…" : "Save profile"} disabled={save.isPending || !addressInitialized} onPress={() => { setError(""); if (!doctorPersonalAddressInputSchema.safeParse(personalAddress).success) { showToast({ title: "Complete your personal address", message: "Enter the building, locality, city, state and pincode.", type: "error" }); return; } save.mutate(); }} />
        </> : null}
      </Panel>
    </DoctorScreen>
  );
}
