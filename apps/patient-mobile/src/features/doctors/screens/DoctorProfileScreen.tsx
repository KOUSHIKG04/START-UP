import { useCallback, useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect, type Href } from "expo-router";
import * as Crypto from "expo-crypto";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { bookClinicAppointment, getMyPatientProfileDetail, getPublicPracticeBio, listClinicAppointments, listMyFamilyProfiles, listPracticeClinicSlots, searchPublicPractices } from "@startup/data-access";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { FadedScrollView, Header, useToast, useToastFeedback } from "@startup/mobile-ui";
import DoctorCard from "../components/DoctorCard";
import { AboutDoctor, BookSlots, HomeVisitAddress, OnlineConsultation, ProfileTabs } from "../components/index";
import type { ProfileTab } from "../utils/doctorProfileConstants";
import { consultationFlows } from "../../appointments/utils/consultationFlow";
import type { ConsultationType } from "../../appointments/types/appointment";
import { supabase, useMobileSession } from "../../../services/supabase";
import { formatConsultationFee } from "../utils/doctorDisplay";

export function DoctorProfileScreen({ practiceId, serviceId, consultationType }: { practiceId: string; serviceId: string; consultationType: string }) {
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
  const [overrideConsultationType, setOverrideConsultationType] = useState<ConsultationType | null>(null);
  const selectedConsultationType = overrideConsultationType ?? (consultationType as ConsultationType);
  const [addressDraft, setAddressDraft] = useState("");
  const [homeAddress, setHomeAddress] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => Crypto.randomUUID());
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  useEffect(() => {
    if (coordinates) return;
    let active = true;
    void (async () => {
      try {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) return;
        const position = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        if (active) setCoordinates({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      } catch { /* Doctor details remain available when location cannot be read. */ }
    })();
    return () => { active = false; };
  }, [coordinates]);
  const practiceQuery = useQuery({
    queryKey: ["public-practice", practiceId, coordinates?.latitude, coordinates?.longitude],
    queryFn: () => searchPublicPractices(supabase!, { practiceId, latitude: coordinates?.latitude, longitude: coordinates?.longitude, limit: 50 }),
    enabled: Boolean(supabase && practiceId),
    refetchInterval: 30_000,
  });
  useToastFeedback({ error: practiceQuery.isError ? "Could not load this doctor." : "" });
  const onlinePractice = practiceQuery.data?.find(item => item.practice_id === practiceId && item.service_code.startsWith("online-"));
  const servicePrefix = selectedConsultationType === "Online" ? "online-" : selectedConsultationType === "Home Visit" ? "home-" : "clinic-";
  const matchingServices = practiceQuery.data?.filter(item => item.practice_id === practiceId && item.service_code.startsWith(servicePrefix)) ?? [];
  const matchingServiceIds = new Set(matchingServices.map(item => item.practice_service_id));
  const slotsQuery = useQuery({
    queryKey: ["clinic-slots", practiceId],
    queryFn: () => listPracticeClinicSlots(supabase!, practiceId),
    enabled: Boolean(supabase && practiceId),
    refetchInterval: 30_000,
  });
  useFocusEffect(useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ["public-practice", practiceId] });
    void queryClient.invalidateQueries({ queryKey: ["practice-bio", practiceId] });
    void queryClient.invalidateQueries({ queryKey: ["clinic-slots", practiceId] });
  }, [practiceId, queryClient]));
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
    const address = patientDetail.data?.address;
    if (!address) return;
    const formatted = [address.building, address.line1, address.line2, address.city, address.state, address.pincode].filter(Boolean).join(", ");
    setAddressDraft(formatted);
    setHomeAddress(formatted);
  }, [patientDetail.data?.address]);
  const slots = slotsQuery.data?.filter(item => item.practice_id === practiceId && matchingServiceIds.has(item.practice_service_id)) ?? [];
  const displayedServiceId = slots[0]?.practice_service_id ?? matchingServices.find(item => item.practice_service_id === serviceId)?.practice_service_id ?? matchingServices[0]?.practice_service_id;
  const practice = matchingServices.find(item => item.practice_service_id === displayedServiceId);
  const bioQuery = useQuery({
    queryKey: ["practice-bio", practiceId, displayedServiceId],
    queryFn: () => getPublicPracticeBio(supabase!, practiceId, displayedServiceId!),
    enabled: Boolean(supabase && practiceId && displayedServiceId),
    refetchInterval: 30_000,
  });
  const book = useMutation({
    mutationFn: ({ patientId, windowId, reason }: { patientId: string; windowId: string; reason: string }) => {
      if (!profile?.patient_id) throw new Error("Patient profile is missing.");
      const selectedSlot = slots.find(slot => slot.window_id === windowId);
      if (!selectedSlot || selectedConsultationType === "Home Visit") throw new Error("This visit type has no published slots.");
      return bookClinicAppointment(supabase!, {
        patientId,
        windowId,
        practiceServiceId: selectedSlot.practice_service_id,
        reason,
        idempotencyKey,
      });
    },
    onSuccess: (appointmentId) => {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      void listClinicAppointments(supabase!).then((appointments) => {
        queryClient.setQueryData(["patient-clinic-appointments"], appointments);
        const booked = appointments.find((item) => item.id === appointmentId);
        if (booked?.status === "confirmed") {
          showToast({ title: "Appointment confirmed", message: `Your ${booked.visit_mode === "online" ? "online consultation" : "clinic visit"} is confirmed.`, type: "success" });
        }
        if (booked?.status === "pending") {
          showToast({ title: "Appointment requested", message: "Waiting for the doctor to accept it.", type: "info" });
        }
      }).catch(() => showToast({ title: "Appointment booked", message: "Open Appointments to check its current status.", type: "info" }));
      setIdempotencyKey(Crypto.randomUUID());
      void queryClient.invalidateQueries({ queryKey: ["clinic-slots"] });
      void queryClient.invalidateQueries({ queryKey: ["patient-clinic-appointments"] });
      router.push("/appointments" as Href);
    },
    onError: cause => {
      const message = cause && typeof cause === "object" && "message" in cause && typeof cause.message === "string" ? cause.message : "";
      const feedback = message.includes("already booked this time") ? "You already booked this time. Choose another slot."
        : message.includes("Slot is full") || message.includes("Slot no longer available") ? "This slot is no longer available. Choose another time."
        : "Could not request this appointment. Reopen the slots and try again.";
      showToast({ title: "Booking failed", message: feedback, type: "error" });
    },
  });

  return <View style={styles.screen}>
    <Header
      title={selectedConsultationType === "Online" ? "Doctor Details (Online Consultation)" : selectedConsultationType === "Home Visit" ? "Doctor Details (Home Consultation)" : "Doctor Details"}
      app="patient"
      onBackPress={() => router.back()}
      titleStyle={selectedConsultationType === "Clinic Visit" ? styles.headerTitle : styles.onlineHeaderTitle}
    />
    <FadedScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      {practiceQuery.isLoading ? <Text style={styles.message}>Loading doctor…</Text> : null}
      {!practice && !practiceQuery.isLoading && !practiceQuery.isError ? <Text style={styles.message}>This practice is not available.</Text> : null}
      {practice ? <>
        <DoctorCard
          name={practice.doctor_name}
          qualification={practice.qualification ?? "Qualification pending review"}
          specialty={practice.specialties.map(item => item.name).join(", ") || practice.service_name}
          experience={`${practice.experience_years} Years Experience`}
          rating={practice.rating === null ? "No ratings yet" : `${practice.rating} (${practice.review_count} reviews)`}
          fee={formatConsultationFee(practice.fee_minor, practice.currency)}
          distanceMeters={practice.distance_meters}
          contextLabel={selectedConsultationType === "Online" ? undefined : consultationFlows[selectedConsultationType].profileContext}
        />
        {selectedConsultationType === "Clinic Visit" ? <OnlineConsultation
          fee={practice.online_fee_minor === null ? "Fee not published" : formatConsultationFee(practice.online_fee_minor, practice.currency)}
          onBookPress={() => { setOverrideConsultationType("Online"); setActiveTab("slots"); }}
        /> : null}
        {consultationFlows[selectedConsultationType].requiresAddress ? <HomeVisitAddress
          address={addressDraft}
          onAddressChange={setAddressDraft}
          onConfirm={() => Alert.alert("Save a visit address", "Add or update your structured address in Profile. Home-visit booking is awaiting service setup.", [
            { text: "Cancel", style: "cancel" },
            { text: "Edit profile", onPress: () => router.push("/(app)/edit-profile" as Href) },
          ])}
          verifiedAddress={homeAddress}
        /> : null}
        <View style={styles.tabSection}>
          <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />
          <View style={styles.page}>
            {activeTab === "about" ? <AboutDoctor
              doctorName={practice.doctor_name}
              bio={bioQuery.data ?? null}
              facilityName={practice.facility_name}
              facilityAddress={practice.address}
              distanceMeters={practice.distance_meters}
              languages={practice.languages}
              onGoToSlots={() => setActiveTab("slots")}
            /> : <>
              {selectedConsultationType === "Home Visit" ? <Text style={styles.message}>Home-visit slots are shown below when published. Booking requires verified address coverage and is not enabled yet.</Text> : null}
              {selectedConsultationType === "Online" && !onlinePractice ? <Text style={styles.message}>No online slots have been published yet.</Text> : null}
              <BookSlots
                address={consultationFlows[selectedConsultationType].requiresAddress ? homeAddress : undefined}
                consultationType={selectedConsultationType}
                slots={slots}
                patientOptions={[
                  ...(profile?.patient_id ? [{ id: profile.patient_id, label: "Self", verified: true }] : []),
                  ...(familyQuery.data ?? []).map((member) => ({ id: member.id, label: member.verified ? member.full_name : `${member.full_name} (pending verification)`, verified: member.verified })),
                ]}
                loading={slotsQuery.isLoading}
                error={slotsQuery.isError ? "Could not load available slots." : null}
                busy={book.isPending}
                onGoToAbout={() => setActiveTab("about")}
                onBookAppointment={selection => {
                  book.mutate({ patientId: selection.patientId, windowId: selection.time, reason: selection.reason });
                }}
              />
            </>}
          </View>
        </View>
      </> : null}
    </FadedScrollView>
  </View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  headerTitle: { color: colors.white, fontSize: 20, fontWeight: "600", lineHeight: 28 },
  onlineHeaderTitle: { color: colors.white, fontSize: 18, fontWeight: "600", lineHeight: 22 },
  content: { gap: 14, paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: 126 },
  tabSection: { marginHorizontal: -spacing.lg, paddingHorizontal: spacing.lg, paddingVertical: 14, gap: 14, overflow: "hidden" },
  page: {},
  message: { color: colors.patient.textSecondary, fontFamily: fontFamilies.regular, fontSize: 13 },
});
