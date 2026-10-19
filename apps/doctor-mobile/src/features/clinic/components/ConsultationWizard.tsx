import type { ConsultationWizardProps } from "../types/consultation";
import { consultationSteps } from "../utils/consultationConstants";
import { View } from "react-native";
import { Button } from "@startup/mobile-ui";
import { DoctorScreen, Heading, Label } from "../../../components/DoctorScreen";
import { useConsultationForm } from "../hooks/useConsultationForm";
import { styles } from "./ConsultationForm.styles";
import { VitalsStep } from "./VitalsStep";
import { PrescriptionStep } from "./PrescriptionStep";
import { FollowupStep } from "./FollowupStep";
export function ConsultationWizard({
  appointmentId,
  patientName,
  timezone,
  assessmentStep,
  completing,
  initial,
}: ConsultationWizardProps) {
  const {
    step,
    setStep,
    intakeSaved,
    prescriptionIssued,
    followupSaved,
    setError,
    vitalValues,
    setVitalValues,
    diagnosis,
    setDiagnosis,
    medicineName,
    setMedicineName,
    strength,
    setStrength,
    form,
    setForm,
    route,
    setRoute,
    instructions,
    setInstructions,
    doseQuantity,
    setDoseQuantity,
    doseUnit,
    setDoseUnit,
    startsOn,
    setStartsOn,
    endsOn,
    setEndsOn,
    selectedMeals,
    setSelectedMeals,
    mealRelation,
    setMealRelation,
    items,
    setItems,
    followupDate,
    setFollowupDate,
    followupReason,
    setFollowupReason,
    today,
    tomorrow,
    vital,
    prescription,
    followup,
    busy,
    back,
    addMedicine,
  } = useConsultationForm({
    appointmentId,
    patientName,
    timezone,
    assessmentStep,
    completing,
    initial,
  });
  return (
    <DoctorScreen
      title={consultationSteps[step]}
      bottomNav={false}
      onBackPress={busy ? () => undefined : step > 0 ? back : undefined}
      scrollResetKey={step}
    >
      <Heading>{patientName}</Heading>
      <View style={styles.group}>
        {step === 0 ? (
          <VitalsStep
            setStep={setStep}
            intakeSaved={intakeSaved}
            vitalValues={vitalValues}
            setVitalValues={setVitalValues}
            diagnosis={diagnosis}
            setDiagnosis={setDiagnosis}
            vital={vital}
            busy={busy}
          />
        ) : null}
        {step === 1 && !prescriptionIssued ? (
          <PrescriptionStep
            setStep={setStep}
            setError={setError}
            medicineName={medicineName}
            setMedicineName={setMedicineName}
            strength={strength}
            setStrength={setStrength}
            form={form}
            setForm={setForm}
            route={route}
            setRoute={setRoute}
            instructions={instructions}
            setInstructions={setInstructions}
            doseQuantity={doseQuantity}
            setDoseQuantity={setDoseQuantity}
            doseUnit={doseUnit}
            setDoseUnit={setDoseUnit}
            startsOn={startsOn}
            setStartsOn={setStartsOn}
            endsOn={endsOn}
            setEndsOn={setEndsOn}
            selectedMeals={selectedMeals}
            setSelectedMeals={setSelectedMeals}
            mealRelation={mealRelation}
            setMealRelation={setMealRelation}
            items={items}
            setItems={setItems}
            today={today}
            prescription={prescription}
            busy={busy}
            addMedicine={addMedicine}
          />
        ) : null}
        {step === 1 && prescriptionIssued ? (
          <>
            <Label>Prescription signed and saved.</Label>
            <Button
              theme="doctor"
              label="Continue"
              onPress={() => setStep(2)}
            />
          </>
        ) : null}
        {step === 2 ? (
          <FollowupStep
            setStep={setStep}
            followupSaved={followupSaved}
            setError={setError}
            followupDate={followupDate}
            setFollowupDate={setFollowupDate}
            followupReason={followupReason}
            setFollowupReason={setFollowupReason}
            tomorrow={tomorrow}
            followup={followup}
            busy={busy}
          />
        ) : null}
        {step === 3 ? assessmentStep : null}
        {step > 0 ? (
          <Button
            theme="doctor"
            variant="outline"
            label="Back"
            disabled={busy}
            onPress={back}
          />
        ) : null}
      </View>
    </DoctorScreen>
  );
}
