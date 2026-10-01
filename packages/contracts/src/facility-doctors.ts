import { z } from "zod";
import { uuidSchema } from "./validation";

export const facilityDoctorRosterItemSchema = z.object({
  id: uuidSchema,
  practice_id: uuidSchema,
  name: z.string(),
  clinzo_id: z.string(),
  specialization: z.string(),
  phone: z.string(),
  verified: z.boolean(),
  present: z.boolean(),
  on_leave: z.boolean(),
});

export type FacilityDoctorRosterItem = z.infer<typeof facilityDoctorRosterItemSchema>;
