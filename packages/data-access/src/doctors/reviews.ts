import {
  doctorReviewInputSchema,
  myDoctorReviewSchema,
  uuidSchema,
} from "@startup/contracts";
import type { DoctorReviewInput } from "@startup/contracts";
import type { AppSupabaseClient } from "../client/createSupabaseClient";

export async function getMyDoctorReview(
  client: AppSupabaseClient,
  appointmentId: string
) {
  const { data, error } = await client.rpc("get_my_doctor_review", {
    p_appointment_id: uuidSchema.parse(appointmentId),
  });
  if (error) throw error;
  return data == null ? null : myDoctorReviewSchema.parse(data);
}

export async function submitMyDoctorReview(
  client: AppSupabaseClient,
  input: DoctorReviewInput
) {
  const review = doctorReviewInputSchema.parse(input);
  const { data, error } = await client.rpc("submit_my_doctor_review", {
    p_appointment_id: review.appointmentId,
    p_rating: review.rating,
    p_comment: review.comment ?? null,
  });
  if (error) throw error;
  return uuidSchema.parse(data);
}
