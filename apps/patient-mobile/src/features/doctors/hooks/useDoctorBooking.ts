import { useCallback, useEffect, useState } from "react";
import { router, useFocusEffect, type Href } from "expo-router";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bookClinicAppointment,
  getMyPatientProfileDetail,
  getPublicPracticeBio,
  listClinicAppointments,
  listMyFamilyProfiles,
  listMyPatientLocations,
  listPracticeClinicSlots,
  listPublicDoctorPractices,
} from "@startup/data-access";
import { useToast, useToastFeedback } from "@startup/mobile-ui";
import type { ProfileTab } from "../types/booking-calendar";
import type { ConsultationType } from "../../appointments/types/appointment";
import { supabase, useMobileSession } from "../../../services/supabase";
import { formatSavedLocation } from "../../locations/utils/locationDisplay";
import type { SavedPatientLocation } from "@startup/contracts";

export function useDoctorBooking({
  practiceId: initialPracticeId,
  serviceId,
  consultationType,
}: {
  practiceId: string;
  serviceId: string;
  consultationType: string;
}) {
  const [selectedPracticeId, setSelectedPracticeId] =
    useState(initialPracticeId);
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
  const [overrideConsultationType, setOverrideConsultationType] =
    useState<ConsultationType | null>(null);
  const selectedConsultationType =
    overrideConsultationType ?? (consultationType as ConsultationType);
  const isOnline = selectedConsultationType === "Online";
  const serviceMode = isOnline
    ? "online"
    : selectedConsultationType === "Home Visit"
      ? "home"
      : "clinic";
  const [addressDraft, setAddressDraft] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() =>
    Crypto.randomUUID()
  );
  const [confirmation, setConfirmation] = useState<{
    patientId: string;
    windowId: string;
    reason: string;
    practiceId: string;
    mode: string;
    doctor: string;
    facility: string;
    address: string;
    startsAt: string;
    timezone: string;
    fee: string;
  } | null>(null);
  const [openingConfirmation, setOpeningConfirmation] = useState(false);
  const [coordinates, setCoordinates] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const savedLocations = useQuery({
    queryKey: ["my-patient-locations", profile?.patient_id],
    queryFn: () => listMyPatientLocations(supabase!),
    enabled: Boolean(supabase && profile?.patient_id && !isOnline),
  });
  const selectedLocation = savedLocations.data?.find(
    (item: SavedPatientLocation) => item.selected
  );

  useEffect(() => {
    if (isOnline) return;
    if (savedLocations.isLoading) return;
    if (
      selectedLocation?.latitude != null &&
      selectedLocation.longitude != null
    ) {
      if (
        coordinates?.latitude !== selectedLocation.latitude ||
        coordinates?.longitude !== selectedLocation.longitude
      ) {
        setCoordinates({
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        });
      }
      return;
    }
    if (coordinates) return;
    let active = true;

    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (active)
          setCoordinates({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
      } catch {
        /* Doctor details remain available when location cannot be read. */
      }
    })();
    return () => {
      active = false;
    };
  }, [
    coordinates,
    isOnline,
    savedLocations.isLoading,
    selectedLocation?.latitude,
    selectedLocation?.longitude,
  ]);

  const practiceQuery = useQuery({
    queryKey: [
      "public-practice",
      initialPracticeId,
      serviceMode,
      isOnline ? null : coordinates?.latitude,
      isOnline ? null : coordinates?.longitude,
    ],
    queryFn: () =>
      listPublicDoctorPractices(
        supabase!,
        initialPracticeId,
        serviceMode,
        isOnline ? null : coordinates
      ),
    enabled: Boolean(supabase && initialPracticeId),
  });

  const locations = practiceQuery.data ?? [];
  const practiceId =
    locations.find((item) => item.practice_id === selectedPracticeId)
      ?.practice_id ??
    locations[0]?.practice_id ??
    initialPracticeId;
  useToastFeedback({
    error: practiceQuery.isError ? "Could not load this doctor." : "",
  });

  const servicePrefix =
    selectedConsultationType === "Online"
      ? "online-"
      : selectedConsultationType === "Home Visit"
        ? "home-"
        : "clinic-";

  const matchingServices =
    practiceQuery.data?.filter(
      (item) =>
        item.practice_id === practiceId &&
        item.service_code.startsWith(servicePrefix)
    ) ?? [];

  const slotsQuery = useQuery({
    queryKey: ["clinic-slots", practiceId, serviceMode],
    // Up to 288 five-minute options per day across a rolling 30-day horizon.
    queryFn: () =>
      listPracticeClinicSlots(
        supabase!,
        practiceId,
        undefined,
        10000,
        serviceMode
      ),
    enabled: Boolean(supabase && practiceId),
  });

  useFocusEffect(
    useCallback(() => {
      void queryClient.invalidateQueries({
        queryKey: ["public-practice", initialPracticeId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["practice-bio", practiceId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["clinic-slots", practiceId],
      });
    }, [practiceId, initialPracticeId, queryClient])
  );

  const familyQuery = useQuery({
    queryKey: ["my-family-profiles"],
    queryFn: () => listMyFamilyProfiles(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });

  const patientDetail = useQuery({
    queryKey: ["my-patient-profile-detail"],
    queryFn: () => getMyPatientProfileDetail(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });

  useEffect(() => {
    if (selectedLocation) {
      const formatted = formatSavedLocation(selectedLocation);
      setAddressDraft(formatted);
      setHomeAddress(formatted);
      return;
    }
    const address = patientDetail.data?.address;
    if (!address) return;
    const formatted = [
      address.building,
      address.line1,
      address.line2,
      address.city,
      address.state,
      address.pincode,
    ]
      .filter(Boolean)
      .join(", ");
    setAddressDraft(formatted);
    setHomeAddress(formatted);
  }, [patientDetail.data?.address, selectedLocation]);

  const slots =
    slotsQuery.data?.filter(
      (item) =>
        item.practice_id === practiceId && item.service_mode === serviceMode
    ) ?? [];

  const displayedServiceId =
    slots[0]?.practice_service_id ??
    matchingServices.find((item) => item.practice_service_id === serviceId)
      ?.practice_service_id ??
    matchingServices[0]?.practice_service_id;

  const practice =
    matchingServices.find(
      (item) => item.practice_service_id === displayedServiceId
    ) ?? matchingServices[0];

  const bioQuery = useQuery({
    queryKey: ["practice-bio", practiceId, displayedServiceId],
    queryFn: () =>
      getPublicPracticeBio(supabase!, practiceId, displayedServiceId!),
    enabled: Boolean(supabase && practiceId && displayedServiceId),
  });

  const book = useMutation({
    mutationFn: ({
      patientId,
      windowId,
      reason,
    }: {
      patientId: string;
      windowId: string;
      reason: string;
    }) => {
      if (!profile?.patient_id) throw new Error("Patient profile is missing.");
      const selectedSlot = slots.find((slot) => slot.window_id === windowId);
      if (!selectedSlot || selectedConsultationType === "Home Visit")
        throw new Error("This visit type has no published slots.");
      return bookClinicAppointment(supabase!, {
        patientId,
        windowId,
        practiceServiceId: selectedSlot.practice_service_id,
        reason,
        idempotencyKey,
      });
    },

    onSuccess: (appointmentId) => {
      setOpeningConfirmation(false);
      setConfirmation(null);
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success
      ).catch(() => {});
      void listClinicAppointments(supabase!)
        .then((appointments) => {
          queryClient.setQueryData(
            ["patient-clinic-appointments"],
            appointments
          );
          const booked = appointments.find((item) => item.id === appointmentId);
          if (booked?.status === "confirmed") {
            showToast({
              title: "Appointment confirmed",
              message: `Your ${booked.visit_mode === "online" ? "online consultation" : "clinic visit"} at ${booked.facility_name} is confirmed.`,
              type: "success",
            });
          }
          if (booked?.status === "pending") {
            showToast({
              title: "Appointment requested",
              message: "Waiting for the doctor to accept it.",
              type: "info",
            });
          }
        })
        .catch(() =>
          showToast({
            title: "Appointment booked",
            message: "Open Appointments to check its current status.",
            type: "info",
          })
        );
      setIdempotencyKey(Crypto.randomUUID());
      void queryClient.invalidateQueries({ queryKey: ["clinic-slots"] });
      void queryClient.invalidateQueries({
        queryKey: ["patient-clinic-appointments"],
      });
      router.push("/appointments" as Href);
    },

    onError: (cause) => {
      const message =
        cause &&
        typeof cause === "object" &&
        "message" in cause &&
        typeof cause.message === "string"
          ? cause.message
          : "";
      const feedback = message.includes("Daily booking limit reached")
        ? "This doctor has reached the daily booking limit. Please choose another day."
        : message.includes("already booked this time")
          ? "You already booked this time. Choose another slot."
          : message.includes("Slot is full") ||
              message.includes("Slot no longer available")
            ? "This slot is no longer available. Choose another time."
            : "Could not request this appointment. Reopen the slots and try again.";
      showToast({ title: "Booking failed", message: feedback, type: "error" });
    },
  });

  return {
    setSelectedPracticeId,
    profile,
    activeTab,
    setActiveTab,
    setOverrideConsultationType,
    selectedConsultationType,
    isOnline,
    serviceMode,
    addressDraft,
    setAddressDraft,
    homeAddress,
    setIdempotencyKey,
    confirmation,
    setConfirmation,
    openingConfirmation,
    setOpeningConfirmation,
    selectedLocation,
    practiceQuery,
    locations,
    practiceId,
    slotsQuery,
    familyQuery,
    slots,
    practice,
    bioQuery,
    book,
  };
}
