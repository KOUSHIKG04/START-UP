import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useQuery } from "@tanstack/react-query";
import { listMyClinicalRecords } from "@startup/data-access";
import { Button, Header, SafeAreaView } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";
import type { RecordsScreenProps } from "../types/records";

export function RecordsScreen({ onBackPress }: RecordsScreenProps) {
  const records = useQuery({ queryKey: ["my-clinical-records"], queryFn: () => listMyClinicalRecords(supabase!), enabled: !!supabase });
  return <SafeAreaView style={styles.screen}>
    <Header title="Records" app="patient" onBackPress={onBackPress} />
    <ScrollView contentContainerStyle={styles.content}>
      <Text>Signed consultation records from your clinic visits.</Text>
      <Button label="Refresh records" variant="outline" onPress={() => void records.refetch()} />
      {records.isLoading ? <Text>Loading records…</Text> : null}
      {records.error ? <Text accessibilityRole="alert">Could not load your records. Try again.</Text> : null}
      {records.data?.length === 0 ? <Text>No signed consultation records yet.</Text> : null}
      {records.data?.map((record) => <View key={record.appointment_id} style={styles.card}>
        <Text style={styles.title}>{record.doctor_name}</Text>
        <Text>{record.facility_name} · {new Date(record.started_at).toLocaleDateString()}</Text>
        <Text>Booking {record.appointment_code}</Text>
        {record.assessment ? <Text>Assessment: {record.assessment}</Text> : null}
        {record.diagnoses.map((diagnosis, index) => <Text key={`${record.appointment_id}-diagnosis-${index}`}>Diagnosis: {diagnosis.description}</Text>)}
        {record.vitals.map((vital, index) => <Text key={`${record.appointment_id}-vital-${index}`}>{vital.code.replaceAll("_", " ")}: {vital.value} {vital.unit}</Text>)}
        {record.medicines.map((medicine, index) => <View key={`${record.appointment_id}-medicine-${index}`}>
          <Text>Medicine: {medicine.medicine_name} {medicine.strength} · {medicine.instructions}</Text>
          {medicine.schedule ? <Text>{medicine.schedule.dose_quantity} {medicine.schedule.dose_unit} · {medicine.schedule.timings.map((timing) => `${timing.meal_relation} ${timing.meal_anchor}`).join(", ")} · {medicine.schedule.starts_on} to {medicine.schedule.ends_on ?? "ongoing"}</Text> : null}
        </View>)}
        {record.followup ? <Text>Follow-up suggested for {record.followup.recommended_date}: {record.followup.reason}. Book a separate appointment when ready.</Text> : null}
      </View>)}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, gap: 16 }, card: { borderWidth: 1, borderColor: "#D8E4E8", borderRadius: 16, padding: 16, gap: 8 }, title: { fontSize: 17, fontWeight: "600" } });
