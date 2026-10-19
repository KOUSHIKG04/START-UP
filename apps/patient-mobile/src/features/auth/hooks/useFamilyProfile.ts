import { uploadPatientProfilePhoto } from "../../../services/profile-photo";
import { router } from "expo-router";
import {
  addMyFamilyProfile,
  updateMyFamilyProfile,
} from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import type { ProfileDetails } from "../types/profile";
import { useCallback, useMemo, useRef } from "react";
import { setStatusBarStyle } from "expo-status-bar";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyFamilyProfiles } from "@startup/data-access";

export function useFamilyProfile() {
  const { memberId } = useLocalSearchParams<{ memberId?: string }>();
  const family = useQuery({
    queryKey: ["my-family-profiles"],
    queryFn: () => listMyFamilyProfiles(supabase!),
    enabled: Boolean(memberId && supabase),
  });
  const member = family.data?.find(
    (item) => item.id === memberId && item.can_edit
  );
  const initialProfile = useMemo(
    () =>
      member
        ? {
            full_name: member.full_name,
            age_years: member.age_years,
            birth_date: member.birth_date,
            gender: member.gender,
            blood_group: member.blood_group,
            email: null,
            contact_phone: member.phone,
            address: null,
            profile_photo_path: member.profile_photo_path,
            relation: member.relation,
            notify: member.notify,
          }
        : undefined,
    [member]
  );
  useFocusEffect(
    useCallback(() => {
      setStatusBarStyle("dark");
    }, [])
  );
  const uploaded = useRef<{ uri: string; path: string } | undefined>(undefined);
  const queryClient = useQueryClient();

  const saveFamilyProfile = async (details: ProfileDetails) => {
    if (!supabase || !details.relation || !details.phone) {
      throw new Error("Family profile is incomplete.");
    }
    if (details.photo && uploaded.current?.uri !== details.photo.uri) {
      const path = await uploadPatientProfilePhoto(details.photo);
      if (path) uploaded.current = { uri: details.photo.uri, path };
    }
    const detailsToSave = {
      fullName: details.fullName,
      age: details.age,
      dateOfBirth: details.dateOfBirth,
      gender: details.gender as
        "Male" | "Female" | "Other" | "Prefer not to say",
      bloodGroup: details.bloodGroup as
        "A+" | "A-" | "B+" | "B-" | "O+" | "O-" | "AB+" | "AB-",
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
      profilePhotoPath: uploaded.current?.path,
    };
    if (memberId)
      await updateMyFamilyProfile(supabase, memberId, detailsToSave);
    else await addMyFamilyProfile(supabase, detailsToSave);
    await queryClient.invalidateQueries({
      queryKey: ["my-family-profiles"],
    });
    router.back();
  };
  return {
    memberId,
    family,
    member,
    initialProfile,
    uploaded,
    queryClient,
    saveFamilyProfile,
  };
}
