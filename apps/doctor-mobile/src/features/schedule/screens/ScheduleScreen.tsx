import { autoBookingHelpItems } from "../utils/scheduleConstants";
import type { ScheduleScreenProps } from "../types/schedule-screen";
import { Switch, View } from "react-native";
import {
  Button,
  ClockDurationPicker,
  Input,
  Loader,
  ModalSurface,
  Skeleton,
} from "@startup/mobile-ui";
import { Calendar, Check } from "lucide-react-native";
import type { ClinicPractice } from "@startup/contracts";

import {
  Choice,
  DoctorScreen,
  Heading,
  Label,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";
import { DatePicker } from "../../../components/DatePicker";
import { ConsultationChargesPanel } from "../components/ConsultationChargesPanel";
import { ScheduleSection } from "../components/ScheduleSection";
import { WorkingDaysPanel } from "../components/WorkingDaysPanel";
import { ClinicHoursPanel } from "../components/ClinicHoursPanel";
import { NumberSetting } from "../components/NumberSetting";
import { useScheduleEditor } from "../hooks/useScheduleEditor";

export function ScheduleScreen({ mode }: ScheduleScreenProps) {
  const {
    selectPractice,
    showScheduleHelp,
    setShowScheduleHelp,
    doctorProfile,
    zone,
    practices,
    selectedPracticeId,
    selectedPractice,
    associationRequests,
    pendingAssociation,
    rejectedAssociation,
    saved,
    draft,
    busy,
    pendingAction,
    availabilityDuration,
    setAvailabilityDuration,
    showAutoBookingHelp,
    setShowAutoBookingHelp,
    suggestedDuration,
    setSuggestedDuration,
    setEffectiveDate,
    today,
    startsFrom,
    dailyLimit,
    suggestion,
    suggestedTimes,
    update,
    save,
  } = useScheduleEditor({ mode });
  return (
    <DoctorScreen
      title={
        mode === "clinic"
          ? "Clinic Schedule"
          : mode === "online"
            ? "Online Schedule"
            : "Home Visit Schedule"
      }
      bottomNav={false}
    >
      {practices.isLoading ? (
        <Loader theme="doctor" style={{ minHeight: 40 }} />
      ) : null}
      {practices.data && practices.data.length > 1 ? (
        <ScheduleSection title="Your clinic">
          <Label muted style={{ fontSize: 12 }}>
            Select your clinic or hospital.
          </Label>
          <View style={ui.wrap}>
            {(practices.data as ClinicPractice[]).map(
              (practice: ClinicPractice) => (
                <Choice
                  key={practice.practice_id}
                  label={practice.facility_name}
                  selected={selectedPracticeId === practice.practice_id}
                  onPress={() => selectPractice(practice)}
                />
              )
            )}
          </View>
        </ScheduleSection>
      ) : null}
      {selectedPractice ? (
        <Label muted>
          {selectedPractice.facility_name}
          {selectedPractice.verified ? "" : " · awaiting verification"}
        </Label>
      ) : null}
      {saved.isLoading ? (
        <Skeleton theme="doctor" height={72} radius={12} />
      ) : null}
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
        title={
          mode === "clinic"
            ? "Clinic Hours"
            : mode === "online"
              ? "Online Hours"
              : "Home Visit Hours"
        }
        start={draft.start}
        end={draft.end}
        onUpdate={update}
      />
      <ScheduleSection title="Appointment slots">
        <Label muted style={{ fontSize: 12 }}>
          {mode === "home"
            ? "Set your visit duration."
            : "Duration sets appointment times. The daily limit caps bookings."}
        </Label>
        <View
          style={{ flexDirection: "row", gap: 12, alignItems: "flex-start" }}
        >
          {mode === "clinic" ? (
            <ClockDurationPicker
              label="Consultation duration"
              value={draft.duration}
              min={5}
              max={120}
              theme="doctor"
              disabled={busy}
              onChange={(duration) => {
                update({ duration });
                setAvailabilityDuration(duration);
              }}
            />
          ) : null}
          {mode === "online" ? (
            <ClockDurationPicker
              label="Consultation duration"
              value={draft.onlineDuration}
              min={5}
              max={120}
              theme="doctor"
              disabled={busy}
              onChange={(onlineDuration) => {
                update({ onlineDuration });
                setAvailabilityDuration(onlineDuration);
              }}
            />
          ) : null}
          {mode === "home" ? (
            <ClockDurationPicker
              label="Home-visit slot duration"
              value={draft.homeDuration}
              min={30}
              max={120}
              theme="doctor"
              disabled={busy}
              onChange={(homeDuration) => {
                update({ homeDuration });
                setAvailabilityDuration(homeDuration);
              }}
            />
          ) : null}
          {mode !== "home" ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <NumberSetting
                title="Daily booking limit"
                stepper
                disabled={busy}
                value={mode === "online" ? draft.online : draft.walkIn}
                min={0}
                max={100}
                suffix="bookings"
                onChange={(value) =>
                  update(
                    mode === "online" ? { online: value } : { walkIn: value }
                  )
                }
              />
            </View>
          ) : null}
        </View>
        {mode !== "home" ? (
          <>
            <Label muted style={{ fontSize: 12 }}>
              Changing the daily limit does not change appointment times.
            </Label>
            {!saved.data?.published_modes?.includes(mode) ? (
              <>
                <Label muted style={{ fontSize: 12 }}>
                  Preview a duration based on your hours and daily limit.
                </Label>
                <Button
                  theme="doctor"
                  variant="outline"
                  label="Suggest duration"
                  disabled={busy || suggestion === null}
                  onPress={() => setSuggestedDuration(suggestion)}
                />
              </>
            ) : null}
          </>
        ) : null}
      </ScheduleSection>
      <ScheduleSection title="Auto Accept Bookings">
        <View style={ui.between}>
          <Label>Enable automatic acceptance</Label>
          <Switch
            accessibilityLabel="Auto Accept Bookings"
            value={draft.autoAccept}
            onValueChange={(autoAccept) => update({ autoAccept })}
            trackColor={{ false: "#D1D5DB", true: palette.primary }}
          />
        </View>
        <Label muted style={{ fontSize: 12 }}>
          Set your daily auto-booking limit.
        </Label>
        {draft.autoAccept && (
          <>
            <NumberSetting
              title="Shared daily auto-accept limit"
              stepper
              disabled={busy}
              value={draft.autoLimit}
              min={1}
              max={100}
              suffix="bookings"
              onChange={(autoLimit) => update({ autoLimit })}
            />
            <Button
              theme="doctor"
              variant="outline"
              label="Set auto-booking limit"
              disabled={busy}
              onPress={() => setShowAutoBookingHelp(true)}
            />
          </>
        )}
      </ScheduleSection>
      {mode === "home" ? (
        <ScheduleSection title="Home Visit Appointments">
          <View style={ui.between}>
            <Label>Enable home visits</Label>
            <Switch
              accessibilityLabel="Home Visit Appointments"
              value={draft.homeVisits}
              onValueChange={(homeVisits) => update({ homeVisits })}
              trackColor={{ false: "#D1D5DB", true: palette.primary }}
            />
          </View>
          <Label muted style={{ fontSize: 12 }}>
            Set your home-visit travel radius.
          </Label>
          {draft.homeVisits ? (
            <Input
              label="Travel radius from practice (km)"
              accessibilityLabel="Home visit travel radius in kilometres"
              value={draft.homeRadius}
              onChangeText={(homeRadius) => update({ homeRadius })}
              keyboardType="decimal-pad"
            />
          ) : null}
        </ScheduleSection>
      ) : null}
      <ConsultationChargesPanel mode={mode} draft={draft} onUpdate={update} />
      {!selectedPracticeId && associationRequests.isLoading ? (
        <Loader theme="doctor" style={{ minHeight: 40 }} />
      ) : null}
      {!practices.isLoading &&
      !associationRequests.isLoading &&
      !selectedPracticeId ? (
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
      {selectedPractice?.verified ? (
        <ScheduleSection title="Apply changes from">
          <Label muted style={{ fontSize: 12 }}>
            New appointment times apply from this date. Existing appointments
            and pending requests keep their times. Daily booking limits apply
            when saved.
          </Label>
          <DatePicker
            key={`${selectedPracticeId}:${mode}`}
            value={startsFrom}
            onChange={setEffectiveDate}
            timeZone={zone}
            minDate={today}
            disabled={busy}
            label="Start date"
          />
        </ScheduleSection>
      ) : null}
      <Button
        loading={pendingAction === "save"}
        theme="doctor"
        label={
          selectedPractice?.verified ? "Publish Schedule" : "Save Schedule"
        }
        leftIcon={<Calendar size={17} color="white" />}
        disabled={
          busy ||
          practices.isFetching ||
          saved.isFetching ||
          saved.isError ||
          !zone ||
          doctorProfile.isError ||
          !selectedPracticeId
        }
        onPress={() => void save()}
      />
      <ModalSurface
        visible={showAutoBookingHelp}
        onClose={() => setShowAutoBookingHelp(false)}
      >
        <Heading style={{ fontSize: 18 }}>Automatic bookings</Heading>
        <Label muted>
          Up to {draft.autoLimit} bookings per day are auto-accepted across
          Clinic, Online and Home visits combined.
        </Label>
        {autoBookingHelpItems.map((text) => (
          <View key={text} style={ui.row}>
            <Check size={14} color={palette.primary} />
            <Label muted style={{ flex: 1 }}>
              {text}
            </Label>
          </View>
        ))}
        <Button
          theme="doctor"
          label="Got it"
          onPress={() => setShowAutoBookingHelp(false)}
        />
      </ModalSurface>
      <ModalSurface
        visible={showScheduleHelp}
        onClose={() => setShowScheduleHelp(false)}
      >
        <Heading style={{ fontSize: 18 }}>Set your schedule</Heading>
        <Label muted>
          Choose working days, hours and the slot interval. Publishing creates
          the next 30 days automatically. Auto-accept uses one shared daily
          limit across all services. The daily booking limit counts active
          bookings; patients can choose any available time within your working
          hours.
        </Label>
        <Button
          theme="doctor"
          label="Got it"
          onPress={() => setShowScheduleHelp(false)}
        />
      </ModalSurface>
      <ModalSurface
        visible={availabilityDuration !== null}
        onClose={() => setAvailabilityDuration(null)}
      >
        <Heading style={{ fontSize: 18 }}>Automatic availability</Heading>
        <Label muted>
          When you publish, slots are created every {availabilityDuration}{" "}
          minutes on your selected working days. Unavailable time and existing
          appointments are respected.
        </Label>
        <Button
          theme="doctor"
          label="Got it"
          onPress={() => setAvailabilityDuration(null)}
        />
      </ModalSurface>
      <ModalSurface
        visible={suggestedDuration !== null}
        onClose={() => setSuggestedDuration(null)}
      >
        <Heading style={{ fontSize: 18 }}>
          Suggested consultation duration
        </Heading>
        <Label>{suggestedDuration} minutes per consultation</Label>
        <Label muted>
          {suggestedTimes.length} appointment times within your hours, with up
          to {dailyLimit} bookings per day.
        </Label>
        <Label muted>
          {suggestedTimes.slice(0, 4).join(" · ")}
          {suggestedTimes.length > 4 ? " …" : ""}
        </Label>
        <Label muted>
          Review this duration before publishing. Later daily-limit changes will
          not recalculate it.
        </Label>
        <Button
          theme="doctor"
          label="Use this duration"
          onPress={() => {
            if (suggestedDuration === null) return;
            update(
              mode === "online"
                ? { onlineDuration: suggestedDuration }
                : { duration: suggestedDuration }
            );
            setSuggestedDuration(null);
          }}
        />
        <Button
          theme="doctor"
          variant="outline"
          label="Keep current duration"
          onPress={() => setSuggestedDuration(null)}
        />
      </ModalSurface>
    </DoctorScreen>
  );
}
