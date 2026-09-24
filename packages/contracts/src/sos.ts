import { z } from "zod";
import { uuidSchema } from "./validation";

export const requestMySosSchema = z.object({
  patientId: uuidSchema,
  pickupLatitude: z.number().min(-90).max(90),
  pickupLongitude: z.number().min(-180).max(180),
  pickupAddress: z.string().trim().min(5).max(500),
  summary: z.string().trim().min(5).max(1000),
  idempotencyKey: uuidSchema,
}).strict();

export type RequestMySosInput = z.infer<typeof requestMySosSchema>;
