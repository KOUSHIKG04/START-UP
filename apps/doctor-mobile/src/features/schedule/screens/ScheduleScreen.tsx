import { useEffect, useState } from "react";
import { Pressable, Switch, View } from "react-native";
import Slider from "@react-native-community/slider";
import { Button, Input } from "@startup/mobile-ui";
import { Calendar, Check } from "lucide-react-native";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { addClinicUnavailability, getMySchedulePreferences, listClinicUnavailability, listMyClinicSessions, listMyPractices, publishClinicSession, publishOnlineSession, revokeClinicUnavailability, saveMySchedulePreferences, setClinicAutoConfirmLimit } from "@startup/data-access";
import { supabase } from "../../../services/supabase";
import {
  Choice,
  DoctorScreen,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import {
  formatTime,
  minutes,
  previewSlots,
  scheduleError,
} from "../utils/schedule";
import type { Schedule } from "../../../types/doctor";
import {
  PublishSessionPanel,
  PublishedSessionsPanel,
  UnavailableTimePanel,
  ConsultationChargesPanel,
  WorkingDaysPanel,
  ClinicHoursPanel,
} from "../components/ScheduleOperationsPanels";

function Range({
  title,
  value,
  min,
  max,
  step = 1,
  suffix,
  onChange,
}: {
  title: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  suffix: string;
  onChange: (value: number) => void;
}) {
  return (
    <View style={{ gap: 5 }}>
      <View style={ui.between}>
        <Label style={{ fontSize: 13 }}>{title}</Label>
        <Label style={{ color: palette.primary, fontSize: 12 }}>
          {value} {suffix}
        </Label>
      </View>
      <Slider
        accessibilityLabel={title}
        accessibilityValue={{ min, max, now: value }}
        minimumValue={min}
        maximumValue={max}
        step={step}
        value={value}
        onValueChange={onChange}
        minimumTrackTintColor={palette.primary}
        maximumTrackTintColor={palette.border}
        thumbTintColor={palette.primary}
        style={{ height: 36 }}
      />
      <View style={ui.between}>
        <Label muted style={{ fontSize: 11 }}>
          {min}
        </Label>
        <Label muted style={{ fontSize: 11 }}>
          {max}
        </Label>
      </View>
    </View>
  );
}
export function ScheduleScreen() {
  const queryClient = useQueryClient();
  const practices = useQuery({ queryKey: ["my-practices"], queryFn: () => listMyPractices(supabase!), enabled: Boolean(supabase) });
  const [practiceId, setPracticeId] = useState<string | null>(null);
  const selectedPracticeId = practiceId ?? practices.data?.[0]?.practice_id ?? null;
  const selectedPractice = practices.data?.find(item => item.practice_id === selectedPracticeId);
  const saved = useQuery({ queryKey: ["my-doctor-schedule", selectedPracticeId], queryFn: () => getMySchedulePreferences(supabase!, selectedPracticeId!), enabled: Boolean(supabase && selectedPracticeId) });
  const sessions = useQuery({ queryKey: ["doctor-clinic-sessions", selectedPracticeId], queryFn: () => listMyClinicSessions(supabase!, selectedPracticeId!), enabled: Boolean(supabase && selectedPracticeId) });
  const unavailable = useQuery({ queryKey: ["doctor-clinic-unavailability", selectedPracticeId], queryFn: () => listClinicUnavailability(supabase!, selectedPracticeId!), enabled: Boolean(supabase && selectedPracticeId) });
  const [draft, setDraft] = useState<Schedule>({ days: [], start: "09:00", end: "17:00", duration: 15, online: 1, walkIn: 1, autoAccept: false, autoLimit: 1, homeVisits: false, homeRadius: "", onlineFee: "0", clinicFee: "0", homeFee: "0" });
  useEffect(() => { if (!saved.data) return; const p = saved.data; setDraft({ days: p.working_days.map(day => day - 1), start: p.clinic_start.slice(0, 5), end: p.clinic_end.slice(0, 5), duration: p.slot_minutes, online: p.online_daily_limit, walkIn: p.walkin_daily_limit, autoAccept: p.auto_accept, autoLimit: p.auto_accept_limit, homeVisits: p.home_visits, homeRadius: p.home_radius_km === null ? "" : String(p.home_radius_km), onlineFee: String((p.online_fee_minor ?? 0) / 100), clinicFee: String(p.clinic_fee_minor / 100), homeFee: String((p.home_fee_minor ?? 0) / 100) }); }, [saved.data]);
  const [publishDate, setPublishDate] = useState("");
  const [sessionLimits, setSessionLimits] = useState<Record<string, string>>({});
  const [leaveDate, setLeaveDate] = useState(""); const [leaveStart, setLeaveStart] = useState(""); const [leaveEnd, setLeaveEnd] = useState(""); const [leaveReason, setLeaveReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const update = (changes: Partial<Schedule>) => {
    setDraft((current) => ({ ...current, ...changes }));
    setMessage("");
    setError("");
  };
  const slots = previewSlots(draft);
  const timeValid =
    Number.isFinite(minutes(draft.start)) &&
    Number.isFinite(minutes(draft.end));
  async function save() {
    const problem = scheduleError(draft);
    if (problem) { setError(problem); return; }
    if (!supabase || !selectedPracticeId) { setError("Choose your clinic first."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      await saveMySchedulePreferences(supabase, selectedPracticeId, { workingDays: draft.days.map(day => day + 1), clinicStart: draft.start, clinicEnd: draft.end, slotMinutes: draft.duration, onlineDailyLimit: draft.online, walkinDailyLimit: draft.walkIn, autoAccept: draft.autoAccept, autoAcceptLimit: draft.autoAccept ? draft.autoLimit : 0, homeVisits: draft.homeVisits, homeRadiusKm: draft.homeRadius ? Number(draft.homeRadius) : null, onlineFeeMinor: Math.round(Number(draft.onlineFee) * 100), clinicFeeMinor: Math.round(Number(draft.clinicFee) * 100), homeFeeMinor: Math.round(Number(draft.homeFee) * 100) }, Number(saved.data?.row_version ?? 0));
      await queryClient.invalidateQueries({ queryKey: ["my-doctor-schedule", selectedPracticeId] });
      setMessage("Schedule preferences saved. Publish a clinic date below to make slots bookable.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save schedule."); }
    finally { setBusy(false); }
  }
  async function publish(mode: "clinic" | "online" = "clinic") {
    if (!supabase || !selectedPracticeId || !saved.data) { setError("Save your schedule first."); return; }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(publishDate)) { setError("Choose a valid date."); return; }
    const selectedDate = new Date(`${publishDate}T12:00:00`);
    const weekday = (selectedDate.getDay() + 6) % 7;
    if (!draft.days.includes(weekday)) { setError("That date is not in your working days."); return; }
    const startsAt = new Date(`${publishDate}T${draft.start}:00`);
    const clinicEnd = new Date(`${publishDate}T${draft.end}:00`);
    // Online slots occupy the final configured slots of the workday. Choose
    // either clinic or online for a date unless their hours are separated.
    if (mode === "online") startsAt.setTime(clinicEnd.getTime() - draft.online * draft.duration * 60000);
    const endsAt = clinicEnd;
    if (startsAt <= new Date() || endsAt <= startsAt) { setError("Choose future clinic hours."); return; }
    setBusy(true); setError(""); setMessage("");
    try {
      const id = await (mode === "online" ? publishOnlineSession : publishClinicSession)(supabase, { practiceId: selectedPracticeId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), slotMinutes: draft.duration, feeMinor: Math.round(Number(mode === "online" ? draft.onlineFee : draft.clinicFee) * 100), currency: "INR" });
      if (draft.autoAccept) { const created = (await listMyClinicSessions(supabase, selectedPracticeId)).find(item => item.id === id); if (created) await setClinicAutoConfirmLimit(supabase, { sessionId: id, expectedVersion: Number(created.row_version), limit: Math.min(draft.autoLimit, created.hard_capacity) }); }
      await queryClient.invalidateQueries({ queryKey: ["doctor-clinic-sessions", selectedPracticeId] });
      setMessage(mode === "online" ? "Online slots published for patients." : "Clinic slots published for patients.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not publish slots."); }
    finally { setBusy(false); }
  }
  async function addLeave() {
    if (!supabase || !selectedPracticeId) return;
    setBusy(true); setError("");
    try { const startsAt = new Date(`${leaveDate}T${leaveStart}:00`); const endsAt = new Date(`${leaveDate}T${leaveEnd}:00`); if (Number.isNaN(startsAt.getTime()) || endsAt <= startsAt) throw new Error("Enter a valid unavailable time."); await addClinicUnavailability(supabase, { practiceId: selectedPracticeId, startsAt: startsAt.toISOString(), endsAt: endsAt.toISOString(), reason: leaveReason }); await queryClient.invalidateQueries({ queryKey: ["doctor-clinic-unavailability", selectedPracticeId] }); setLeaveDate(""); setLeaveStart(""); setLeaveEnd(""); setLeaveReason(""); setMessage("Unavailable time saved."); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save unavailable time."); }
    finally { setBusy(false); }
  }
  return (
    <DoctorScreen
      title="Manage Schedule"
      subtitle="Define your working hours and booking preferences"
      background="#F6F9F9"
    >
      {practices.isLoading ? <Label muted>Loading your clinics…</Label> : null}
      {practices.isError ? <Label style={ui.error}>Could not load your clinics.</Label> : null}
      {practices.data && practices.data.length > 1 ? <Panel><Heading style={{ fontSize: 13 }}>Your clinic</Heading><View style={ui.wrap}>{practices.data.map(practice => <Choice key={practice.practice_id} label={practice.facility_name} selected={selectedPracticeId === practice.practice_id} onPress={() => setPracticeId(practice.practice_id)} />)}</View></Panel> : null}
      {selectedPractice ? <Label muted>{selectedPractice.facility_name}{selectedPractice.verified ? "" : " · awaiting verification"}</Label> : null}
      {saved.isLoading ? <Label muted>Loading saved schedule…</Label> : null}
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
        <Range
          title="Slot Duration"
          value={draft.duration}
          min={10}
          max={60}
          step={5}
          suffix="minutes"
          onChange={(duration) => update({ duration })}
        />
      </Panel>
      <Panel>
        <Heading style={{ fontSize: 13 }}>Daily Slot Limits</Heading>
        <Range
          title="Online appointments"
          value={draft.online}
          min={1}
          max={15}
          suffix="slots"
          onChange={(online) => update({ online })}
        />
        <Range
          title="Walk-in appointments"
          value={draft.walkIn}
          min={1}
          max={15}
          suffix="slots"
          onChange={(walkIn) => update({ walkIn })}
        />
      </Panel>
      <Panel>
        <Heading style={{ fontSize: 13 }}>
          Slot Preview ({slots.length} slots/day)
        </Heading>
        <View style={ui.wrap}>
          {slots.map((slot) => (
            <View
              key={slot}
              style={{
                borderWidth: 1,
                borderColor: palette.primary,
                backgroundColor: palette.surface,
                borderRadius: 6,
                paddingHorizontal: 9,
                paddingVertical: 5,
              }}
            >
              <Label style={{ color: palette.header, fontSize: 12 }}>
                {slot}
              </Label>
            </View>
          ))}
        </View>
        {!slots.length && (
          <Label muted>Adjust clinic hours to preview available slots.</Label>
        )}
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
            <Range
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
            ? "Home visit preference saved; home visit booking is not connected yet."
            : "Home visit bookings are disabled."}
        </Label>
        {draft.homeVisits ? <Input label="Travel radius from practice (km)" accessibilityLabel="Home visit travel radius in kilometres" value={draft.homeRadius} onChangeText={(homeRadius) => update({ homeRadius })} keyboardType="decimal-pad" /> : null}
      </Panel>
      <ConsultationChargesPanel draft={draft} onUpdate={update} />
      {!!error && <Label style={ui.error}>{error}</Label>}
      {!!message && <Label style={ui.success}>{message}</Label>}
      <Button
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
            onPublishDateChange={setPublishDate}
            busy={busy}
            disabled={!selectedPractice?.verified || !saved.data || !publishDate}
            onPublish={() => void publish("clinic")}
            onPublishOnline={() => void publish("online")}
            onlineDisabled={draft.online < 1}
          />
          <PublishedSessionsPanel
            sessions={sessions.data}
            sessionLimits={sessionLimits}
            onLimitChange={(id, value) =>
              setSessionLimits((current) => ({ ...current, [id]: value }))
            }
            busy={busy}
            onSaveLimit={async (session) => {
              if (!supabase) return;
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
                setMessage("Approval limit updated.");
              } catch {
                setError("Could not update approval limit.");
              }
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
              if (!supabase) return;
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
              } catch {
                setError("Could not remove unavailable time.");
              }
            }}
            isError={unavailable.isError}
          />
        </>
      ) : null}
    </DoctorScreen>
  );
}
