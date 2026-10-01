import { View } from "react-native";
import { Button, Input } from "@startup/mobile-ui";
import {
  Choice,
  Heading,
  Panel,
} from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";
import type { Medicine } from "../../../types/doctor";

export type MedicineEditorProps = {
  isEditingExisting: boolean;
  medicine: Medicine;
  onChange: (medicine: Medicine) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function MedicineEditor({
  isEditingExisting,
  medicine,
  onChange,
  onCancel,
  onSave,
}: MedicineEditorProps) {
  return (
    <Panel>
      <Heading>
        {isEditingExisting ? "Edit medicine" : "Add medicine"}
      </Heading>
      <Input
        label="Medicine name and strength"
        accessibilityLabel="Medicine name and strength"
        value={medicine.name}
        onChangeText={(name) => onChange({ ...medicine, name })}
        containerStyle={ui.field}
      />
      <Input
        label="Duration (days)"
        accessibilityLabel="Duration in days"
        keyboardType="number-pad"
        value={medicine.days}
        onChangeText={(days) => onChange({ ...medicine, days })}
        containerStyle={ui.field}
      />
      <View style={ui.wrap}>
        {(["Before food", "After food"] as const).map((timing) => (
          <Choice
            key={timing}
            label={timing}
            selected={medicine.timing === timing}
            onPress={() => onChange({ ...medicine, timing })}
          />
        ))}
      </View>
      <View style={ui.row}>
        {["Breakfast", "Lunch", "Dinner"].map((meal, index) => (
          <Input
            key={meal}
            label={meal}
            accessibilityLabel={`${meal} dose`}
            keyboardType="number-pad"
            maxLength={1}
            value={String(medicine.meals[index])}
            containerStyle={ui.flex}
            onChangeText={(value) => {
              const meals = [...medicine.meals] as Medicine["meals"];
              meals[index] = Math.min(
                9,
                Number(value.replace(/\D/g, "")) || 0
              );
              onChange({ ...medicine, meals });
            }}
          />
        ))}
      </View>
      <View style={ui.row}>
        <Button
          label="Cancel"
          variant="secondary"
          theme="doctor"
          onPress={onCancel}
          style={ui.flex}
        />
        <Button
          label="Save medicine"
          theme="doctor"
          onPress={onSave}
          style={ui.flex}
        />
      </View>
    </Panel>
  );
}
