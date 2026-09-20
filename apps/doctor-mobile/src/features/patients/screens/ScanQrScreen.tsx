import { useCallback, useRef, useState } from "react";
import { Linking, Platform, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { router, useFocusEffect } from "expo-router";
import { Button, Input } from "@startup/mobile-ui";
import { User, ScanLine } from "lucide-react-native";
import {
  DoctorScreen,
  Heading,
  Label,
  palette,
  Panel,
  ui,
} from "../../../components/DoctorScreen";
import { visitRoute } from "../../consultations/utils/consultation";
import { lookupPatient } from "../utils/patientLookup";
import { appointments } from "../../../data/demo";
import type { Patient } from "../../../types/doctor";
export function ScanQrScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, [])
  );
  const [camera, setCamera] = useState(false);
  const [value, setValue] = useState("");
  const [patient, setPatient] = useState<Patient>();
  const [error, setError] = useState("");
  const scanned = useRef(false);
  const lookup = (data: string) => {
    const match = lookupPatient(data);
    setPatient(match);
    setError(
      match ? "" : "No demo patient found. Try CLZ-0001, CLZ-0002, or CLZ-0003."
    );
    setCamera(false);
  };
  const enableCamera = async () => {
    try {
      const result = permission?.granted
        ? permission
        : await requestPermission();
      if (result.granted) {
        scanned.current = false;
        setCamera(true);
        setPatient(undefined);
        setError("");
      } else {
        setError(
          "Camera permission is off. Allow access in settings or enter the patient ID below."
        );
      }
    } catch {
      setError("Camera is unavailable. Enter the patient ID below.");
    }
  };
  return (
    <DoctorScreen
      title="Scan QR code"
      subtitle="Look up a patient before starting a visit"
      bottomNav={false}
    >
      <View
        style={{
          height: 280,
          backgroundColor: palette.surface,
          borderRadius: 18,
          overflow: "hidden",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
        }}
      >
        {camera && focused && permission?.granted ? (
          <CameraView
            style={{ width: "100%", height: "100%" }}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => {
              if (!scanned.current) {
                scanned.current = true;
                lookup(data);
              }
            }}
            onMountError={() => {
              setCamera(false);
              setError(
                "Unable to open the camera. Enter the patient ID below."
              );
            }}
          />
        ) : (
          <>
            <ScanLine size={64} color={palette.primary} strokeWidth={1.8} />
            <Label style={{ textAlign: "center", paddingHorizontal: 26 }}>
              Scan a patient’s QR code or enter their patient ID.
            </Label>
          </>
        )}
      </View>
      <Button
        theme="doctor"
        label={camera ? "Stop scanning" : "Open camera"}
        onPress={() => (camera ? setCamera(false) : void enableCamera())}
      />
      {permission &&
        !permission.granted &&
        !permission.canAskAgain &&
        Platform.OS !== "web" && (
          <Button
            theme="doctor"
            variant="secondary"
            label="Open camera settings"
            onPress={() =>
              void Linking.openSettings().catch(() =>
                setError("Open your device settings and allow camera access.")
              )
            }
          />
        )}
      <Input
        label="Patient ID"
        accessibilityLabel="Patient ID"
        autoCapitalize="characters"
        placeholder="e.g. CLZ-0001"
        value={value}
        onChangeText={setValue}
        onSubmitEditing={() => lookup(value)}
        containerStyle={ui.field}
      />
      <Button
        theme="doctor"
        variant="secondary"
        label="Look up patient"
        onPress={() => lookup(value)}
      />
      {!!error && <Label style={ui.error}>{error}</Label>}
      {patient && (
        <Panel>
          <View style={ui.row}>
            <User size={28} color={palette.primary} />
            <View>
              <Heading>{patient.name}</Heading>
              <Label muted>
                {patient.gender}, {patient.age} · {patient.blood}
              </Label>
              <Label muted>{patient.id}</Label>
            </View>
          </View>
          <Button
            theme="doctor"
            label="Open clinical notes"
            onPress={() => {
              const appointment = appointments.find(
                (a) => a.patientId === patient.id && a.mode === "clinic"
              ) ?? {
                id: `lookup-${patient.id}-clinic`,
                patientId: patient.id,
                mode: "clinic" as const,
                date: "",
                time: "",
                queue: "",
                status: "waiting" as const,
              };
              router.push(visitRoute("clinical-notes", appointment));
            }}
          />
        </Panel>
      )}
      <Panel>
        <Heading>Demo patient lookup</Heading>
        <Label muted>
          Use CLZ-0001 for Meera Sharma. QR codes can contain a patient ID or a
          JSON object with a patientId field.
        </Label>
        <Button
          theme="doctor"
          variant="ghost"
          label="Look up demo patient"
          onPress={() => {
            setValue("CLZ-0001");
            lookup("CLZ-0001");
          }}
        />
      </Panel>
    </DoctorScreen>
  );
}
