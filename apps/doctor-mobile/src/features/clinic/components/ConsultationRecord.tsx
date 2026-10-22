import { router } from "expo-router";
import { View } from "react-native";
import { Button, Loader } from "@startup/mobile-ui";
import {
  DoctorScreen,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { useConsultationDraft } from "../hooks/useConsultationDraft";
import { vitalLabels } from "../utils/consultationConstants";

export function ConsultationRecord({
  appointmentId,
  patientName,
  timezone,
}: {
  appointmentId: string;
  patientName: string;
  timezone: string;
}) {
  const { draft } = useConsultationDraft({ appointmentId });
  const record = draft.data?.status === "active" ? undefined : draft.data;
  const back = () => router.replace("/appointments");
  return (
    <DoctorScreen
      title="Consultation record"
      bottomNav={false}
      onBackPress={back}
    >
      <Heading>{patientName}</Heading>
      {!record ? (
        draft.isError ? (
          <>
            <Label>
              Could not load the saved record. Your consultation remains signed.
            </Label>
            <Button
              theme="doctor"
              label="Retry"
              onPress={() => void draft.refetch()}
            />
          </>
        ) : (
          <Loader theme="doctor" />
        )
      ) : (
        <>
          <Label>Signed and saved. This record is read-only.</Label>
          {record.signed_at ? (
            <Label muted>
              {new Date(record.signed_at).toLocaleString("en-IN", {
                timeZone: timezone,
              })}
            </Label>
          ) : null}
          <Panel>
            <Heading>Assessment</Heading>
            <Label>
              {record.assessment ?? "No signed assessment available."}
            </Label>
            {record.diagnosis ? (
              <>
                <Heading>Diagnosis</Heading>
                <Label>{record.diagnosis}</Label>
              </>
            ) : null}
          </Panel>
          {record.vitals.length ? (
            <Panel>
              <Heading>Recorded vitals</Heading>
              {record.vitals.map((vital) => (
                <Label key={vital.code}>
                  {vitalLabels[vital.code]}: {vital.value} {vital.unit}
                </Label>
              ))}
            </Panel>
          ) : null}
          <Panel>
            <Heading>Prescription</Heading>
            {record.medicines?.length ? (
              record.medicines.map((medicine, index) => (
                <View
                  style={{ gap: 8, marginTop: 12 }}
                  key={`${medicine.medicine_name}-${index}`}
                >
                  <Heading style={{ fontSize: 16 }}>
                    {medicine.medicine_name} · {medicine.strength}
                  </Heading>
                  <Label>
                    {medicine.form} · {medicine.route}
                  </Label>
                  <Label>{medicine.instructions}</Label>
                  {medicine.schedule ? (
                    <>
                      <Label>
                        {medicine.schedule.dose_quantity}{" "}
                        {medicine.schedule.dose_unit} ·{" "}
                        {medicine.schedule.starts_on}
                        {medicine.schedule.ends_on
                          ? ` to ${medicine.schedule.ends_on}`
                          : ""}
                      </Label>
                      {medicine.schedule.timings.map((timing, timingIndex) => (
                        <Label key={timingIndex}>
                          {timing.meal_relation === "independent"
                            ? "Independent of meals"
                            : `${timing.meal_relation} ${timing.meal_anchor}`}
                        </Label>
                      ))}
                    </>
                  ) : null}
                </View>
              ))
            ) : (
              <Label>
                {record.prescription_issued
                  ? "Prescription details are unavailable. Try refreshing the record."
                  : "No medicines prescribed."}
              </Label>
            )}
          </Panel>
          {record.followup ? (
            <Panel>
              <Heading>Follow-up</Heading>
              <Label>{record.followup.date}</Label>
              <Label>{record.followup.reason}</Label>
              <Label muted>
                Recommendation only; a new booking is required.
              </Label>
            </Panel>
          ) : null}
        </>
      )}
      <Button
        theme="doctor"
        variant="outline"
        label="Back to appointments"
        onPress={back}
      />
    </DoctorScreen>
  );
}
