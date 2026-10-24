import type { VitalsStepProps } from "../types/vitals-step";

export type { VitalsStepProps } from "../types/vitals-step";

import { View } from "react-native";
import type { RecordVitalInput } from "@startup/contracts";
import { Button, Input } from "@startup/mobile-ui";
import { vitalUnits, vitalLabels } from "../utils/consultationConstants";

import { styles } from "./ConsultationForm.styles";

export function VitalsStep({
  setStep,
  intakeSaved,
  vitalValues,
  setVitalValues,
  diagnosis,
  setDiagnosis,
  vital,
  busy,
}: VitalsStepProps) {
  return (
    <>
      {(Object.keys(vitalUnits) as RecordVitalInput["code"][]).map((code) => (
        <View key={code} style={styles.vitalRow}>
          <View style={styles.vitalInput}>
            <Input
              label={`${vitalLabels[code]} (${vitalUnits[code]})`}
              disabled={busy || intakeSaved}
              value={vitalValues[code] ?? ""}
              onChangeText={(value) =>
                setVitalValues((current) => ({
                  ...current,
                  [code]: value,
                }))
              }
              keyboardType="decimal-pad"
            />
          </View>
        </View>
      ))}
      <Input
        label="Primary diagnosis"
        disabled={busy || intakeSaved}
        value={diagnosis}
        onChangeText={setDiagnosis}
        multiline
      />
      <Button
        theme="doctor"
        loading={vital.isPending}
        label={intakeSaved ? "Continue" : "Save and continue"}
        disabled={busy}
        onPress={() => {
          if (intakeSaved) {
            setStep(1);
            return;
          }
          if (
            !diagnosis.trim() &&
            !Object.values(vitalValues).some((value) => value?.trim())
          ) {
            setStep(1);
            return;
          }
          vital.mutate();
        }}
      />
    </>
  );
}
