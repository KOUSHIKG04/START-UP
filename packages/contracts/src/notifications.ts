import { z } from "zod";
import { uuidSchema } from "./validation";

export const inAppNotificationSchema = z.object({
  id: uuidSchema,
  created_at: z.string(),
  template_key: z.string(),
  safe_parameters: z.record(z.string(), z.unknown()),
  is_read: z.boolean(),
  is_important: z.boolean().default(false),
  is_emergency: z.boolean().default(false),
});

export type InAppNotification = z.infer<typeof inAppNotificationSchema>;
