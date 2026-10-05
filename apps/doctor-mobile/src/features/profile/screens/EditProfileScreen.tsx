import { useEffect, useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button, Chip, Input } from "@startup/mobile-ui";
import { doctorLanguageCode, doctorLanguageName } from "@startup/contracts";
import { getMyDoctorProfile, updateMyDoctorProfile } from "@startup/data-access";
import { DoctorScreen, Label, Panel } from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";
import { mobileSession, supabase, useMobileSession } from "../../../services/supabase";

export function EditProfileScreen() {
  const client = useQueryClient();
  const { profile: sessionProfile } = useMobileSession();
  const profile = useQuery({
    queryKey: ["my-doctor-profile", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [languages, setLanguages] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!profile.data || initialized) return;
    setName(profile.data.full_name);
    setBio(profile.data.bio ?? "");
    setLanguages(profile.data.languages.map(doctorLanguageName).join(", "));
    setInitialized(true);
  }, [profile.data, initialized]);

  const save = useMutation({
    mutationFn: () => updateMyDoctorProfile(supabase!, {
      fullName: name.trim(),
      bio: bio.trim(),
      languages: Array.from(new Set(languages.split(",").map(doctorLanguageCode).filter(Boolean))),
    }),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["my-doctor-profile"] });
      await mobileSession.refresh();
      if (router.canGoBack()) router.back();
      else router.replace("/profile");
    },
    onError: (cause) => setError(cause instanceof Error ? cause.message : "Could not save profile."),
  });

  return (
    <DoctorScreen title="Edit profile" background="#F5F5F5" bottomNav={false}>
      <Panel>
        {profile.isLoading ? <Label muted>Loading profile…</Label> : null}
        {profile.error ? <Label style={ui.error}>{profile.error.message}</Label> : null}
        {!profile.isLoading && !profile.error && !profile.data ? <Label muted>Complete your doctor profile before editing it.</Label> : null}
        {initialized ? <>
          <Input label="Full name" value={name} onChangeText={setName} />
          <Input label="About" value={bio} onChangeText={setBio} multiline />
          <Input label="Languages (separated by commas)" value={languages} onChangeText={setLanguages} placeholder="English, Hindi, Kannada" />
          <View style={ui.wrap}>
            {Array.from(new Set(languages.split(",").map(doctorLanguageName).filter(Boolean))).map(language => (
              <Chip key={language} label={language} theme="doctor" />
            ))}
          </View>
          <Button theme="doctor" label={save.isPending ? "Saving…" : "Save profile"} disabled={save.isPending} onPress={() => { setError(""); save.mutate(); }} />
          {error ? <Label style={ui.error}>{error}</Label> : null}
        </> : null}
      </Panel>
    </DoctorScreen>
  );
}
