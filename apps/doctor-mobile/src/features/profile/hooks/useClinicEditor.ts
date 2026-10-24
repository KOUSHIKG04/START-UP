import { useEffect, useState } from "react";
import { router, useLocalSearchParams } from "expo-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import { ownedClinicLocationSchema } from "@startup/contracts";
import {
  getMyDoctorProfile,
  updateMyOwnedClinicLocation,
} from "@startup/data-access";
import { supabase, useMobileSession } from "../../../services/supabase";
import { useClinicLocationDraft } from "../../locations/stores/clinicLocationDraft";

export function useClinicEditor() {
  const { facilityId } = useLocalSearchParams<{ facilityId: string }>();
  const { profile: sessionProfile } = useMobileSession();
  const { showToast } = useToast();
  const client = useQueryClient();
  const profile = useQuery({
    queryKey: ["my-doctor-profile", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  const clinic = profile.data?.facilities.find(
    (item) => item.facility_id === facilityId && item.can_edit_clinic
  );
  const [draft, setDraft] = useState({
    name: "",
    address: "",
    locality: "",
    city: "",
    state: "",
    pincode: "",
    latitude: null as number | null,
    longitude: null as number | null,
  });
  const [initialized, setInitialized] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const chosen = useClinicLocationDraft((s) => s.chosen);
  const clear = useClinicLocationDraft((s) => s.clear);
  useEffect(() => {
    if (!clinic || initialized) return;
    // Registration stores the exact structured suffix in the display address.
    // Strip only that known suffix; never guess address parts for legacy rows.
    const suffix = [clinic.locality, clinic.city, clinic.state, clinic.pincode]
      .filter(Boolean)
      .join(", ");
    const street =
      suffix && clinic.address.endsWith(`, ${suffix}`)
        ? clinic.address.slice(0, -(suffix.length + 2))
        : clinic.address;
    setDraft({
      name: clinic.facility_name,
      address: street,
      locality: clinic.locality ?? "",
      city: clinic.city ?? "",
      state: clinic.state ?? "",
      pincode: clinic.pincode ?? "",
      latitude: clinic.latitude ?? null,
      longitude: clinic.longitude ?? null,
    });
    setInitialized(true);
  }, [clinic, initialized]);
  useEffect(() => {
    if (!chosen) return;
    setDraft((previous) => ({
      ...previous,
      latitude: chosen.latitude,
      longitude: chosen.longitude,
      address: chosen.street || previous.address,
      locality: chosen.locality || previous.locality,
      city: chosen.city || previous.city,
      state: chosen.state || previous.state,
      pincode: chosen.pincode || previous.pincode,
    }));
    clear();
  }, [chosen, clear]);
  const parsed = ownedClinicLocationSchema.safeParse({ facilityId, ...draft });
  const invalid = new Set(
    parsed.success
      ? []
      : parsed.error.issues.map((issue) => String(issue.path[0]))
  );
  const save = useMutation({
    mutationFn: async () => {
      if (!clinic?.can_edit_clinic)
        throw new Error("Only the clinic owner can edit this location.");
      const location = ownedClinicLocationSchema.parse({
        facilityId,
        ...draft,
        address: [
          draft.address,
          draft.locality,
          draft.city,
          draft.state,
          draft.pincode,
        ]
          .map((part) => part.trim())
          .join(", "),
      });
      return updateMyOwnedClinicLocation(supabase!, location);
    },
    onSuccess: async () => {
      await Promise.all([
        client.invalidateQueries({ queryKey: ["my-doctor-profile"] }),
        client.invalidateQueries({ queryKey: ["my-practices"] }),
      ]);
      showToast({ title: "Clinic details saved", type: "success" });
      router.back();
    },
    onError: (error) =>
      showToast({
        title: "Could not save clinic",
        message: error.message,
        type: "error",
      }),
  });
  useToastFeedback({
    error: profile.isError ? "Could not load clinic details." : "",
  });

  return {
    showToast,
    profile,
    clinic,
    draft,
    setDraft,
    attempted,
    setAttempted,
    clear,
    parsed,
    invalid,
    save,
  };
}
