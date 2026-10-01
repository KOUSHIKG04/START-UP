import { router } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { addMyFamilyProfile } from "@startup/data-access";
import { ProfileForm } from "../components/ProfileForm";
import { supabase } from "../../../services/supabase";

export default function FamilyProfileScreen() {
  const queryClient = useQueryClient();

  return (
    <ProfileForm
      family
      onSave={async (details) => {
        if (!supabase || !details.relation || !details.phone) {
          throw new Error("Family profile is incomplete.");
        }
        await addMyFamilyProfile(supabase, {
          fullName: details.fullName,
          age: details.age,
          gender: details.gender as
            | "Male"
            | "Female"
            | "Other"
            | "Prefer not to say",
          bloodGroup: details.bloodGroup as
            | "A+"
            | "A-"
            | "B+"
            | "B-"
            | "O+"
            | "O-"
            | "AB+"
            | "AB-",
          relation: details.relation as
            | "Son"
            | "Daughter"
            | "Father"
            | "Mother"
            | "Spouse"
            | "Sibling"
            | "Other",
          phone: details.phone,
          notify: Boolean(details.notify),
        });
        await queryClient.invalidateQueries({
          queryKey: ["my-family-profiles"],
        });
        router.back();
      }}
    />
  );
}
