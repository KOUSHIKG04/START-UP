import { useState } from "react";
import { View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FileText } from "lucide-react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { completeOnlineAppointment, listMyPracticeAppointments, transitionClinicAppointment } from "@startup/data-access";
import { uuidSchema } from "@startup/contracts";
import { Button, Input, TextArea } from "@startup/mobile-ui";
import {
  DoctorScreen,
  Heading,
  Label,
  MissingPatient,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { ConsultationForm } from "../../clinic/components/ConsultationForm";
import { useVisit, visitRoute } from "../utils/consultation";
import { useDoctorStore } from "../../../stores/useDoctorStore";
import { createConsultation } from "../../../data/demo";
import { supabase } from "../../../services/supabase";

export function ClinicalNotesScreen() {
  const params = useLocalSearchParams<{
    appointmentId?: string;
    patientId?: string;
    mode?: string;
  }>();

  const isLiveAppointment = Boolean(
    params.appointmentId && uuidSchema.safeParse(params.appointmentId).success
  );

  const queryClient = useQueryClient();
  const appointmentsQuery = useQuery({
    queryKey: ["doctor-clinic-appointments", "all"],
    queryFn: () => listMyPracticeAppointments(supabase!),
    enabled: Boolean(supabase && isLiveAppointment),
  });

  const liveAppointment = appointmentsQuery.data?.find(
    (item) => item.id === params.appointmentId
  );

  const [assessment, setAssessment] = useState("");
  const [completeMessage, setCompleteMessage] = useState("");

  const completeMutation = useMutation({
    mutationFn: () => liveAppointment?.visit_mode === "online"
      ? completeOnlineAppointment(supabase!, liveAppointment.id, assessment.trim())
      : transitionClinicAppointment(supabase!, {
        appointmentId: liveAppointment!.id,
        expectedVersion: Number(liveAppointment!.row_version),
        action: "complete",
        note: assessment.trim() || null,
      }),
    onSuccess: () => {
      setCompleteMessage("Consultation signed and completed.");
      void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] });
    },
    onError: () => {
      setCompleteMessage("Could not complete consultation. Check current status.");
    },
  });

  // Demo fallback
  const { patient, appointment } = useVisit();
  const visits = useDoctorStore((s) => s.consultations);
  const update = useDoctorStore((s) => s.updateConsultation);
  const complete = useDoctorStore((s) => s.complete);
  const [confirm, setConfirm] = useState(false);

  if (isLiveAppointment && liveAppointment) {
    return (
      <DoctorScreen
        title={liveAppointment.patient_name}
        subtitle={`${liveAppointment.facility_name} · Booking ${liveAppointment.public_code}`}
      >
        {liveAppointment.status === "in_consultation" && liveAppointment.can_consult ? (
          <ConsultationForm appointmentId={liveAppointment.id} />
        ) : null}
        {liveAppointment.status === "in_consultation" && liveAppointment.can_consult ? (
          <View style={{ marginTop: 16, gap: 10 }}>
            <Input
              label="Signed assessment note"
              value={assessment}
              onChangeText={setAssessment}
              multiline
              placeholder="Enter clinical assessment before completing..."
            />
            <Button
              theme="doctor"
              label="Sign assessment and complete consultation"
              disabled={completeMutation.isPending || !assessment.trim()}
              onPress={() => completeMutation.mutate()}
            />
          </View>
        ) : liveAppointment.status === "completed" ? (
          <Panel style={{ marginTop: 16 }}>
            <Label style={ui.success}>
              This consultation has been completed and signed.
            </Label>
          </Panel>
        ) : null}
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
    return <DoctorScreen title="Consultation details"><Panel><Label muted>{appointmentsQuery.isLoading ? "Loading consultation…" : appointmentsQuery.isError ? "Could not load this consultation. Try again." : "This consultation is unavailable for your account."}</Label></Panel></DoctorScreen>;
  }

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
