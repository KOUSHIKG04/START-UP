import { useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Bell, MapPin, ArrowRight } from "lucide-react-native";
import { router } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMyDoctorPresence, getMyDoctorProfile, listMyNotifications, listMyPracticeAppointments, listMyPractices, setMyDoctorPresence } from "@startup/data-access";
import { formatDisplayDateTime, type ClinicPractice } from "@startup/contracts";
import { FadedScrollView, Loader, Skeleton } from "@startup/mobile-ui";
import { fontFamilies } from "@startup/design-tokens";
import { PatientCard } from "../../patients/components/PatientCard";
import { Choice, Heading, IconButton, Label, Panel } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";
import { getSelectedPracticeId, selectedPracticeQueryKey } from "../../practices/selectedPractice";

export function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { profile } = useMobileSession();
  const [showNotifications, setShowNotifications] = useState(false);
  const [presenceError, setPresenceError] = useState("");
  const presenceBusyRef = useRef(false);
  const client = useQueryClient();
  const practices = useQuery({ queryKey: ["my-practices"], queryFn: () => listMyPractices(supabase!), enabled: Boolean(supabase) });
  const selectedPracticeId = useQuery({ queryKey: selectedPracticeQueryKey(profile?.doctor?.id), queryFn: () => getSelectedPracticeId(profile!.doctor!.id), enabled: Boolean(profile?.doctor?.id) });
  const doctorProfile = useQuery({ queryKey: ["my-doctor-profile", profile?.doctor?.id], queryFn: () => getMyDoctorProfile(supabase!), enabled: Boolean(supabase && profile?.doctor?.id) });
  const appointments = useQuery({ queryKey: ["doctor-clinic-appointments", "all"], queryFn: () => listMyPracticeAppointments(supabase!), enabled: Boolean(supabase), refetchInterval: 15000 });
  const presence = useQuery({ queryKey: ["my-doctor-presence"], queryFn: () => getMyDoctorPresence(supabase!), enabled: Boolean(supabase && profile?.doctor?.id) });
  const notifications = useQuery({ queryKey: ["my-notifications"], queryFn: () => listMyNotifications(supabase!), enabled: Boolean(supabase && showNotifications), refetchInterval: showNotifications ? 15000 : false });
  const today = new Date().toDateString();
  const todayAppointments = appointments.data?.filter(item => new Date(item.starts_at).toDateString() === today && !["cancelled", "rejected"].includes(item.status)) ?? [];
  const waiting = todayAppointments.filter(item => item.queue_state === "waiting" || item.queue_state === "called").length;
  const approvedPractices = (practices.data as ClinicPractice[] | undefined)?.filter(item => item.is_clinician && item.verified) ?? [];
  const selectedPractice = approvedPractices.find(item => item.practice_id === selectedPracticeId.data) ?? approvedPractices[0];
  async function changePresence(value: boolean) {
    if (!supabase || presenceBusyRef.current) return;
    presenceBusyRef.current = true; setPresenceError("");
    try { await setMyDoctorPresence(supabase, value); await client.invalidateQueries({ queryKey: ["my-doctor-presence"] }); }
    catch (cause) { setPresenceError(cause instanceof Error ? cause.message : "Could not update your presence."); }
    finally { presenceBusyRef.current = false; }
  }
  return <View style={ui.screen}>
    <View style={[styles.header, { paddingTop: insets.top + 24 }]}>
      <View style={ui.flex}><Heading style={{ color: palette.dark, fontSize: 16 }}>Good Morning! {doctorProfile.data?.full_name ?? "Doctor"}</Heading><Pressable accessibilityRole="button" accessibilityLabel={`Practice location: ${selectedPractice?.facility_name ?? "No approved practice"}. Choose practice location`} onPress={() => router.push("/select-practice")} style={styles.location}><MapPin size={14} color={palette.dark} /><Label style={{ color: palette.dark, fontSize: 13 }}>{selectedPractice?.facility_name ?? "No approved practice"}</Label></Pressable></View>
      <IconButton label="Notifications" onPress={() => setShowNotifications(!showNotifications)} style={{ backgroundColor: palette.surface }}><Bell size={19} color={palette.primary} /></IconButton>
    </View>
    <FadedScrollView edgeColor="white" contentContainerStyle={[styles.content, { paddingBottom: 130 + insets.bottom }]}>
      {showNotifications ? <Panel><Heading>Notifications</Heading>
        {notifications.isLoading ? <Loader theme="doctor" /> : null}
        {notifications.isError ? <Label style={ui.error}>Could not load notifications.</Label> : null}
        {notifications.data?.length === 0 ? <Label muted>No notifications yet.</Label> : null}
        {notifications.data?.map(item => <View key={item.id}><Label>{item.template_key === "appointment.check_in" ? "Patient arrived at clinic" : item.template_key === "appointment.requested" ? "Appointment requested" : item.template_key === "appointment.auto_confirmed" || item.template_key === "appointment.approve" ? "Appointment confirmed" : item.template_key.startsWith("appointment.") ? "Appointment update" : item.template_key.replaceAll(".", " ")}</Label><Label muted>{typeof item.safe_parameters.booking_code === "string" && item.template_key === "appointment.check_in" ? `Booking ${item.safe_parameters.booking_code} · ` : ""}{typeof item.safe_parameters.status === "string" ? `Status: ${item.safe_parameters.status.replaceAll("_", " ")} · ` : ""}{formatDisplayDateTime(item.created_at)}</Label></View>)}
      </Panel> : null}
      <View style={ui.row}>{[[String(todayAppointments.length), "Appointments"], [String(waiting), "In Queue"], ["—", "Today’s Earnings"]].map(([value, title], index) => <View key={title} style={styles.stat}><Heading style={{ fontSize: 24, lineHeight: 30, color: index === 1 ? palette.text : index === 2 ? "#22A86B" : palette.accent }}>{value}</Heading><Label muted style={styles.caption}>{title}</Label></View>)}</View>
      <View style={[ui.between, { marginTop: 12 }]}><Heading>Today’s Appointment</Heading><IconButton label="See all appointments" onPress={() => router.navigate("/appointments")} style={{ width: 80 }}><View style={{ ...ui.row, gap: 4 }}><Label style={{ color: palette.dark, fontSize: 13 }}>See all</Label><ArrowRight size={15} color={palette.dark} /></View></IconButton></View>
      {appointments.isLoading ? <Skeleton theme="doctor" height={110} radius={14} /> : null}
      {appointments.isError ? <Panel><Label style={ui.error}>Could not load appointments.</Label></Panel> : null}
      {todayAppointments.length === 0 && !appointments.isLoading && !appointments.isError ? <Panel><Label muted>No clinic appointments today.</Label></Panel> : null}
      {todayAppointments.slice(0, 2).map(item => <PatientCard key={item.id} appointment={item} home onOpen={() => router.navigate({ pathname: "/appointments", params: { appointmentId: item.id } })} onAction={() => router.navigate({ pathname: "/appointments", params: { appointmentId: item.id } })} />)}
      <View style={styles.availability}><View style={[ui.row, { gap: 0, borderRadius: 24, padding: 4, backgroundColor: palette.surface }]}><Choice label="Out" selected={!presence.data} onPress={() => void changePresence(false)} /><Choice label="In" selected={Boolean(presence.data)} onPress={() => void changePresence(true)} /></View><Label muted style={{ fontSize: 11 }}>Clinic presence</Label></View>
      {presenceError ? <Label style={ui.error}>{presenceError}</Label> : null}
      {practices.isError ? <Label style={ui.error}>Could not load your clinic.</Label> : null}
    </FadedScrollView>
  </View>;
}
const styles = StyleSheet.create({ header: { backgroundColor: palette.chart, paddingHorizontal: 24, paddingBottom: 22, flexDirection: "row", alignItems: "center" }, location: { flexDirection: "row", alignItems: "center", gap: 10, minHeight: 44 }, content: { padding: 16, paddingTop: 10, gap: 14, flexGrow: 1 }, stat: { flex: 1, minWidth: 0, minHeight: 72, borderRadius: 12, backgroundColor: palette.subtle, justifyContent: "center", alignItems: "center", paddingVertical: 10 }, caption: { fontSize: 11, fontFamily: fontFamilies.medium }, availability: { flex: 1, minHeight: 110, justifyContent: "flex-end", alignItems: "flex-end", paddingTop: 20 } });
