import { z } from "zod";
import { uuidSchema } from "./validation";

export const onlineMessageSchema = z.object({
  id: uuidSchema,
  appointment_id: uuidSchema,
  sender_id: uuidSchema,
  body: z.string(),
  created_at: z.string(),
});

export const onlineJoinContextSchema = z.object({
  appointment_id: uuidSchema,
  room_name: z.string(),
  role: z.enum(["patient", "doctor"]),
  starts_at: z.string(),
  ends_at: z.string(),
});

export const onlineTokenSchema = z.object({
  serverUrl: z.string().url(),
  participantToken: z.string().min(1),
});

export type OnlineMessage = z.infer<typeof onlineMessageSchema>;
export type OnlineJoinContext = z.infer<typeof onlineJoinContextSchema>;
