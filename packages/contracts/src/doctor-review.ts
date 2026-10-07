import { z } from "zod";
import { uuidSchema } from "./validation";

export const doctorReviewInputSchema = z.object({
  appointmentId: uuidSchema,
  rating: z.number().int().min(1).max(5),
  comment: z.string().trim().max(1000).optional(),
}).strict();

export const myDoctorReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  comment: z.string().nullable(),
});

export type DoctorReviewInput = z.infer<typeof doctorReviewInputSchema>;
export type MyDoctorReview = z.infer<typeof myDoctorReviewSchema>;
