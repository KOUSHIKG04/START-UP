import { useState } from "react";
import { router } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import {
  getMyDoctorProfile,
  getMyVerificationCase,
  listRegisteredCareFacilities,
  listMyDoctorFacilityRequests,
  requestMyDoctorFacility,
  respondToMyFacilityInvitation,
} from "@startup/data-access";
import { supabase, useMobileSession } from "../../../services/supabase";
import { setSelectedPracticeId } from "../../practices/services/selectedPractice";
import { selectedPracticeQueryKey } from "../../practices/utils/practiceQueryKeys";

export function useHospitalSettings() {
  const { showToast } = useToast();
  const client = useQueryClient();
  const { profile: sessionProfile } = useMobileSession();
  const profile = useQuery({
    queryKey: ["my-doctor-profile", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });

  const registeredFacilities = useQuery({
    queryKey: ["registered-care-facilities"],
    queryFn: () => listRegisteredCareFacilities(supabase!),
    enabled: Boolean(supabase),
  });

  const associationRequests = useQuery({
    queryKey: ["my-doctor-facility-requests"],
    queryFn: () => listMyDoctorFacilityRequests(supabase!),
    enabled: Boolean(supabase),
  });

  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const requestFacility = useMutation({
    mutationFn: () => requestMyDoctorFacility(supabase!, selectedFacilityId),
    onSuccess: async () => {
      showToast({ title: "Request sent to the facility", type: "success" });
      await client.invalidateQueries({
        queryKey: ["my-doctor-facility-requests"],
      });
    },
    onError: (error) =>
      showToast({
        title: "Action failed",
        message: error.message,
        type: "error",
      }),
  });

  const respondInvitation = useMutation({
    mutationFn: ({ id, accept }: { id: string; accept: boolean }) =>
      respondToMyFacilityInvitation(supabase!, id, accept),
    onSuccess: async () => {
      showToast({ title: "Invitation response saved", type: "success" });
      await Promise.all([
        client.invalidateQueries({ queryKey: ["my-doctor-facility-requests"] }),
        client.invalidateQueries({ queryKey: ["my-doctor-profile"] }),
        client.invalidateQueries({ queryKey: ["my-practices"] }),
      ]);
    },
    onError: (error) =>
      showToast({
        title: "Action failed",
        message: error.message,
        type: "error",
      }),
  });

  useToastFeedback({
    error:
      profile.isError ||
      registeredFacilities.isError ||
      associationRequests.isError
        ? "Could not load hospital settings. Please try again."
        : "",
  });
  const verification = useQuery({
    queryKey: ["doctor-verification", sessionProfile?.doctor?.id],
    queryFn: () =>
      getMyVerificationCase(supabase!, "doctor", sessionProfile!.doctor!.id),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });

  const [openingPractice, setOpeningPractice] = useState<string | null>(null);
  async function manageSchedule(practiceId: string) {
    if (!sessionProfile?.doctor?.id || openingPractice) return;
    setOpeningPractice(practiceId);
    try {
      await setSelectedPracticeId(sessionProfile.doctor.id, practiceId);
      client.setQueryData(
        selectedPracticeQueryKey(sessionProfile.doctor.id),
        practiceId
      );
      router.push("/schedule");
    } catch (error) {
      showToast({
        title: "Could not open practice schedule",
        message: error instanceof Error ? error.message : "Try again.",
        type: "error",
      });
    } finally {
      setOpeningPractice(null);
    }
  }

  const active = profile.data?.facilities.filter((item) => item.active) ?? [];

  const available =
    registeredFacilities.data?.filter(
      (item) =>
        !active.some((practice) => practice.facility_id === item.id) &&
        !associationRequests.data?.some(
          (request) =>
            request.facility_id === item.id && request.status === "pending"
        )
    ) ?? [];
  const clinicLicence = verification.data?.documents.find(
    (item) => item.kind === "clinic_operating_licence"
  );

  return {
    profile,
    registeredFacilities,
    associationRequests,
    selectedFacilityId,
    setSelectedFacilityId,
    requestFacility,
    respondInvitation,
    openingPractice,
    manageSchedule,
    active,
    available,
    clinicLicence,
  };
}
