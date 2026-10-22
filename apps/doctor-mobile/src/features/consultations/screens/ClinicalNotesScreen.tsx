import { useClinicalNotes } from "../hooks/useClinicalNotes";

import { View } from "react-native";
import { router } from "expo-router";
import { FileText } from "lucide-react-native";

import { Button, Input, Loader, TextArea } from "@startup/mobile-ui";
import {
  DoctorScreen,
  Heading,
  Label,
  MissingPatient,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { ConsultationForm } from "../../clinic/components/ConsultationForm";
import { ConsultationRecord } from "../../clinic/components/ConsultationRecord";
import { visitRoute } from "../utils/consultationRoutes";

import { createConsultation } from "../../../data/demo";

export function ClinicalNotesScreen() {
  const {
    isLiveAppointment,
    appointmentsQuery,
    liveAppointment,
    assessment,
    setAssessment,
    completeMessage,
    completeMutation,
    patient,
    appointment,
    visits,
    update,
    complete,
    confirm,
    setConfirm,
  } = useClinicalNotes();
  if (isLiveAppointment && liveAppointment) {
    if (liveAppointment.status === "completed" && liveAppointment.can_consult)
      return (
        <ConsultationRecord
          appointmentId={liveAppointment.id}
          patientName={liveAppointment.patient_name}
          timezone={liveAppointment.timezone}
        />
      );
    if (
      liveAppointment.status === "in_consultation" &&
      liveAppointment.can_consult
    ) {
      return (
        <ConsultationForm
          appointmentId={liveAppointment.id}
          patientName={liveAppointment.patient_name}
          timezone={liveAppointment.timezone}
          completing={completeMutation.isPending}
          assessmentStep={
            <>
              <Input
                label="Assessment"
                value={assessment}
                onChangeText={setAssessment}
                multiline
                maxLength={10000}
                disabled={completeMutation.isPending}
              />
              <Button
                loading={completeMutation.isPending}
                theme="doctor"
                label="Sign and complete"
                disabled={completeMutation.isPending || !assessment.trim()}
                onPress={() => completeMutation.mutate()}
              />
              {completeMessage ? (
                <Label
                  style={
                    completeMessage.startsWith("Could") ? ui.error : ui.success
                  }
                >
                  {completeMessage}
                </Label>
              ) : null}
            </>
          }
        />
      );
    }
    return (
      <DoctorScreen title={liveAppointment.patient_name}>
        {liveAppointment.status === "completed" ? (
          <Panel style={{ marginTop: 16 }}>
            <Label style={ui.success}>
              This consultation has been completed and signed.
            </Label>
          </Panel>
        ) : (
          <Label>Start this consultation from the appointment page.</Label>
        )}
        {completeMessage ? (
          <Label
            style={completeMessage.startsWith("Could") ? ui.error : ui.success}
          >
            {completeMessage}
          </Label>
        ) : null}
      </DoctorScreen>
    );
  }

  if (isLiveAppointment) {
    return (
      <DoctorScreen title="Consultation details">
        <Panel>
          {appointmentsQuery.isLoading ? (
            <Loader theme="doctor" style={{ minHeight: 72 }} />
          ) : (
            <Label muted>
              {appointmentsQuery.isError
                ? "Could not load this consultation. Try again."
                : "This consultation is unavailable for your account."}
            </Label>
          )}
        </Panel>
      </DoctorScreen>
    );
  }

  if (!patient || !appointment) return <MissingPatient />;
  const visit = visits[appointment.id] ?? createConsultation(patient.id);

  return (
    <DoctorScreen title={patient.name}>
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
