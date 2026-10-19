import { useLocalSearchParams } from "expo-router";
import { appointments, patients } from "../../../data/demo";
import type { Appointment, VisitMode } from "../../../types/doctor";
export function useVisit() {
  const params = useLocalSearchParams<{
    appointmentId?: string;
    patientId?: string;
    mode?: string;
  }>();
  const known = appointments.find((a) => a.id === params.appointmentId);
  const patient = patients.find(
    (p) => p.id === (known?.patientId ?? params.patientId)
  );
  const mode: VisitMode =
    known?.mode ??
    (params.mode === "home" || params.mode === "online"
      ? params.mode
      : "clinic");
  const appointment: Appointment | undefined = patient
    ? (known ?? {
        id: `lookup-${patient.id}-${mode}`,
        patientId: patient.id,
        mode,
        date: "",
        time: "",
        queue: "",
        status: "waiting",
      })
    : undefined;
  return { patient, appointment };
}
