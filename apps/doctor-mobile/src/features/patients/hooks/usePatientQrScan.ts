import { useToastFeedback } from "@startup/mobile-ui";
import { useCallback, useRef, useState } from "react";
import { useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  listMyPracticeAppointments,
  redeemClinicCheckinToken,
} from "@startup/data-access";
import { clinicCheckinTokenSchema } from "@startup/contracts";
import type { ClinicAppointment } from "@startup/contracts";
import { supabase } from "../../../services/supabase";
export function usePatientQrScan() {
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [camera, setCamera] = useState(false);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useToastFeedback({ error, success: message });
  const [patientAppointment, setPatientAppointment] =
    useState<ClinicAppointment>();
  const scanned = useRef(false);
  const redeeming = useRef(false);
  const queryClient = useQueryClient();
  const appointments = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase),
  });

  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setCamera(false);
      };
    }, [])
  );

  const redeem = useMutation({
    mutationFn: (token: string) => redeemClinicCheckinToken(supabase!, token),
    retry: false,
    onSuccess: (appointmentId) => {
      setCamera(false);
      setValue("");
      setError("");
      setMessage("Patient checked in and added to the clinic queue.");
      // Refresh failures must not turn a completed, single-use check-in into a QR error.
      void queryClient
        .invalidateQueries({ queryKey: ["doctor-clinic-appointments"] })
        .catch(() => undefined);
      router.push({
        pathname: "/appointment-details",
        params: { appointmentId },
      });
    },
    onError: (cause: unknown) => {
      setCamera(false);
      const reason =
        cause && typeof cause === "object" && "message" in cause
          ? String(cause.message)
          : "";
      setError(
        /check-in token unavailable|invalid check-in token/i.test(reason)
          ? "This check-in QR is expired, already used, or unavailable for your practice. Ask the patient to refresh it."
          : "Could not confirm check-in. Check your connection and refresh the appointment before trying again."
      );
    },
    onSettled: () => {
      redeeming.current = false;
    },
  });

  function lookup(input: string) {
    if (redeeming.current) return;
    const clean = input.trim();
    const token = clinicCheckinTokenSchema.safeParse(clean);
    if (token.success) {
      redeeming.current = true;
      setCamera(false);
      setPatientAppointment(undefined);
      setError("");
      setMessage("");
      redeem.mutate(token.data);
      return;
    }
    let code = clean;
    if (clean.startsWith("{")) {
      try {
        const parsed = JSON.parse(clean);
        code = typeof parsed?.patientId === "string" ? parsed.patientId : "";
      } catch {
        code = "";
      }
    }
    const match = appointments.data?.find(
      (item) => item.patient_public_code.toLowerCase() === code.toLowerCase()
    );
    setPatientAppointment(match);
    setCamera(false);
    scanned.current = false;
    setError(
      match
        ? ""
        : "No patient with this ID is in your accessible clinic appointments."
    );
    setMessage("");
  }

  async function enableCamera() {
    if (redeeming.current) return;
    try {
      const result = permission?.granted
        ? permission
        : await requestPermission();
      if (result.granted) {
        scanned.current = false;
        setCamera(true);
        setPatientAppointment(undefined);
        setError("");
      } else
        setError(
          "Camera permission is off. Allow access in settings or enter the patient ID below."
        );
    } catch {
      setError("Camera is unavailable. Enter the patient ID below.");
    }
  }

  return {
    permission,
    focused,
    camera,
    setCamera,
    value,
    setValue,
    setError,
    patientAppointment,
    scanned,
    appointments,
    redeem,
    lookup,
    enableCamera,
  };
}
