import { useCallback, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { redeemClinicCheckinToken } from "@startup/data-access";
import { clinicCheckinTokenSchema } from "@startup/contracts";
import { Button, Input } from "@startup/mobile-ui";
import { ScanLine } from "lucide-react-native";
import { DoctorScreen, Heading, Label, palette, Panel, ui } from "../../../components/DoctorScreen";
import { supabase } from "../../../services/supabase";

export function ScanQrScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  const [camera, setCamera] = useState(false);
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const scanned = useRef(false);
  const queryClient = useQueryClient();

  useFocusEffect(useCallback(() => {
    setFocused(true);
    return () => { setFocused(false); setCamera(false); };
  }, []));

  const redeem = useMutation({
    mutationFn: (token: string) => redeemClinicCheckinToken(supabase!, token),
    onSuccess: () => {
      setCamera(false); setValue(""); setError(""); setMessage("Patient checked in and added to the clinic queue.");
      void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] });
    },
    onError: () => {
      scanned.current = false;
      setCamera(false);
      setError("This check-in QR is invalid, expired, used, or belongs to another practice. Ask the patient to refresh it.");
    },
  });

  function submit(token: string) {
    const parsed = clinicCheckinTokenSchema.safeParse(token.trim());
    if (!parsed.success) { scanned.current = false; setError("Scan a clinic check-in QR code or enter its token."); return; }
    setError(""); setMessage("");
    redeem.mutate(parsed.data);
  }

  async function enableCamera() {
    try {
      const result = permission?.granted ? permission : await requestPermission();
      if (result.granted) { scanned.current = false; setCamera(true); setError(""); }
      else setError("Camera permission is off. Allow camera access or enter the patient's check-in token below.");
    } catch { setError("Camera is unavailable. Enter the patient's check-in token below."); }
  }

  return <DoctorScreen title="Clinic check-in" subtitle="Scan the patient's short-lived appointment QR" bottomNav={false}>
    <View style={{ height: 280, backgroundColor: palette.surface, borderRadius: 18, overflow: "hidden", alignItems: "center", justifyContent: "center", gap: 20 }}>
      {camera && focused && permission?.granted ? <CameraView style={{ width: "100%", height: "100%" }} facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }} onBarcodeScanned={({ data }) => {
          if (!scanned.current) { scanned.current = true; submit(data); }
        }} onMountError={() => { setCamera(false); setError("Unable to open the camera. Enter the token below."); }} /> : <>
        <ScanLine size={64} color={palette.primary} strokeWidth={1.8} />
        <Label style={{ textAlign: "center", paddingHorizontal: 26 }}>Scan the QR shown in the patient's active clinic booking.</Label>
      </>}
    </View>
    <Button theme="doctor" label={camera ? "Stop scanning" : "Open camera"} onPress={() => camera ? setCamera(false) : void enableCamera()} />
    {permission && !permission.granted && !permission.canAskAgain && Platform.OS !== "web" ? <Button theme="doctor" variant="secondary"
      label="Open camera settings" onPress={() => void Linking.openSettings().catch(() => setError("Open device settings and allow camera access."))} /> : null}
    <Input label="Check-in token" value={value} onChangeText={setValue} onSubmitEditing={() => submit(value)} containerStyle={ui.field} />
    <Button theme="doctor" variant="secondary" label="Check in patient" disabled={redeem.isPending || !value.trim()} onPress={() => submit(value)} />
    {error ? <Label style={ui.error}>{error}</Label> : null}
    {message ? <Panel><Heading>{message}</Heading></Panel> : null}
  </DoctorScreen>;
}
