import { emptyMedicine } from "../utils/medicineDraft";
import { usePrescriptionEditor } from "../hooks/usePrescriptionEditor";

import { View } from "react-native";
import { Button, Input } from "@startup/mobile-ui";

import { Plus } from "lucide-react-native";
import {
  DoctorScreen,
  Heading,
  Label,
  MissingPatient,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

import { MedicineCard } from "../components/MedicineCard";
import { MedicineEditor } from "../components/MedicineEditor";

export function PrescriptionScreen() {
  const editor = usePrescriptionEditor();
  if (!editor) return <MissingPatient />;
  const {
    patient,
    appointment,
    update,
    editing,
    setEditing,
    setError,
    confirm,
    setConfirm,
    visit,
    readOnly,
    handleStartEdit,
    handleRemove,
    handleUpdateTiming,
    handleUpdateDose,
    saveMedicine,
    sign,
  } = editor;
  return (
    <DoctorScreen title="Write prescription">
      {visit.signed && (
        <Label style={ui.success}>
          Demo prescription signed and saved locally. No prescription was sent.
        </Label>
      )}
      {visit.medicines.map((medicine) => (
        <MedicineCard
          key={medicine.id}
          medicine={medicine}
          readOnly={readOnly}
          onEdit={handleStartEdit}
          onRemove={handleRemove}
          onUpdateTiming={handleUpdateTiming}
          onUpdateDose={handleUpdateDose}
        />
      ))}
      {!visit.medicines.length && (
        <Panel>
          <Heading>No medicines added</Heading>
          <Label muted>
            Add a medicine to create this patient’s demo prescription.
          </Label>
        </Panel>
      )}
      {editing && !readOnly && (
        <MedicineEditor
          isEditingExisting={visit.medicines.some((m) => m.id === editing.id)}
          medicine={editing}
          onChange={setEditing}
          onCancel={() => {
            setEditing(null);
            setError("");
          }}
          onSave={saveMedicine}
        />
      )}
      {!readOnly && !editing && (
        <Button
          label="Add medicine"
          theme="doctor"
          variant="secondary"
          leftIcon={<Plus size={20} color={palette.primary} />}
          onPress={() => {
            setEditing(emptyMedicine());
            setError("");
          }}
        />
      )}
      <Panel style={{ backgroundColor: palette.subtle }}>
        <Input
          label="Follow-up date"
          accessibilityLabel="Follow-up date"
          placeholder="DD-MM-YYYY"
          value={visit.followUp}
          editable={!readOnly}
          containerStyle={ui.field}
          onChangeText={(followUp) =>
            update(appointment.id, patient.id, { followUp })
          }
        />
        <Label muted style={{ fontSize: 12 }}>
          Clinic visit · Date format: DD-MM-YYYY
        </Label>
      </Panel>
      {!readOnly && !editing && (
        <Button label="Sign & send to patient" theme="doctor" onPress={sign} />
      )}
      {confirm && !readOnly && (
        <Panel>
          <Heading>Sign demo prescription?</Heading>
          <Label>
            This saves the prescription in this app session. It does not send
            anything to a patient.
          </Label>
          <View style={ui.row}>
            <Button
              label="Cancel"
              theme="doctor"
              variant="secondary"
              style={ui.flex}
              onPress={() => setConfirm(false)}
            />
            <Button
              label="Sign demo"
              theme="doctor"
              style={ui.flex}
              onPress={() => {
                if (
                  visit.medicines.some((m) => m.meals.every((v) => v === 0))
                ) {
                  setError("Each medicine needs at least one dose.");
                  setConfirm(false);
                  return;
                }
                update(appointment.id, patient.id, { signed: true });
                setConfirm(false);
              }}
            />
          </View>
        </Panel>
      )}
    </DoctorScreen>
  );
}
