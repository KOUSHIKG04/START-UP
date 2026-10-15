import { uuidSchema } from "@startup/contracts";

export function appointmentDetailsRoute(appointmentId: unknown) {
  const parsed = uuidSchema.safeParse(appointmentId);
  return parsed.success
    ? {
        pathname: "/appointment-details" as const,
        params: { appointmentId: parsed.data },
      }
    : null;
}
