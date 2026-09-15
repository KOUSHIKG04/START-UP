import { router, useLocalSearchParams } from "expo-router";
import { DetailsScreen } from "../screens/registration/RegistrationScreens";
import { useDriver } from "../store/driver";
export default function DetailsRoute() {
  const d = useDriver();
  const { edit } = useLocalSearchParams();
  return (
    <DetailsScreen
      profile={d.profile}
      onBack={() => router.back()}
      onSave={(profile) => {
        d.saveProfile(profile);
        if (edit) router.back();
        else router.push("/documents");
      }}
    />
  );
}
