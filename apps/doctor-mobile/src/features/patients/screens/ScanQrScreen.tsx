import { useToastFeedback } from "@startup/mobile-ui";
import { useCallback, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { listMyPracticeAppointments, redeemClinicCheckinToken } from "@startup/data-access";
import { clinicCheckinTokenSchema } from "@startup/contracts";
import type { ClinicAppointment } from "@startup/contracts";
import { Button, Input } from "@startup/mobile-ui";
import { ScanLine, User } from "lucide-react-native";
import { DoctorScreen, Heading, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { supabase } from "../../../services/supabase";

export function ScanQrScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [camera, setCamera] = useState(false);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  useToastFeedback({ error, success: message });
  const [patientAppointment, setPatientAppointment] = useState<ClinicAppointment>();
  const scanned = useRef(false);
  const queryClient = useQueryClient();
  const appointments = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase),
  });

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); setCamera(false); };
  }, []));

  const redeem = useMutation({
    mutationFn: (token: string) => redeemClinicCheckinToken(supabase!, token),
    onSuccess: async (appointmentId) => {
      setCamera(false); setValue(""); setError(""); setMessage("Patient checked in and added to the clinic queue.");
      await queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] });
      if (supabase) setPatientAppointment((await listMyPracticeAppointments(supabase)).find(item => item.id === appointmentId));
    },
    onError: () => {
      scanned.current = false;
      setCamera(false);
      setError("This check-in QR is invalid, expired, used, or belongs to another practice. Ask the patient to refresh it.");
    },
  });

  function lookup(input: string) {
    const clean = input.trim();
    const token = clinicCheckinTokenSchema.safeParse(clean);
    if (token.success) { setError(""); setMessage(""); redeem.mutate(token.data); return; }
    let code = clean;
    if (clean.startsWith("{")) {
      try { const parsed = JSON.parse(clean); code = typeof parsed?.patientId === "string" ? parsed.patientId : ""; }
      catch { code = ""; }
    }
    const match = appointments.data?.find(item => item.patient_public_code.toLowerCase() === code.toLowerCase());
    setPatientAppointment(match);
    setCamera(false);
    scanned.current = false;
    setError(match ? "" : "No patient with this ID is in your accessible clinic appointments.");
    setMessage("");
  }

  async function enableCamera() {
    try {
      const result = permission?.granted ? permission : await requestPermission();
      if (result.granted) { scanned.current = false; setCamera(true); setPatientAppointment(undefined); setError(""); }
      else setError("Camera permission is off. Allow access in settings or enter the patient ID below.");
    } catch { setError("Camera is unavailable. Enter the patient ID below."); }
  }

  return <DoctorScreen title="Scan QR code" subtitle="Scan the appointment QR to confirm arrival" bottomNav={false}>
    <View style={{ height: 280, backgroundColor: palette.surface, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 20 }}>
      {camera && focused && permission?.granted ? <CameraView style={{ width: "100%", height: "100%" }} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => {
          if (!scanned.current) { scanned.current = true; lookup(data); }
        }} onMountError={() => { setCamera(false); setError("Unable to open the camera. Enter the patient ID below."); }} /> : <>
        <ScanLine size={64} color={palette.primary} strokeWidth={1.8} />
        <Label style={{ textAlign: "center", paddingHorizontal: 26 }}>Scan the Patient App check-in QR. A patient ID only looks up their appointment.</Label>
      </>}
    </View>
    <Button theme="doctor" label={camera ? "Stop scanning" : "Open camera"} onPress={() => camera ? setCamera(false) : void enableCamera()} />
    {permission && !permission.granted && !permission.canAskAgain && Platform.OS !== "web" ? <Button theme="doctor" variant="secondary"
      label="Open camera settings" onPress={() => void Linking.openSettings().catch(() => setError("Open your device settings and allow camera access."))} /> : null}
    <Input label="Patient ID" accessibilityLabel="Patient ID" autoCapitalize="characters" placeholder="e.g. PAT-..." value={value} onChangeText={setValue} onSubmitEditing={() => lookup(value)} containerStyle={ui.field} />
    <Button theme="doctor" variant="secondary" label="Look up patient" disabled={redeem.isPending || appointments.isLoading} onPress={() => lookup(value)} />
    {patientAppointment ? <Panel>
      <View style={ui.row}>
        <User size={28} color={palette.primary} />
        <View>
          <Heading>{patientAppointment.patient_name}</Heading>
          <Label muted>{patientAppointment.patient_gender ?? "Gender unavailable"}, {patientAppointment.patient_age_years ?? "age unavailable"} · {patientAppointment.patient_blood_group ?? "Blood group unavailable"}</Label>
          <Label muted>{patientAppointment.patient_public_code}</Label>
        </View>
      </View>
      <Button theme="doctor" label={patientAppointment.status === "in_consultation" ? "Open clinical notes" : "View appointment"} onPress={() => router.push(patientAppointment.status === "in_consultation" ? { pathname: "/clinical-notes", params: { appointmentId: patientAppointment.id } } : { pathname: "/appointments", params: { appointmentId: patientAppointment.id } })} />
    </Panel> : null}
    <Panel>
      <Heading>Patient lookup</Heading>
      <Label muted>Patient ID lookup does not check in the patient. Use their appointment QR to confirm arrival.</Label>
      <Button theme="doctor" variant="ghost" label="Look up next patient" disabled={!appointments.data?.length}
        onPress={() => { const first = appointments.data?.[0]; if (first) { setValue(first.patient_public_code); lookup(first.patient_public_code); } }} />
    </Panel>
  </DoctorScreen>;
}
