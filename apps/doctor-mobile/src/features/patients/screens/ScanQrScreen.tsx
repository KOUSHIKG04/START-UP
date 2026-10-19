import { usePatientQrScan } from "../hooks/usePatientQrScan";

import { Linking, Platform, View } from "react-native";
import { CameraView } from "expo-camera";
import { router } from "expo-router";

import { Button, Input } from "@startup/mobile-ui";
import { ScanLine, User } from "lucide-react-native";
import {
  DoctorScreen,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

export function ScanQrScreen() {
  const {
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
  } = usePatientQrScan();
  return (
    <DoctorScreen title="Scan QR code" bottomNav={false}>
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
              Scan the Patient App check-in QR. A patient ID only looks up their
              appointment.
            </Label>
          </>
        )}
      </View>
      <Button
        theme="doctor"
        disabled={redeem.isPending}
        label={camera ? "Stop scanning" : "Open camera"}
        onPress={() => (camera ? setCamera(false) : void enableCamera())}
      />
      {permission &&
      !permission.granted &&
      !permission.canAskAgain &&
      Platform.OS !== "web" ? (
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
      ) : null}
      <Input
        label="Patient ID"
        accessibilityLabel="Patient ID"
        autoCapitalize="characters"
        placeholder="e.g. PAT-..."
        value={value}
        onChangeText={setValue}
        onSubmitEditing={() => lookup(value)}
        containerStyle={ui.field}
      />
      <Button
        loading={redeem.isPending}
        theme="doctor"
        variant="secondary"
        label="Look up patient"
        disabled={redeem.isPending || appointments.isLoading}
        onPress={() => lookup(value)}
      />
      {patientAppointment ? (
        <Panel>
          <View style={ui.row}>
            <User size={28} color={palette.primary} />
            <View>
              <Heading>{patientAppointment.patient_name}</Heading>
              <Label muted>
                {patientAppointment.patient_gender ?? "Gender unavailable"},{" "}
                {patientAppointment.patient_age_years ?? "age unavailable"} ·{" "}
                {patientAppointment.patient_blood_group ??
                  "Blood group unavailable"}
              </Label>
              <Label muted>{patientAppointment.patient_public_code}</Label>
            </View>
          </View>
          <Button
            theme="doctor"
            label={
              patientAppointment.status === "in_consultation"
                ? "Open clinical notes"
                : "View appointment"
            }
            onPress={() =>
              router.push(
                patientAppointment.status === "in_consultation"
                  ? {
                      pathname: "/clinical-notes",
                      params: { appointmentId: patientAppointment.id },
                    }
                  : {
                      pathname: "/appointment-details",
                      params: { appointmentId: patientAppointment.id },
                    }
              )
            }
          />
        </Panel>
      ) : null}
      <Panel>
        <Heading>Patient lookup</Heading>
        <Label muted>
          Patient ID lookup does not check in the patient. Use their appointment
          QR to confirm arrival.
        </Label>
        <Button
          theme="doctor"
          variant="ghost"
          label="Look up next patient"
          disabled={!appointments.data?.length}
          onPress={() => {
            const first = appointments.data?.[0];
            if (first) {
              setValue(first.patient_public_code);
              lookup(first.patient_public_code);
            }
          }}
        />
      </Panel>
    </DoctorScreen>
  );
}
