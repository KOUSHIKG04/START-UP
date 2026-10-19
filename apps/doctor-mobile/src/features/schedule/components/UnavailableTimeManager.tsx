import { useUnavailableTimeManager } from "../hooks/useUnavailableTimeManager";
import { filters } from "../utils/unavailableTimeConstants";

export type { Scope } from "../types/unavailable-time-manager";

import { View } from "react-native";
import { fontFamilies } from "@startup/design-tokens";
import { Chip, FadedScrollView, Loader } from "@startup/mobile-ui";

import { type ClinicUnavailability } from "@startup/contracts";

import {
  Choice,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { ui } from "../../../components/theme";
import { UnavailableTimePanel } from "./UnavailableTimePanel";

export function UnavailableTimeManager() {
  const {
    selectPractice,
    practices,
    doctor,
    availablePractices,
    practiceId,
    unavailable,
    scopes,
    toggleScope,
    scopeLabel,
    date,
    setDate,
    start,
    setStart,
    end,
    setEnd,
    reason,
    setReason,
    pending,
    zone,
    busy,
    add,
    remove,
  } = useUnavailableTimeManager();
  return (
    <>
      {availablePractices && availablePractices.length > 1 ? (
        <Panel>
          <Heading style={{ fontSize: 13 }}>Your clinic</Heading>
          <View style={ui.wrap}>
            {availablePractices.map((p) => (
              <Choice
                key={p.practice_id}
                label={p.facility_name}
                selected={practiceId === p.practice_id}
                onPress={() => selectPractice(p)}
              />
            ))}
          </View>
        </Panel>
      ) : null}
      <Panel>
        <Heading
          style={{
            fontSize: 15,
            fontFamily: fontFamilies.regular,
            fontWeight: "400",
          }}
        >
          Unavailable time / Leave
        </Heading>
        <FadedScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 8 }}
        >
          {filters.map(([value, label]) => (
            <Chip
              key={value}
              theme="doctor"
              variant="radio"
              label={label}
              accessibilityRole="checkbox"
              selected={scopes.includes(value)}
              disabled={busy}
              onPress={() => toggleScope(value)}
            />
          ))}
        </FadedScrollView>
        <Label muted>This block applies to {scopeLabel.toLowerCase()}.</Label>
        {practices.isLoading || unavailable.isLoading ? (
          <Loader theme="doctor" />
        ) : null}
        {!practices.isLoading && !practiceId ? (
          <Label muted>
            An active practice is required to manage unavailable time.
          </Label>
        ) : null}
        {practiceId ? (
          <UnavailableTimePanel
            timeZone={zone}
            leaveDate={date}
            onLeaveDateChange={setDate}
            leaveStart={start}
            onLeaveStartChange={setStart}
            leaveEnd={end}
            onLeaveEndChange={setEnd}
            leaveReason={reason}
            onLeaveReasonChange={setReason}
            busy={busy}
            pendingAction={pending}
            canAdd={Boolean(
              zone &&
              date &&
              start &&
              end &&
              reason.trim().length >= 2 &&
              !unavailable.isFetching
            )}
            onAddLeave={() => void add()}
            unavailable={(
              unavailable.data as ClinicUnavailability[] | undefined
            )?.filter(
              (item) =>
                scopes.includes("all") ||
                item.service_mode === "all" ||
                scopes.includes(item.service_mode)
            )}
            onRemoveLeave={remove}
            isError={unavailable.isError || practices.isError || doctor.isError}
          />
        ) : null}
      </Panel>
    </>
  );
}
