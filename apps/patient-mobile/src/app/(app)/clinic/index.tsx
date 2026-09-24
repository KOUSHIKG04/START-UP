import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import QRCode from "react-native-qrcode-svg";
import { bookClinicAppointment, issueClinicCheckinToken, listClinicAppointments, listClinicSlots, listPracticeClinicSlots, transitionClinicAppointment } from "@startup/data-access";
import { Button, Input, SafeAreaView } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";

export default function ClinicBooking() {
  const { practiceId, serviceId } = useLocalSearchParams<{ practiceId?: string; serviceId?: string }>();
  const { profile } = useMobileSession();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [idempotencyKey, setIdempotencyKey] = useState(() => Crypto.randomUUID());
  const [error, setError] = useState("");
  const [qr, setQr] = useState<{ appointmentId: string; token: string } | null>(null);
  useEffect(() => {
    if (!qr) return;
    const timer = setTimeout(() => setQr(null), 5 * 60 * 1000);
    return () => clearTimeout(timer);
  }, [qr]);
  const slots = useQuery({ queryKey: ["clinic-slots", practiceId, serviceId], queryFn: () => practiceId ? listPracticeClinicSlots(supabase!, practiceId, serviceId) : listClinicSlots(supabase!), enabled: !!supabase });
  const visibleSlots = slots.data?.filter((slot) => (!practiceId || slot.practice_id === practiceId) && (!serviceId || slot.practice_service_id === serviceId)) ?? [];
  const appointments = useQuery({ queryKey: ["patient-clinic-appointments"], queryFn: () => listClinicAppointments(supabase!), enabled: !!supabase, refetchInterval: 15000 });
  const book = useMutation({
    mutationFn: async () => {
      const slot = visibleSlots.find((item) => item.window_id === selected);
      if (!slot || !profile?.patient_id) throw new Error("Choose an available slot.");
      return bookClinicAppointment(supabase!, {
        patientId: profile.patient_id,
        windowId: slot.window_id,
        practiceServiceId: slot.practice_service_id,
        reason,
        idempotencyKey,
      });
    },
    onSuccess: async () => {
      setSelected(null); setReason(""); setIdempotencyKey(Crypto.randomUUID()); setError("");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["clinic-slots"] }),
        queryClient.invalidateQueries({ queryKey: ["patient-clinic-appointments"] }),
      ]);
    },
    onError: () => setError("Could not request this appointment. Refresh slots and try again."),
  });
  const cancel = useMutation({
    mutationFn: (appointment: NonNullable<typeof appointments.data>[number]) => transitionClinicAppointment(supabase!, {
      appointmentId: appointment.id, expectedVersion: Number(appointment.row_version), action: "cancel",
    }),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ["patient-clinic-appointments"] }),
    onError: () => setError("Could not cancel this booking. Refresh and try again."),
  });
  const issueQr = useMutation({
    mutationFn: async (appointmentId: string) => ({ appointmentId, token: await issueClinicCheckinToken(supabase!, appointmentId) }),
    onSuccess: (result) => { setQr(result); setError(""); },
    onError: () => setError("Could not create a check-in code. It is available on your clinic day."),
  });
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Clinic visits</Text>
    <Text>Choose a live clinic slot. Some sessions confirm automatically; others need clinic approval.</Text>
    {slots.isLoading ? <Text>Loading slots…</Text> : null}
    {slots.error ? <Text accessibilityRole="alert">Could not load clinic slots. Try again.</Text> : null}
    {visibleSlots.length === 0 && !slots.isLoading ? <Text>No clinic slots are available right now.</Text> : null}
    {visibleSlots.map((slot) => <View key={slot.window_id} style={styles.card}>
      <Text style={styles.name}>{slot.doctor_name}</Text>
      <Text>{slot.facility_name} · {slot.address}</Text>
      <Text>{new Date(slot.starts_at).toLocaleString()}</Text>
      <Text>{slot.currency} {(Number(slot.fee_minor) / 100).toFixed(2)}</Text>
      <Button label={selected === slot.window_id ? "Selected" : "Choose slot"} variant={selected === slot.window_id ? "primary" : "outline"} onPress={() => { setSelected(slot.window_id); setIdempotencyKey(Crypto.randomUUID()); }} />
    </View>)}
    {selected ? <>
      <Input label="Reason for visit" value={reason} onChangeText={(value) => { setReason(value); setIdempotencyKey(Crypto.randomUUID()); }} multiline />
      <Button label="Request appointment" disabled={book.isPending || !reason.trim()} onPress={() => book.mutate()} />
    </> : null}
    <Button label="Refresh slots" variant="outline" onPress={() => void slots.refetch()} />
    <Text style={styles.title}>My clinic bookings</Text>
    {appointments.isLoading ? <Text>Loading bookings…</Text> : null}
    {appointments.error ? <Text accessibilityRole="alert">Could not load your bookings. Try again.</Text> : null}
    {appointments.data?.length === 0 ? <Text>No clinic bookings yet.</Text> : null}
    {appointments.data?.map((item) => <View key={item.id} style={styles.card}>
      <Text style={styles.name}>{item.doctor_name} · {item.status}</Text>
      <Text>{item.facility_name} · {new Date(item.starts_at).toLocaleString()}</Text>
      <Text>Booking {item.public_code}</Text>
      {item.queue_state ? <Text>Queue: {item.queue_state}{item.ticket_number ? ` · ticket ${item.ticket_number}` : ""}{item.queue_state === "waiting" ? ` · ${item.ahead_count} ahead` : ""}</Text> : null}
      {item.queue_state === "waiting" && item.ahead_count > 0 ? <Text>Estimated wait: about {item.ahead_count * Math.max(5, Math.round((new Date(item.ends_at).getTime() - new Date(item.starts_at).getTime()) / 60000))} minutes. This can change as the queue moves.</Text> : null}
      {item.status === "confirmed" && item.queue_state === "awaiting_arrival" ? <Button label="Show check-in QR" variant="outline" disabled={issueQr.isPending} onPress={() => issueQr.mutate(item.id)} /> : null}
      {qr?.appointmentId === item.id ? <View style={styles.qr}><QRCode value={qr.token} size={220} /><Text>Show this QR to the clinic. It expires in five minutes.</Text></View> : null}
      {item.status === "pending" || item.status === "confirmed" ? <Button label="Cancel booking" variant="outline" disabled={cancel.isPending} onPress={() => cancel.mutate(item)} /> : null}
    </View>)}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, gap: 16 }, title: { fontSize: 24, fontWeight: "700" }, card: { borderWidth: 1, borderColor: "#D8E4E8", borderRadius: 16, padding: 16, gap: 8 }, qr: { alignItems: "center", gap: 8, padding: 16, backgroundColor: "white" }, name: { fontSize: 17, fontWeight: "600" }, error: { color: "#B42318" } });
