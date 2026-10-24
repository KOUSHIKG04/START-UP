import { emptyPersonalAddress } from "../utils/personalAddressConstants";
import { type DoctorPersonalAddressInput } from "@startup/contracts";
import { getMyDoctorPersonalAddress } from "@startup/data-access";
import { useToastFeedback } from "@startup/mobile-ui";
import { useEffect, useState } from "react";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@startup/mobile-ui";
import {
  doctorLanguageCode,
  doctorLanguageName,
  doctorQualificationSchema,
} from "@startup/contracts";
import {
  getMyDoctorProfile,
  submitMyDoctorQualification,
  updateMyDoctorProfile,
} from "@startup/data-access";
import {
  mobileSession,
  supabase,
  useMobileSession,
} from "../../../services/supabase";

export function useDoctorProfileEditor() {
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
  const [personalAddress, setPersonalAddress] =
    useState<DoctorPersonalAddressInput>(emptyPersonalAddress);
  const [addressInitialized, setAddressInitialized] = useState(false);
  useEffect(() => {
    if (!addressQuery.isSuccess || addressInitialized) return;
    const a = addressQuery.data;
    if (a)
      setPersonalAddress({
        ...emptyPersonalAddress,
        building: a.building ?? "",
        street: a.street ?? "",
        locality: a.locality ?? "",
        city: a.city ?? "",
        state: a.state ?? "",
        pincode: a.pincode ?? "",
        latitude: a.latitude,
        longitude: a.longitude,
      });
    setAddressInitialized(true);
  }, [addressQuery.isSuccess, addressQuery.data, addressInitialized]);
  const [name, setName] = useState("");
  const [bio, setBio] = useState("");
  const [qualification, setQualification] = useState("");
  const [languages, setLanguages] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState("");
  const ownedClinics =
    profile.data?.facilities.filter(
      (f) => f.active && f.facility_kind === "clinic" && f.can_edit_clinic
    ) ?? [];
  const clinic = ownedClinics.length === 1 ? ownedClinics[0] : undefined;
  useToastFeedback({ error });

  useEffect(() => {
    if (!profile.data || initialized) return;
    setName(profile.data.full_name);
    setBio(profile.data.bio ?? "");
    setQualification(
      profile.data.qualification_claim ?? profile.data.qualification ?? ""
    );
    setLanguages(profile.data.languages.map(doctorLanguageName).join(", "));
    setInitialized(true);
  }, [profile.data, initialized]);

  const save = useMutation({
    mutationFn: () =>
      updateMyDoctorProfile(supabase!, {
        personalAddress,
        fullName: name.trim(),
        bio: bio.trim(),
        languages: Array.from(
          new Set(languages.split(",").map(doctorLanguageCode).filter(Boolean))
        ),
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
    onError: (cause) =>
      setError(
        cause instanceof Error ? cause.message : "Could not save profile."
      ),
  });
  const submitQualification = useMutation({
    mutationFn: () =>
      submitMyDoctorQualification(
        supabase!,
        doctorQualificationSchema.parse(qualification)
      ),
    onSuccess: async () => {
      setError("");
      await client.invalidateQueries({ queryKey: ["my-doctor-profile"] });
      showToast({
        title: "Qualifications sent for review",
        message:
          "Company Admin will compare them with your degree certificate.",
        type: "success",
      });
    },
    onError: (cause) =>
      showToast({
        title: "Qualifications not submitted",
        message: cause instanceof Error ? cause.message : "Please try again.",
        type: "error",
      }),
  });

  return {
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
  };
}
