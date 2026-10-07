import { Text, View } from "react-native";
import { Loader } from "@startup/mobile-ui";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { formatDisplayDate, parseDisplayDate } from "@startup/contracts";
import {
  getMyDriverProfile,
  updateMyDriverProfile,
} from "@startup/data-access";
import {
  DetailsScreen,
  type DriverProfile,
} from "../../features/auth/screens/RegistrationScreens";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../services/supabase";

function toBirthDate(value: string): string {
  const iso = parseDisplayDate(value);
  if (!iso) throw new Error("Enter the date of birth as DD-MM-YYYY.");
  return iso;
}

export default function EditDriverProfile() {
  const { session } = useMobileSession();
  const queryClient = useQueryClient();
  const current = useQuery({
    queryKey: ["my-driver-profile"],
    queryFn: () => getMyDriverProfile(supabase!),
    enabled: Boolean(supabase && session),
  });
  if (current.isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Loader theme="driver" size="large" />
      </View>
    );
  if (current.error || !current.data)
    return (
      <View style={{ padding: 24 }}>
        <Text accessibilityRole="alert">
          Could not load your driver profile.
        </Text>
      </View>
    );
  const saved = current.data;
  const profile: DriverProfile = {
    name: saved.full_name,
    mobile: saved.contact_phone ?? "",
    dob: saved.date_of_birth ? formatDisplayDate(saved.date_of_birth) : "",
    city: saved.city ?? "",
  };
  async function save(value: DriverProfile) {
    if (!supabase || !session) throw new Error("Sign in to continue.");
    let photoPath = saved.profile_photo_path ?? undefined;
    if (value.photo?.startsWith("file:")) {
      const isPng = value.photo.toLowerCase().endsWith(".png");
      const path = `${session.user.id}/profile/${Crypto.randomUUID()}.${isPng ? "png" : "jpg"}`;
      const bytes = await new File(value.photo).arrayBuffer();
      const upload = await supabase.storage
        .from("driver-evidence")
        .upload(path, bytes, {
          contentType: isPng ? "image/png" : "image/jpeg",
          upsert: false,
        });
      if (upload.error) throw upload.error;
      photoPath = path;
    }
    const enteredPhone = value.mobile.replace(/[\s()-]/g, "");
    await updateMyDriverProfile(supabase, {
      fullName: value.name.trim(),
      contactPhone: enteredPhone.startsWith("+")
        ? enteredPhone
        : `+91${enteredPhone}`,
      dateOfBirth: toBirthDate(value.dob),
      city: value.city.trim(),
      profilePhotoPath: photoPath,
      consent: true,
    });
    await Promise.all([
      mobileSession.refresh(),
      queryClient.invalidateQueries({ queryKey: ["my-driver-profile"] }),
    ]);
    router.back();
  }
  return (
    <DetailsScreen
      key={saved.id}
      profile={profile}
      initialConsent={Boolean(saved.verification_consent_at)}
      onBack={() => router.back()}
      onSave={save}
    />
  );
}
