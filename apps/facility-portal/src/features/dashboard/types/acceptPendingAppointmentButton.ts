export type AcceptPendingAppointmentButtonProps = {
  appointmentId: string;
  expectedVersion: number;
  action: (input: unknown) => Promise<{ error: string | null }>;
};
