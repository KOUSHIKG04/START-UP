import {
  medicineCardItems1,
  medicineCardItems2,
} from "../utils/medicineCardConstants";
import type { MedicineCardProps } from "../types/medicine-card";
export type { MedicineCardProps } from "../types/medicine-card";
import { View } from "react-native";
import { Button } from "@startup/mobile-ui";
import { Heading, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

export function MedicineCard({
  medicine,
  readOnly,
  onEdit,
  onRemove,
  onUpdateTiming,
  onUpdateDose,
}: MedicineCardProps) {
  return (
    <Panel style={{ gap: 14 }}>
      <View style={[ui.between, { flexWrap: "wrap" }]}>
        <Heading style={{ color: palette.text, fontSize: 14 }}>
          {medicine.name}
        </Heading>
        <View style={{ ...ui.row, gap: 4 }}>
          {medicineCardItems1.map((timing) => (
            <Button
              key={timing}
              variant="ghost"
              theme="doctor"
              disabled={readOnly}
              label={timing}
              labelStyle={{
                color:
                  medicine.timing === timing ? palette.dark : palette.muted,
                textDecorationLine:
                  medicine.timing === timing ? "underline" : "none",
              }}
              style={{ paddingHorizontal: 6 }}
              onPress={() => onUpdateTiming(medicine.id, timing)}
            />
          ))}
        </View>
      </View>
      <View style={ui.divider} />
      <View
        style={{
          ...ui.row,
          paddingVertical: 16,
          backgroundColor: palette.subtle,
          borderRadius: 12,
        }}
      >
        {medicineCardItems2.map((meal, index) => (
          <View key={meal} style={{ flex: 1, gap: 10, alignItems: "center" }}>
            <Label muted style={{ fontSize: 12 }}>
              {meal}
            </Label>
            <Button
              theme="doctor"
              variant="outline"
              label={String(medicine.meals[index])}
              accessibilityLabel={`${medicine.name}, ${meal}, ${medicine.meals[index]} tablets. Tap to change dose.`}
              disabled={readOnly}
              style={{
                minWidth: 44,
                borderColor: medicine.meals[index]
                  ? palette.dark
                  : palette.border,
                backgroundColor: "white",
              }}
              onPress={() => onUpdateDose(medicine.id, index)}
            />
          </View>
        ))}
      </View>
      <Label style={{ color: palette.dark, fontSize: 12, textAlign: "center" }}>
        {medicine.meals.join(" – ")} tablets ·{" "}
        {medicine.meals.filter(Boolean).length} times daily · {medicine.days}{" "}
        days
      </Label>
      {!readOnly && (
        <>
          <View style={ui.divider} />
          <View style={ui.between}>
            <Button
              variant="ghost"
              theme="doctor"
              label="Edit"
              accessibilityLabel={`Edit ${medicine.name}`}
              onPress={() => onEdit(medicine)}
            />
            <Button
              variant="ghost"
              label="Remove"
              accessibilityLabel={`Remove ${medicine.name}`}
              labelStyle={{ color: palette.danger }}
              onPress={() => onRemove(medicine.id)}
            />
          </View>
        </>
      )}
    </Panel>
  );
}
