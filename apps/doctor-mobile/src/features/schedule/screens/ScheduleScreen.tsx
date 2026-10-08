import { useEffect, useState } from "react";
import { Switch, View } from "react-native";
import { Button, Input, Loader, Skeleton, useToast } from "@startup/mobile-ui";
import { Calendar, Check } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addClinicUnavailability, getMyDoctorDailySlotUsage, getMySchedulePreferences, listClinicUnavailability, listMyClinicSessions, listMyDoctorFacilityRequests, listMyPractices, publishSelectedDoctorSlots, revokeClinicUnavailability, saveMySchedulePreferences, setClinicAutoConfirmLimit } from "@startup/data-access";
import { parseDisplayDate, type ClinicPractice } from "@startup/contracts";
import { supabase, useMobileSession } from "../../../services/supabase";
import { getSelectedPracticeId, selectedPracticeQueryKey, setSelectedPracticeId } from "../../practices/selectedPractice";
import {
  Choice,
  DoctorScreen,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { endMinutes, minutes, scheduleError, slotStartTimes, toggleSelectedSlot } from "../utils/schedule";
import type { Schedule } from "../../../types/doctor";
import {
  PublishSessionPanel,
  PublishedSessionsPanel,
  UnavailableTimePanel,
  ConsultationChargesPanel,
  WorkingDaysPanel,
  ClinicHoursPanel,
} from "../components/ScheduleOperationsPanels";

function NumberSetting({
  title,
  value,
  min,
  max,
  suffix,
  onChange,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  return (
    <View style={{ gap: 5 }}>
      <View style={ui.between}>
        <Label style={{ fontSize: 13 }}>{title}</Label>
        <Label muted style={{ fontSize: 12 }}>{min}–{max} {suffix}</Label>
      </View>
      <Input
        accessibilityLabel={`${title} in ${suffix}`}
        value={text}
        onChangeText={(next) => {
          if (/^\d{0,3}$/.test(next)) {
            setText(next);
            if (next !== "") onChange(Number(next));
          }
        }}
        onBlur={() => setText(String(value))}
        selectTextOnFocus
        keyboardType="number-pad"
      />
    </View>
  );
}
export function ScheduleScreen() {
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const { profile } = useMobileSession();
  const doctorId = profile?.doctor?.id;
  const practices = useQuery({ queryKey: ["my-practices"], queryFn: () => listMyPractices(supabase!), enabled: Boolean(supabase), refetchInterval: (query) => query.state.data?.length ? false : 30000 });
  const preferredPractice = useQuery({ queryKey: selectedPracticeQueryKey(doctorId), queryFn: () => getSelectedPracticeId(doctorId!), enabled: Boolean(doctorId) });
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const availablePractices = practices.data as ClinicPractice[] | undefined;
  const selectedPracticeId = availablePractices?.find(item => item.practice_id === practiceId)?.practice_id ?? availablePractices?.find(item => item.practice_id === preferredPractice.data)?.practice_id ?? availablePractices?.[0]?.practice_id ?? null;
  const selectedPractice = practices.data?.find(item => item.practice_id === selectedPracticeId);
  const associationRequests = useQuery({ queryKey: ["my-doctor-facility-requests"], queryFn: () => listMyDoctorFacilityRequests(supabase!), enabled: Boolean(supabase && practices.data && !selectedPracticeId), refetchInterval: 30000 });
  const pendingAssociation = associationRequests.data?.find(item => item.status === "pending");
  const rejectedAssociation = associationRequests.data?.find(item => item.status === "rejected");
  const saved = useQuery({ queryKey: ["my-doctor-schedule", selectedPracticeId], queryFn: () => getMySchedulePreferences(supabase!, selectedPracticeId!), enabled: Boolean(supabase && selectedPracticeId) });
  const sessions = useQuery({ queryKey: ["doctor-clinic-sessions", selectedPracticeId], queryFn: () => listMyClinicSessions(supabase!, selectedPracticeId!), enabled: Boolean(supabase && selectedPracticeId) });
  const unavailable = useQuery({ queryKey: ["doctor-clinic-unavailability", selectedPracticeId], queryFn: () => listClinicUnavailability(supabase!, selectedPracticeId!), enabled: Boolean(supabase && selectedPracticeId) });
  const [draft, setDraft] = useState<Schedule>({ days: [], start: "09:00", end: "17:00", duration: 15, onlineDuration: 15, homeDuration: 60, online: 8, walkIn: 12, autoAccept: false, autoLimit: 1, homeVisits: false, homeRadius: "", onlineFee: "0", clinicFee: "0", homeFee: "0" });
  useEffect(() => { if (!saved.data) return; const p = saved.data; setDraft({ days: p.working_days.map(day => day - 1), start: p.clinic_start.slice(0, 5), end: p.clinic_end.slice(0, 5), duration: p.slot_minutes, onlineDuration: p.online_slot_minutes, homeDuration: p.home_slot_minutes, online: p.online_daily_limit, walkIn: p.walkin_daily_limit, autoAccept: p.auto_accept, autoLimit: p.auto_accept_limit, homeVisits: p.home_visits, homeRadius: p.home_radius_km === null ? "" : String(p.home_radius_km), onlineFee: String((p.online_fee_minor ?? 0) / 100), clinicFee: String(p.clinic_fee_minor / 100), homeFee: String((p.home_fee_minor ?? 0) / 100) }); setPublishWindows(current => ({ ...current, clinic: { start: p.clinic_start.slice(0, 5), end: p.clinic_end.slice(0, 5) } })); }, [saved.data]);
  const [publishDate, setPublishDate] = useState("");
  const publishDateIso = parseDisplayDate(publishDate);
  const dailyUsage = useQuery({
    queryKey: ["doctor-daily-slot-usage", selectedPracticeId, publishDateIso],
    queryFn: () => getMyDoctorDailySlotUsage(supabase!, selectedPracticeId!, publishDateIso!),
    enabled: Boolean(supabase && selectedPracticeId && saved.data && publishDateIso),
  });
  const [publishWindows, setPublishWindows] = useState({
    clinic: { start: "09:00", end: "12:00" },
    online: { start: "13:00", end: "15:00" },
    home: { start: "16:00", end: "17:00" },
  });
  const [selectedSlots, setSelectedSlots] = useState<Record<"clinic" | "online" | "home", string[]>>({ clinic: [], online: [], home: [] });
  useEffect(() => {
    if (!preferredPractice.data || !availablePractices?.some(item => item.practice_id === preferredPractice.data)) return;
    setPracticeId(preferredPractice.data);
    setSelectedSlots({ clinic: [], online: [], home: [] });
  }, [preferredPractice.data, availablePractices]);
  const [sessionLimits, setSessionLimits] = useState<Record<string, string>>({});
  const [leaveDate, setLeaveDate] = useState(""); const [leaveStart, setLeaveStart] = useState(""); const [leaveEnd, setLeaveEnd] = useState(""); const [leaveReason, setLeaveReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const reportError = (text: string) => showToast({ title: "Schedule error", message: text, type: "error" });
  const reportSuccess = (text: string) => showToast({ title: text, type: "success" });
  const failPublish = (mode: "clinic" | "online" | "home", message: string) => {
    showToast({ title: `Could not publish ${mode} slots`, message, type: "error" });
  };
  const update = (changes: Partial<Schedule>) => {
    setDraft((current) => ({ ...current, ...changes }));
    if (changes.start !== undefined || changes.end !== undefined) {
      setPublishWindows((current) => ({
        ...current,
        clinic: {
          start: changes.start ?? current.clinic.start,
          end: changes.end ?? current.clinic.end,
        },
      }));
      setSelectedSlots((current) => ({ ...current, clinic: [] }));
    }
  };
  const timeValid =
    Number.isFinite(minutes(draft.start)) &&
    Number.isFinite(endMinutes(draft.end));
  const remainingSlots = {
    clinic: Math.max(0, draft.walkIn - (dailyUsage.data?.clinic ?? 0)),
    online: Math.max(0, draft.online - (dailyUsage.data?.online ?? 0)),
    home: 100,
  };
  useEffect(() => {
    if (!dailyUsage.data) return;
    setSelectedSlots(current => {
      const clinic = current.clinic.slice(0, remainingSlots.clinic);
      const online = current.online.slice(0, remainingSlots.online);
      if (clinic.length === current.clinic.length && online.length === current.online.length) return current;
      return { ...current, clinic, online };
    });
  }, [dailyUsage.data, remainingSlots.clinic, remainingSlots.online]);
  function toggleSlot(mode: "clinic" | "online" | "home", slot: string) {
    const limit = mode === "home" ? 100 : dailyUsage.data ? remainingSlots[mode] : 0;
    setSelectedSlots(current => {
      const next = toggleSelectedSlot(current[mode], slot, limit);
      return next === current[mode] ? current : { ...current, [mode]: next };
    });
  }
  async function save() {
    const problem = scheduleError(draft);
    if (problem) { reportError(problem); return; }
    if (!supabase || !selectedPracticeId) { reportError("Choose your clinic first."); return; }
    setBusy(true); setPendingAction("save");
    try {
      const savedSchedule = await saveMySchedulePreferences(supabase, selectedPracticeId, { workingDays: draft.days.map(day => day + 1), clinicStart: draft.start, clinicEnd: draft.end, slotMinutes: draft.duration, onlineSlotMinutes: draft.onlineDuration, homeSlotMinutes: draft.homeDuration, onlineDailyLimit: draft.online, walkinDailyLimit: draft.walkIn, autoAccept: draft.autoAccept, autoAcceptLimit: draft.autoAccept ? draft.autoLimit : 0, homeVisits: draft.homeVisits, homeRadiusKm: draft.homeRadius ? Number(draft.homeRadius) : null, onlineFeeMinor: Math.round(Number(draft.onlineFee) * 100), clinicFeeMinor: Math.round(Number(draft.clinicFee) * 100), homeFeeMinor: Math.round(Number(draft.homeFee) * 100) }, Number(saved.data?.row_version ?? 0));
      queryClient.setQueryData(["my-doctor-schedule", selectedPracticeId], savedSchedule);
      setSelectedSlots({ clinic: [], online: [], home: [] });
      reportSuccess("Schedule saved. Publish service slots below to show availability to patients.");
    } catch (cause) { reportError(cause instanceof Error ? cause.message : "Could not save schedule."); }
    finally { setBusy(false); setPendingAction(null); }
  }
  async function publish(mode: "clinic" | "online" | "home") {
    if (!supabase || !selectedPracticeId || !saved.data) { failPublish(mode, "Save your schedule first."); return; }
    if (!selectedPractice?.verified) { failPublish(mode, "Doctor verification and an active practice are required to publish slots."); return; }
    if (!publishDateIso) { failPublish(mode, "Enter a valid date as DD-MM-YYYY."); return; }
    const selectedDate = new Date(`${publishDateIso}T12:00:00`);
    const weekday = (selectedDate.getDay() + 6) % 7;
    if (!draft.days.includes(weekday)) { failPublish(mode, "That date is not in your saved working days."); return; }
    const chosen = selectedSlots[mode];
    const slotMinutes = mode === "clinic" ? draft.duration : mode === "online" ? draft.onlineDuration : draft.homeDuration;
    const available = slotStartTimes(publishWindows[mode].start, publishWindows[mode].end, slotMinutes);
    if (!available.length) { failPublish(mode, "Enter a valid start and end time that fits this service's slot duration."); return; }
    if (!available.some(slot => new Date(`${publishDateIso}T${slot}:00`) > new Date())) { failPublish(mode, "All times in this block have already started. Choose a future date or later time."); return; }
    if (mode === "home" && !draft.homeVisits) { failPublish(mode, "Enable home visits and save your schedule first."); return; }
    if (mode === "online" && draft.online < 1) { failPublish(mode, "Increase the online daily slot limit and save your schedule first."); return; }
    if (mode !== "home" && !dailyUsage.data) { failPublish(mode, dailyUsage.isError ? "Could not check this date's daily slot count. Reopen the screen and try again." : "Checking this date's daily slot count. Try again in a moment."); return; }
    if (mode !== "home" && remainingSlots[mode] === 0) { failPublish(mode, "The daily limit is reached. Increase this service's Daily Slot Limit above, then select more times."); return; }
    if (!chosen.length || chosen.some(slot => !available.includes(slot))) { failPublish(mode, "Tap at least one available time pill before publishing."); return; }
    if (chosen.length > 100) { failPublish(mode, "Select no more than 100 slots at a time."); return; }
    const slotStarts = chosen.map(slot => new Date(`${publishDateIso}T${slot}:00`));
    if (slotStarts.some(start => Number.isNaN(start.getTime()) || start <= new Date())) { failPublish(mode, "Choose future slots. A time that has already started today cannot be booked."); return; }
    if (mode === "online" && chosen.length > remainingSlots.online) { failPublish(mode, "Selected online slots exceed the remaining daily limit."); return; }
    if (mode === "clinic" && chosen.length > remainingSlots.clinic) { failPublish(mode, "Selected clinic slots exceed the remaining daily limit."); return; }
    const overlap = slotStarts.some(start => sessions.data?.some(item => item.state !== "cancelled" && start < new Date(item.ends_at) && new Date(start.getTime() + slotMinutes * 60000) > new Date(item.starts_at)));
    if (overlap) { failPublish(mode, "One or more selected slots overlap a published session. Choose different slots."); return; }
    setBusy(true); setPendingAction(`publish:${mode}`);
    try {
      if (mode !== "home" && (draft.online !== saved.data.online_daily_limit || draft.walkIn !== saved.data.walkin_daily_limit)) {
        const problem = scheduleError(draft);
        if (problem) throw new Error(problem);
        const savedSchedule = await saveMySchedulePreferences(supabase, selectedPracticeId, { workingDays: draft.days.map(day => day + 1), clinicStart: draft.start, clinicEnd: draft.end, slotMinutes: draft.duration, onlineSlotMinutes: draft.onlineDuration, homeSlotMinutes: draft.homeDuration, onlineDailyLimit: draft.online, walkinDailyLimit: draft.walkIn, autoAccept: draft.autoAccept, autoAcceptLimit: draft.autoAccept ? draft.autoLimit : 0, homeVisits: draft.homeVisits, homeRadiusKm: draft.homeRadius ? Number(draft.homeRadius) : null, onlineFeeMinor: Math.round(Number(draft.onlineFee) * 100), clinicFeeMinor: Math.round(Number(draft.clinicFee) * 100), homeFeeMinor: Math.round(Number(draft.homeFee) * 100) }, Number(saved.data.row_version));
        queryClient.setQueryData(["my-doctor-schedule", selectedPracticeId], savedSchedule);
      }
      const ids = await publishSelectedDoctorSlots(supabase, { practiceId: selectedPracticeId, mode, slotStarts: slotStarts.map(start => start.toISOString()), slotMinutes, feeMinor: Math.round(Number(mode === "online" ? draft.onlineFee : mode === "home" ? draft.homeFee : draft.clinicFee) * 100), currency: "INR" });
      let autoAcceptFailed = false;
      if (draft.autoAccept) {
        try {
          const created = (await listMyClinicSessions(supabase, selectedPracticeId))
            .filter(item => ids.includes(item.id))
            .sort((left, right) => new Date(left.starts_at).getTime() - new Date(right.starts_at).getTime());
          let remaining = draft.autoLimit;
          for (const session of created) {
            const limit = Math.min(remaining, session.hard_capacity);
            if (limit > 0) await setClinicAutoConfirmLimit(supabase, { sessionId: session.id, expectedVersion: Number(session.row_version), limit });
            remaining -= limit;
          }
        } catch {
          autoAcceptFailed = true;
        }
      }
      queryClient.setQueryData(
        ["doctor-daily-slot-usage", selectedPracticeId, publishDateIso],
        (current: typeof dailyUsage.data) => current
          ? { ...current, [mode]: current[mode] + chosen.length }
          : current,
      );
      setSelectedSlots(current => ({ ...current, [mode]: [] }));
      await Promise.allSettled([
        queryClient.invalidateQueries({ queryKey: ["doctor-clinic-sessions", selectedPracticeId] }),
        queryClient.invalidateQueries({ queryKey: ["doctor-daily-slot-usage", selectedPracticeId, publishDateIso] }),
      ]);
      if (autoAcceptFailed) reportError("Slots were published, but the auto-accept limit could not be set. Review the published sessions below.");
      else reportSuccess(`Published ${chosen.length} ${mode === "online" ? "online" : mode === "home" ? "home-visit" : "clinic"} slots for ${publishDate}.`);
    } catch (cause) { failPublish(mode, cause instanceof Error ? cause.message : "Could not publish slots."); }
    finally { setBusy(false); setPendingAction(null); }
  }
  async function addLeave() {
    if (!supabase || !selectedPracticeId) return;
    setBusy(true); setPendingAction("add-leave");
    try { const leaveDateIso = parseDisplayDate(leaveDate); if (!leaveDateIso) throw new Error("Enter a valid date as DD-MM-YYYY."); if (!Number.isFinite(minutes(leaveStart)) || !Number.isFinite(endMinutes(leaveEnd))) throw new Error("Enter a valid unavailable time; the end may be 24:00."); const startsAt = new Date(`${leaveDateIso}T${leaveStart}:00`); const endsAt = leaveEnd === "24:00" ? new Date(`${leaveDateIso}T00:00:00`) : new Date(`${leaveDateIso}T${leaveEnd}:00`); if (leaveEnd === "24:00") endsAt.setDate(endsAt.getDate() + 1); if (Number.isNaN(startsAt.getTime()) || endsAt <= startsAt) throw new Error("Enter a valid unavailable time."); await addClinicUnavailability(supabase, { practiceId: selectedPracticeId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: leaveReason }); await queryClient.invalidateQueries({ queryKey: ["doctor-clinic-unavailability", selectedPracticeId] }); setLeaveDate(""); setLeaveStart(""); setLeaveEnd(""); setLeaveReason(""); reportSuccess("Unavailable time saved."); }
    catch (cause) { reportError(cause instanceof Error ? cause.message : "Could not save unavailable time."); }
    finally { setBusy(false); setPendingAction(null); }
  }
  return (
    <DoctorScreen
      title="Manage Schedule"
      background="#F6F9F9"
    >
      {practices.isLoading ? <Loader theme="doctor" style={{ minHeight: 40 }} /> : null}
      {practices.isError ? <Label style={ui.error}>Could not load your clinics.</Label> : null}
      {practices.data && practices.data.length > 1 ? <Panel><Heading style={{ fontSize: 13 }}>Your clinic</Heading><View style={ui.wrap}>{(practices.data as ClinicPractice[]).map((practice: ClinicPractice) => <Choice key={practice.practice_id} label={practice.facility_name} selected={selectedPracticeId === practice.practice_id} onPress={() => { setPracticeId(practice.practice_id); setSelectedSlots({ clinic: [], online: [], home: [] }); if (doctorId && practice.is_clinician && practice.verified) void setSelectedPracticeId(doctorId, practice.practice_id).then(() => queryClient.setQueryData(selectedPracticeQueryKey(doctorId), practice.practice_id)).catch(() => showToast({ title: "Could not remember practice", type: "error" })); }} />)}</View></Panel> : null}
      {selectedPractice ? <Label muted>{selectedPractice.facility_name}{selectedPractice.verified ? "" : " · awaiting verification"}</Label> : null}
      {saved.isLoading ? <Skeleton theme="doctor" height={72} radius={12} /> : null}
      {saved.isError ? <Label style={ui.error}>Could not load saved schedule.</Label> : null}
      <WorkingDaysPanel
        selectedDays={draft.days}
        onToggleDay={(index) =>
          update({
            days: draft.days.includes(index)
              ? draft.days.filter((d) => d !== index)
              : [...draft.days, index],
          })
        }
      />
      <ClinicHoursPanel
        start={draft.start}
        end={draft.end}
        timeValid={timeValid}
        onUpdate={update}
      />
      <Panel>
        <NumberSetting
          title="Clinic slot duration"
          value={draft.duration}
          min={5}
          max={120}
          suffix="minutes"
          onChange={(duration) => { update({ duration }); setSelectedSlots(current => ({ ...current, clinic: [] })); }}
        />
        <NumberSetting
          title="Online slot duration"
          value={draft.onlineDuration}
          min={5}
          max={120}
          suffix="minutes"
          onChange={(onlineDuration) => { update({ onlineDuration }); setSelectedSlots(current => ({ ...current, online: [] })); }}
        />
        <NumberSetting
          title="Home-visit slot duration"
          value={draft.homeDuration}
          min={30}
          max={120}
          suffix="minutes"
          onChange={(homeDuration) => { update({ homeDuration }); setSelectedSlots(current => ({ ...current, home: [] })); }}
        />
      </Panel>
      <Panel>
        <Heading style={{ fontSize: 13 }}>Daily Slot Limits</Heading>
        <NumberSetting
          title="Online appointments"
          value={draft.online}
          min={0}
          max={100}
          suffix="slots"
          onChange={(online) => update({ online })}
        />
        <NumberSetting
          title="Clinic appointments"
          value={draft.walkIn}
          min={0}
          max={100}
          suffix="slots"
          onChange={(walkIn) => update({ walkIn })}
        />
      </Panel>
      <Panel>
        <View style={ui.between}>
          <Heading style={{ fontSize: 13 }}>Auto Accept Bookings</Heading>
          <Switch
            accessibilityLabel="Auto Accept Bookings"
            value={draft.autoAccept}
            onValueChange={(autoAccept) => update({ autoAccept })}
            trackColor={{ false: "#D1D5DB", true: palette.primary }}
          />
        </View>
        <Label muted style={{ fontSize: 12 }}>
          {draft.autoAccept
            ? `Published clinic sessions can auto-accept up to ${draft.autoLimit} bookings.`
            : "All new bookings will need manual approval."}
        </Label>
        {draft.autoAccept && (
          <>
            <NumberSetting
              title="Daily auto-accept limit"
              value={draft.autoLimit}
              min={1}
              max={50}
              suffix="bookings"
              onChange={(autoLimit) => update({ autoLimit })}
            />
            {[
              "Bookings are accepted instantly under limit",
              "Bookings beyond the limit will need manual approval",
            ].map((text) => (
              <View key={text} style={ui.row}>
                <Check size={14} color={palette.primary} />
                <Label muted style={{ fontSize: 12, flex: 1 }}>
                  {text}
                </Label>
              </View>
            ))}
          </>
        )}
      </Panel>
      <Panel>
        <View style={ui.between}>
          <Heading style={{ fontSize: 13 }}>Home Visit Appointments</Heading>
          <Switch
            accessibilityLabel="Home Visit Appointments"
            value={draft.homeVisits}
            onValueChange={(homeVisits) => update({ homeVisits })}
            trackColor={{ false: "#D1D5DB", true: palette.primary }}
          />
        </View>
        <Label muted style={{ fontSize: 12 }}>
          {draft.homeVisits
            ? "Home visit time blocks can be published below. Patient booking requires verified address coverage."
            : "Home visit bookings are disabled."}
        </Label>
        {draft.homeVisits ? <Input label="Travel radius from practice (km)" accessibilityLabel="Home visit travel radius in kilometres" value={draft.homeRadius} onChangeText={(homeRadius) => update({ homeRadius })} keyboardType="decimal-pad" /> : null}
      </Panel>
      <ConsultationChargesPanel draft={draft} onUpdate={update} />
      {!selectedPracticeId && associationRequests.isLoading ? <Loader theme="doctor" style={{ minHeight: 40 }} /> : null}
      {!practices.isLoading && !associationRequests.isLoading && !selectedPracticeId ? (
        <Label muted>
          {pendingAssociation
            ? `${pendingAssociation.facility_name} must accept your doctor association in its Doctor Management portal before you can save a schedule.`
            : rejectedAssociation
              ? `Your association with ${rejectedAssociation.facility_name} was declined. Update your facility request before saving a schedule.`
              : practices.isError || associationRequests.isError
                ? "Could not load your practice status. Reopen this screen and try again."
                : "An active clinic or hospital association is required before you can save a schedule."}
        </Label>
      ) : null}
      <Button loading={pendingAction === "save"}
        theme="doctor"
        label={busy ? "Saving…" : "Save Schedule"}
        leftIcon={<Calendar size={17} color="white" />}
        disabled={busy || !selectedPracticeId}
        onPress={() => void save()}
      />
      {selectedPracticeId ? (
        <>
          <PublishSessionPanel
            publishDate={publishDate}
            onPublishDateChange={(date) => { setPublishDate(date); setSelectedSlots({ clinic: [], online: [], home: [] }); }}
            windows={publishWindows}
            onWindowChange={(mode, part, value) => { setPublishWindows(current => ({ ...current, [mode]: { ...current[mode], [part]: value } })); setSelectedSlots(current => ({ ...current, [mode]: [] })); }}
            selectedSlots={selectedSlots}
            remainingSlots={remainingSlots}
            usedSlots={dailyUsage.data}
            dailyLimits={{ clinic: draft.walkIn, online: draft.online }}
            dailyUsageReady={Boolean(dailyUsage.data)}
            dailyUsageError={dailyUsage.isError}
            disabledReason={!selectedPractice?.verified ? "This practice must be verified before publishing." : !saved.data ? "Save your schedule before publishing." : !publishDateIso ? "Enter the date as DD-MM-YYYY before selecting times." : null}
            publishIssue={null}
            slotMinutes={{ clinic: draft.duration, online: draft.onlineDuration, home: draft.homeDuration }}
            onToggleSlot={toggleSlot}
            busy={busy}
            pendingAction={pendingAction}
            disabled={!selectedPractice?.verified || !saved.data || !publishDateIso}
            onPublish={() => void publish("clinic")}
            onPublishOnline={() => void publish("online")}
            onPublishHome={() => void publish("home")}
            onlineDisabled={draft.online < 1}
            homeDisabled={!draft.homeVisits}
          />
          <PublishedSessionsPanel
            sessions={sessions.data}
            sessionLimits={sessionLimits}
            onLimitChange={(id, value) =>
              setSessionLimits((current) => ({ ...current, [id]: value }))
            }
            busy={busy}
            pendingAction={pendingAction}
            onSaveLimit={async (session) => {
              if (!supabase || busy) return;
              setBusy(true); setPendingAction(`limit:${session.id}`);
              try {
                await setClinicAutoConfirmLimit(supabase, {
                  sessionId: session.id,
                  expectedVersion: Number(session.row_version),
                  limit: Number(
                    sessionLimits[session.id] ??
                      session.auto_confirm_limit ??
                      0,
                  ),
                });
                await queryClient.invalidateQueries({
                  queryKey: ["doctor-clinic-sessions", selectedPracticeId],
                });
                reportSuccess("Approval limit updated.");
              } catch {
                reportError("Could not update approval limit.");
              } finally { setBusy(false); setPendingAction(null); }
            }}
            isError={sessions.isError}
          />
          <UnavailableTimePanel
            leaveDate={leaveDate}
            onLeaveDateChange={setLeaveDate}
            leaveStart={leaveStart}
            onLeaveStartChange={setLeaveStart}
            leaveEnd={leaveEnd}
            onLeaveEndChange={setLeaveEnd}
            leaveReason={leaveReason}
            onLeaveReasonChange={setLeaveReason}
            busy={busy}
            pendingAction={pendingAction}
            canAdd={
              Boolean(
                leaveDate &&
                  leaveStart &&
                  leaveEnd &&
                  leaveReason.trim().length >= 2,
              )
            }
            onAddLeave={() => void addLeave()}
            unavailable={unavailable.data}
            onRemoveLeave={async (item) => {
              if (!supabase || busy) return;
              setBusy(true); setPendingAction(`remove-leave:${item.id}`);
              try {
                await revokeClinicUnavailability(supabase, {
                  exceptionId: item.id,
                  expectedVersion: Number(item.row_version),
                });
                await queryClient.invalidateQueries({
                  queryKey: [
                    "doctor-clinic-unavailability",
                    selectedPracticeId,
                  ],
                });
                reportSuccess("Unavailable time removed.");
              } catch {
                reportError("Could not remove unavailable time.");
              } finally { setBusy(false); setPendingAction(null); }
            }}
            isError={unavailable.isError}
          />
        </>
      ) : null}
    </DoctorScreen>
  );
}
