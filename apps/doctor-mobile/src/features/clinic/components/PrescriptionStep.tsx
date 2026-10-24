import type { PrescriptionStepProps } from "../types/prescription-step";

export type { PrescriptionStepProps } from "../types/prescription-step";

import { mealRelations } from "../utils/consultationConstants";
import { Text, View } from "react-native";
import { Button, DatePicker, Input } from "@startup/mobile-ui";
import { meals } from "../utils/consultationConstants";

import { styles } from "./ConsultationForm.styles";

export function PrescriptionStep({
  setStep,
  setError,
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
  today,
  prescription,
  busy,
  addMedicine,
}: PrescriptionStepProps) {
  return (
    <>
      <Input
        label="Medicine name"
        value={medicineName}
        onChangeText={setMedicineName}
      />
      <Input label="Strength" value={strength} onChangeText={setStrength} />
      <Input label="Form" value={form} onChangeText={setForm} />
      <Input label="Route" value={route} onChangeText={setRoute} />
      <Input
        label="Instructions"
        value={instructions}
        onChangeText={setInstructions}
        multiline
      />
      <Input
        label="Dose quantity"
        value={doseQuantity}
        onChangeText={setDoseQuantity}
        keyboardType="decimal-pad"
      />
      <Input label="Dose unit" value={doseUnit} onChangeText={setDoseUnit} />
      <DatePicker
        theme="doctor"
        label="Start date"
        value={startsOn}
        minDate={today}
        disabled={prescription.isPending}
        onChange={(day) => {
          setStartsOn(day);
          if (endsOn && endsOn < day) setEndsOn("");
        }}
      />
      <DatePicker
        theme="doctor"
        label="End date"
        value={endsOn}
        minDate={startsOn || today}
        maxDate={
          startsOn
            ? new Date(Date.parse(`${startsOn}T12:00:00Z`) + 365 * 86400000)
                .toISOString()
                .slice(0, 10)
            : undefined
        }
        disabled={prescription.isPending}
        onChange={setEndsOn}
      />
      <Text>Daily times</Text>
      <View style={styles.wrap}>
        {meals.map((meal) => (
          <Button
            key={meal}
            label={meal}
            variant={selectedMeals.includes(meal) ? "primary" : "outline"}
            onPress={() =>
              setSelectedMeals((current) =>
                current.includes(meal)
                  ? current.filter((item) => item !== meal)
                  : [...current, meal]
              )
            }
          />
        ))}
      </View>
      <Text>Relative to meal</Text>
      <View style={styles.wrap}>
        {mealRelations.map((relation) => (
          <Button
            key={relation}
            label={relation}
            variant={mealRelation === relation ? "primary" : "outline"}
            onPress={() => setMealRelation(relation)}
          />
        ))}
      </View>
      <Button
        label={items.length ? "Add another medicine" : "Add medicine to draft"}
        variant="outline"
        disabled={items.length >= 20}
        onPress={addMedicine}
      />
      {items.map((item, index) => (
        <View key={item.draftId} style={styles.draft}>
          <Text>
            {index + 1}. {item.medicine_name} {item.strength} ·{" "}
            {item.timings.map((timing) => timing.meal_anchor).join(", ")}
          </Text>
          <Button
            label="Remove"
            variant="outline"
            onPress={() =>
              setItems((current) =>
                current.filter((m) => m.draftId !== item.draftId)
              )
            }
          />
        </View>
      ))}
      <Button
        loading={prescription.isPending}
        theme="doctor"
        label="Sign prescription and continue"
        disabled={prescription.isPending || items.length === 0}
        onPress={() => prescription.mutate()}
      />
      {!items.length ? (
        <Button
          theme="doctor"
          variant="outline"
          label="Continue without prescription"
          disabled={busy || Boolean(medicineName.trim())}
          onPress={() => {
            setError("");
            setStep(2);
          }}
        />
      ) : null}
    </>
  );
}
