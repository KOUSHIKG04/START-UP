import { useLocalSearchParams, router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import {
  getMyDoctorReview,
  listClinicAppointments,
  submitMyDoctorReview,
} from "@startup/data-access";
import type { ClinicAppointment } from "@startup/contracts";
import { colors, fontFamilies, spacing } from "@startup/design-tokens";
import { Header, Loader, useToast, useToastFeedback } from "@startup/mobile-ui";
import { CompletionView } from "../../../features/consultations/components/CompletionView";
import { clinicAppointmentCard } from "../../../features/appointments/utils/clinicAppointmentCard";
import { supabase } from "../../../services/supabase";

export default function RateDoctorRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { showToast } = useToast();
  const queryClient = useQueryClient();
  const appointments = useQuery<ClinicAppointment[]>({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase),
  });
  const review = useQuery({
    queryKey: ["my-doctor-review", id],
    queryFn: () => getMyDoctorReview(supabase!, id!),
    enabled: Boolean(supabase && id),
  });
  useToastFeedback({
    error:
      appointments.isError || review.isError
        ? "Could not load this completed visit. Try again from My Bookings."
        : "",
  });
  const appointment = appointments.data?.find(
    (item: ClinicAppointment) => item.id === id
  );

  const onSubmitRating = async (rating: number, comment?: string) => {
    try {
      await submitMyDoctorReview(supabase!, {
        appointmentId: id!,
        rating,
        comment,
      });
      showToast({ title: "Doctor rating saved", type: "success" });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-doctor-review", id] }),
        queryClient.invalidateQueries({ queryKey: ["public-practices"] }),
      ]);
    } catch {
      showToast({
        title: "Could not save your rating",
        message: "Please try again from this completed booking.",
        type: "error",
      });
      throw new Error("Rating could not be saved");
    }
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Completed visit"
        app="patient"
        onBackPress={() => router.back()}
      />
      {appointments.isPending || review.isPending ? (
        <Loader theme="patient" size="large" style={styles.loading} />
      ) : null}
      {!appointments.isPending &&
      !review.isPending &&
      appointment?.status === "completed" ? (
        <CompletionView
          appointment={clinicAppointmentCard(appointment)}
          existingRating={review.data?.rating}
          onSubmitRating={onSubmitRating}
          onGoHome={() => router.replace("/")}
          onViewMedicines={() =>
            router.push({
              pathname: "/medicines",
              params: { appointmentId: appointment.id },
            })
          }
          onViewPrescription={() =>
            router.push({
              pathname: "/prescription",
              params: {
                ...clinicAppointmentCard(appointment),
                appointmentId: appointment.id,
              },
            })
          }
        />
      ) : null}
      {!appointments.isPending &&
      !review.isPending &&
      appointment?.status !== "completed" ? (
        <Text style={styles.message}>
          You can rate this doctor after the consultation is completed.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  loading: { minHeight: 180 },
  message: {
    padding: spacing.lg,
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
  },
});
