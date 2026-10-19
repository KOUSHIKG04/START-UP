import { useFamilyProfile } from "../hooks/useFamilyProfile";
import { AppText as Text } from "@startup/mobile-ui";

import { Loader } from "@startup/mobile-ui";
import { View } from "react-native";
import { ProfileForm } from "../components/ProfileForm";

export default function FamilyProfileScreen() {
  const {
    memberId,
    family,
    member,
    initialProfile,
    uploaded,
    queryClient,
    saveFamilyProfile,
  } = useFamilyProfile();
  if (memberId && family.isLoading)
    return (
      <View style={{ flex: 1, justifyContent: "center" }}>
        <Loader theme="patient" />
      </View>
    );
  if (memberId && !member)
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text variant="body">
          {family.isError
            ? "Could not load family profile. Go back and retry."
            : "This family profile cannot be edited."}
        </Text>
      </View>
    );
  return (
    <ProfileForm
      family
      initialProfile={initialProfile}
      onSave={saveFamilyProfile}
    />
  );
}
