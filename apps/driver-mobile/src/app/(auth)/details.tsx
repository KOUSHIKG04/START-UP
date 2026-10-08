import { View } from "react-native";
import { Loader } from "@startup/mobile-ui";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import { File } from "expo-file-system";
import { formatDisplayDate, parseDisplayDate } from "@startup/contracts";
import {
  getMyDriverRegistrationApplication,
  saveMyDriverRegistrationDetails,
} from "@startup/data-access";
import {
  DetailsScreen,
  type DriverProfile,
} from "../../features/auth/screens/RegistrationScreens";
import { supabase, useMobileSession } from "../../services/supabase";

function toBirthDate(value: string): string {
  const iso = parseDisplayDate(value);
  if (!iso) throw new Error("Enter the date of birth as DD-MM-YYYY.");
  return iso;
}

export default function DetailsRoute() {
  const { session } = useMobileSession();
  const queryClient = useQueryClient();
  const application = useQuery({
    queryKey: ["driver-registration-application"],
    queryFn: () => getMyDriverRegistrationApplication(supabase!),
    enabled: Boolean(supabase && session),
  });

  if (application.isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Loader theme="driver" size="large" />
      </View>
    );

  const saved = application.data;
  const profile: DriverProfile = {
    name: saved?.full_name ?? "",
    mobile: saved?.contact_phone ?? session?.user.phone ?? "",
    dob: saved?.date_of_birth ? formatDisplayDate(saved.date_of_birth) : "",
    city: saved?.city ?? "",
  };

  async function save(value: DriverProfile) {
    
    if (!supabase || !session) throw new Error("Sign in to continue.");
    
    let photoPath: string | undefined = saved?.profile_photo_path ?? undefined;
    
    if (value.photo?.startsWith("file:")) {
      const isPng = value.photoMimeType === "image/png" || (!value.photoMimeType && value.photo.toLowerCase().endsWith(".png"));
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
    const contactPhone = enteredPhone.startsWith("+")
      ? enteredPhone
      : `+91${enteredPhone}`;

    await saveMyDriverRegistrationDetails(supabase, {
      fullName: value.name.trim(),
      contactPhone,
      dateOfBirth: toBirthDate(value.dob),
      city: value.city.trim(),
      profilePhotoPath: photoPath,
      consent: true,
    });
    
    await queryClient.invalidateQueries({
      queryKey: ["driver-registration-application"],
    });
    router.push("/documents");
  }
  return (
    <DetailsScreen
      key={saved?.id ?? "new"}
      profile={profile}
      onBack={() => router.back()}
      onSave={save}
    />
  );
}
