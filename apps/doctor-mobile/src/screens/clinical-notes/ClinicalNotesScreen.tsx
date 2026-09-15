import { useState } from "react";
import { View } from "react-native";
import { router } from "expo-router";
import { FileText } from "lucide-react-native";
import { Button, TextArea } from "@startup/mobile-ui";
import {
  DoctorScreen,
  Heading,
  Label,
  MissingPatient,
  palette,
  ui,
} from "../../components/DoctorScreen";
import { useVisit, visitRoute } from "../../utils/consultation";
import { useDoctorStore } from "../../store/useDoctorStore";
import { createConsultation } from "../../data/demo";
export function ClinicalNotesScreen() {
  const { patient, appointment } = useVisit();
  const visits = useDoctorStore((s) => s.consultations);
  const update = useDoctorStore((s) => s.updateConsultation);
  const complete = useDoctorStore((s) => s.complete);
  const [confirm, setConfirm] = useState(false);
  if (!patient || !appointment) return <MissingPatient />;
  const visit = visits[appointment.id] ?? createConsultation(patient.id);
  return (
    <DoctorScreen
      title={patient.name}
      subtitle={`${patient.gender}, ${patient.age} • Blood: ${patient.blood}`}
    >
      <Heading style={{ fontSize: 13 }}>Recorded Vitals</Heading>
      <View style={ui.row}>
        {[
          [patient.bp, "BP (mmHg)"],
          [patient.pulse, "Pulse (bpm)"],
          [patient.temperature, "Temp (°F)"],
        ].map(([value, label], index) => (
          <View
            key={label}
            style={{
              flex: 1,
              minHeight: 72,
              backgroundColor: palette.subtle,
              borderRadius: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Heading
              style={{
                fontSize: 20,
                color: index === 1 ? palette.text : palette.accent,
              }}
            >
              {value}
            </Heading>
            <Label muted style={{ fontSize: 11 }}>
              {label}
            </Label>
          </View>
        ))}
      </View>
      <View style={{ paddingHorizontal: 10, gap: 12, marginTop: 4 }}>
        <TextArea
          accessibilityLabel="Clinical Notes"
          label="Clinical Notes"
          value={visit.notes}
          onChangeText={(notes) =>
            update(appointment.id, patient.id, { notes })
          }
          editable={!visit.completed}
          containerStyle={ui.field}
          style={{ minHeight: 222 }}
          labelStyle={{ fontSize: 13, color: palette.header }}
          placeholder="Enter clinical notes for this patient..."
        />
        <Button
          theme="doctor"
          label={visit.signed ? "View Prescription" : "Write Prescription"}
          leftIcon={<FileText size={17} color="white" />}
          onPress={() => router.push(visitRoute("prescription", appointment))}
        />
        {visit.completed ? (
          <Label style={ui.success}>
            Consultation completed. Notes are read-only.
          </Label>
        ) : (
          <Button
            theme="doctor"
            variant="secondary"
            label="Complete Consultation"
            onPress={() => setConfirm(true)}
          />
        )}
        {confirm && !visit.completed && (
          <View style={{ gap: 10 }}>
            <Label>
              Complete this demo consultation? Its notes will become read-only.
            </Label>
            <View style={ui.row}>
              <Button
                theme="doctor"
                variant="secondary"
                label="Keep editing"
                onPress={() => setConfirm(false)}
                style={ui.flex}
              />
              <Button
                theme="doctor"
                label="Complete"
                onPress={() => {
                  complete(appointment.id, patient.id);
                  setConfirm(false);
                }}
                style={ui.flex}
              />
            </View>
          </View>
        )}
      </View>
    </DoctorScreen>
  );
}
