import { useState } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { addClinicUnavailability, listClinicAppointments, listClinicUnavailability, listMyClinicSessions, listMyPractices, publishClinicSession, revokeClinicUnavailability, setClinicAutoConfirmLimit, transitionClinicAppointment } from "@startup/data-access";
import type { ClinicSession, ClinicUnavailability } from "@startup/contracts";
import { Button, Input, SafeAreaView } from "@startup/mobile-ui";
import { supabase } from "../../../services/supabase";
import { ConsultationForm } from "../../../features/clinic/components/ConsultationForm";

type Action = "approve" | "reject" | "check_in" | "call" | "hold" | "resume" | "start" | "complete";

export default function ClinicOperations() {
  const queryClient = useQueryClient();
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [minutes, setMinutes] = useState("15");
  const [fee, setFee] = useState("");
  const [note, setNote] = useState("");
  const [autoLimits, setAutoLimits] = useState<Record<string, string>>({});
  const [leaveStart, setLeaveStart] = useState("");
  const [leaveEnd, setLeaveEnd] = useState("");
  const [leaveReason, setLeaveReason] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const practices = useQuery({ queryKey: ["my-practices"], queryFn: () => listMyPractices(supabase!), enabled: !!supabase });
  const sessions = useQuery({ queryKey: ["doctor-clinic-sessions", practiceId], queryFn: () => listMyClinicSessions(supabase!, practiceId!), enabled: !!supabase && !!practiceId });
  const unavailable = useQuery({ queryKey: ["doctor-clinic-unavailability", practiceId], queryFn: () => listClinicUnavailability(supabase!, practiceId!), enabled: !!supabase && !!practiceId });
  const appointments = useQuery({ queryKey: ["doctor-clinic-appointments", practiceId], queryFn: () => listClinicAppointments(supabase!, practiceId!), enabled: !!supabase && !!practiceId, refetchInterval: 15000 });
  const publish = useMutation({
    mutationFn: async () => {
      if (!practiceId) throw new Error("Choose a clinic.");
      const startsAt = new Date(start.trim().replace(" ", "T"));
      const endsAt = new Date(end.trim().replace(" ", "T"));
      if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) throw new Error("Enter valid local date and times.");
      return publishClinicSession(supabase!, { practiceId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), slotMinutes: Number(minutes), feeMinor: Math.round(Number(fee) * 100), currency: "INR" });
    },
    onSuccess: () => { setError(""); setMessage("Clinic session published. Patients can now see its available slots."); void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] }); void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-sessions"] }); },
    onError: () => setError("Could not publish clinic slots. Check the details and try again."),
  });
  const transition = useMutation({
    mutationFn: ({ id, rowVersion, action }: { id: string; rowVersion: string; action: Action }) => transitionClinicAppointment(supabase!, {
      appointmentId: id, expectedVersion: Number(rowVersion), action, note: action === "reject" || action === "hold" || action === "complete" ? note : null,
    }),
    onSuccess: () => { setNote(""); setError(""); setMessage("Appointment updated."); void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] }); },
    onError: () => setError("Could not update this appointment. Refresh and try again."),
  });
  const autoConfirm = useMutation({
    mutationFn: (session: ClinicSession) => setClinicAutoConfirmLimit(supabase!, {
      sessionId: session.id, expectedVersion: Number(session.row_version), limit: Number(autoLimits[session.id] ?? session.auto_confirm_limit ?? 0),
    }),
    onSuccess: () => { setError(""); setMessage("Auto-confirm limit updated for this session."); void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-sessions"] }); },
    onError: () => setError("Could not update the auto-confirm limit. Refresh the session and try again."),
  });
  const addLeave = useMutation({
    mutationFn: () => {
      if (!practiceId) throw new Error("Choose a practice.");
      const startsAt = new Date(leaveStart.trim().replace(" ", "T"));
      const endsAt = new Date(leaveEnd.trim().replace(" ", "T"));
      if (isNaN(startsAt.getTime()) || isNaN(endsAt.getTime())) throw new Error("Enter valid dates.");
      return addClinicUnavailability(supabase!, { practiceId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: leaveReason });
    },
    onSuccess: () => { setLeaveStart(""); setLeaveEnd(""); setLeaveReason(""); setError(""); setMessage("Unavailable time added. Pending requests in that period were rejected."); void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-unavailability"] }); void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-appointments"] }); },
    onError: () => setError("Could not add unavailable time. Resolve any confirmed bookings first and check the dates."),
  });
  const revokeLeave = useMutation({
    mutationFn: (item: ClinicUnavailability) => revokeClinicUnavailability(supabase!, { exceptionId: item.id, expectedVersion: Number(item.row_version) }),
    onSuccess: () => { setError(""); setMessage("Unavailable time revoked."); void queryClient.invalidateQueries({ queryKey: ["doctor-clinic-unavailability"] }); },
    onError: () => setError("Could not revoke unavailable time. Refresh and try again."),
  });
  return <SafeAreaView style={styles.screen}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.title}>Clinic operations</Text>
    <Text>Only verified practices can publish availability or manage appointments.</Text>
    {practices.error ? <Text accessibilityRole="alert">Could not load your practices. Try again.</Text> : null}
    {practices.isLoading ? <Text>Loading practices…</Text> : null}
    {practices.data?.length === 0 ? <Text>No linked practice. A clinic owner or admin must add you to one, or register a solo clinic.</Text> : null}
    {practices.data?.map((practice) => <Button key={practice.practice_id} label={`${practice.facility_name}${practice.verified ? "" : " · awaiting verification"}`} variant={practiceId === practice.practice_id ? "primary" : "outline"} onPress={() => setPracticeId(practice.practice_id)} />)}
    {practiceId ? <>
      <Text style={styles.subtitle}>Publish a clinic session</Text>
      <Text>Enter date and time in this device’s time zone, for example 2026-10-01 09:00. Slots are created by the backend.</Text>
      <Input label="Starts (YYYY-MM-DD HH:mm)" value={start} onChangeText={setStart} />
      <Input label="Ends (YYYY-MM-DD HH:mm)" value={end} onChangeText={setEnd} />
      <Input label="Minutes per slot" value={minutes} onChangeText={setMinutes} keyboardType="number-pad" />
      <Input label="Consultation fee (INR)" value={fee} onChangeText={setFee} keyboardType="decimal-pad" />
      <Button label="Publish slots" disabled={publish.isPending || !start || !end || !fee} onPress={() => publish.mutate()} />
      <Text style={styles.subtitle}>Auto-confirm limits</Text>
      <Text>Set 0 for manual approval. The count applies to confirmed bookings across each session.</Text>
      {sessions.isLoading ? <Text>Loading sessions…</Text> : null}
      {sessions.error ? <Text accessibilityRole="alert">Could not load sessions.</Text> : null}
      {sessions.data?.map((session) => <View key={session.id} style={styles.card}>
        <Text>{new Date(session.starts_at).toLocaleString()} · {session.state}</Text>
        <Text>Capacity {session.hard_capacity} · auto-confirm {session.auto_confirm_limit ?? 0}</Text>
        <Input label="Auto-confirm first N bookings" value={autoLimits[session.id] ?? String(session.auto_confirm_limit ?? 0)}
          onChangeText={(value) => setAutoLimits((current) => ({ ...current, [session.id]: value }))} keyboardType="number-pad" />
        <Button label="Save limit" variant="outline" disabled={autoConfirm.isPending || !Number.isInteger(Number(autoLimits[session.id] ?? session.auto_confirm_limit ?? 0)) || Number(autoLimits[session.id] ?? session.auto_confirm_limit ?? 0) < 0 || Number(autoLimits[session.id] ?? session.auto_confirm_limit ?? 0) > session.hard_capacity}
          onPress={() => autoConfirm.mutate(session)} />
      </View>)}
      <Text style={styles.subtitle}>Unavailable dates</Text>
      <Text>Confirmed bookings must be resolved first. Pending requests during new unavailable time are rejected.</Text>
      <Input label="Starts (YYYY-MM-DD HH:mm)" value={leaveStart} onChangeText={setLeaveStart} />
      <Input label="Ends (YYYY-MM-DD HH:mm)" value={leaveEnd} onChangeText={setLeaveEnd} />
      <Input label="Reason" value={leaveReason} onChangeText={setLeaveReason} />
      <Button label="Add unavailable time" variant="outline" disabled={addLeave.isPending || !leaveStart || !leaveEnd || leaveReason.trim().length < 2} onPress={() => addLeave.mutate()} />
      {unavailable.error ? <Text accessibilityRole="alert">Could not load unavailable dates.</Text> : null}
      {unavailable.data?.map((item) => <View key={item.id} style={styles.card}>
        <Text>{new Date(item.starts_at).toLocaleString()} to {new Date(item.ends_at).toLocaleString()}</Text>
        <Text>{item.reason} · {item.state}</Text>
        {item.state === "active" ? <Button label="Revoke" variant="outline" disabled={revokeLeave.isPending} onPress={() => revokeLeave.mutate(item)} /> : null}
      </View>)}
      <Text style={styles.subtitle}>Appointment requests</Text>
      <Button label="Refresh requests" variant="outline" onPress={() => void appointments.refetch()} />
      {appointments.isLoading ? <Text>Loading appointments…</Text> : null}
      {appointments.error ? <Text accessibilityRole="alert">Could not load appointments. Try again.</Text> : null}
      {appointments.data?.length === 0 ? <Text>No appointments for this clinic yet.</Text> : null}
      <Input label="Rejection or hold reason, or signed assessment (when needed)" value={note} onChangeText={setNote} multiline />
      {appointments.data?.map((item) => <View key={item.id} style={styles.card}>
        <Text style={styles.name}>{item.patient_name} · {item.status}</Text>
        <Text>{new Date(item.starts_at).toLocaleString()} · {item.public_code}</Text>
        {item.reason ? <Text>Reason: {item.reason}</Text> : null}
        {item.queue_state ? <Text>Queue: {item.queue_state}</Text> : null}
        {item.status === "pending" ? <>
          <Button label="Accept request" disabled={transition.isPending} onPress={() => transition.mutate({ id: item.id, rowVersion: item.row_version, action: "approve" })} />
          <Button label="Reject with reason" variant="outline" disabled={transition.isPending || !note.trim()} onPress={() => transition.mutate({ id: item.id, rowVersion: item.row_version, action: "reject" })} />
        </> : null}
        {item.status === "confirmed" ? <>
          {item.queue_state === "awaiting_arrival" ? <Button label="Check in patient" disabled={transition.isPending} onPress={() => transition.mutate({ id: item.id, rowVersion: item.row_version, action: "check_in" })} /> : null}
          {item.queue_state === "waiting" ? <Button label="Call patient" disabled={transition.isPending} onPress={() => transition.mutate({ id: item.id, rowVersion: item.row_version, action: "call" })} /> : null}
          {(item.queue_state === "waiting" || item.queue_state === "called") ? <Button label="Hold patient" variant="outline" disabled={transition.isPending || !note.trim()} onPress={() => transition.mutate({ id: item.id, rowVersion: item.row_version, action: "hold" })} /> : null}
          {item.queue_state === "held" ? <Button label="Return to queue" variant="outline" disabled={transition.isPending} onPress={() => transition.mutate({ id: item.id, rowVersion: item.row_version, action: "resume" })} /> : null}
          {item.queue_state === "called" && item.can_consult ? <Button label="Start consultation" disabled={transition.isPending} onPress={() => transition.mutate({ id: item.id, rowVersion: item.row_version, action: "start" })} /> : null}
        </> : null}
        {item.status === "in_consultation" && item.can_consult ? <>
          <ConsultationForm appointmentId={item.id} />
          <Button label="Sign assessment and complete" disabled={transition.isPending || !note.trim()} onPress={() => transition.mutate({ id: item.id, rowVersion: item.row_version, action: "complete" })} />
        </> : null}
      </View>)}
    </> : null}
    {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
    {message ? <Text accessibilityRole="alert">{message}</Text> : null}
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ screen: { flex: 1 }, content: { padding: 20, gap: 14 }, title: { fontSize: 24, fontWeight: "700" }, subtitle: { fontSize: 19, fontWeight: "600", marginTop: 8 }, card: { borderWidth: 1, borderColor: "#D8E4E8", borderRadius: 16, padding: 16, gap: 8 }, name: { fontSize: 17, fontWeight: "600" }, error: { color: "#B42318" } });
