import { appointmentFilters } from "../utils/appointmentsConstants";
import { DayPill } from "../components/DayPill";
import { styles } from "../components/Appointments.styles";
import { useAppointments } from "../hooks/useAppointments";

export type { DayItem } from "../types/appointments-screen";

import { View } from "react-native";
import { router } from "expo-router";
import { Calendar } from "lucide-react-native";

import { modeLabels } from "../../../data/demo";
import { PatientCard } from "../../patients/components/PatientCard";
import { Chip, Dropdown, FadedScrollView, Loader } from "@startup/mobile-ui";
import {
  DoctorScreen,
  Heading,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

export function AppointmentsScreen() {
  const {
    now,
    appointmentId,
    date,
    month,
    datesRef,
    filter,
    setFilter,
    appointments,
    monthOptions,
    days,
    scrollToSelectedDate,
    selectDate,
    selectMonth,
    visible,
  } = useAppointments();
  return (
    <DoctorScreen
      title="Appointments"
      onRefresh={() => appointments.refetch({ throwOnError: true })}
    >
      <View style={styles.monthRow}>
        <Heading style={styles.dateHeading}>Select date</Heading>
        <Dropdown
          theme="doctor"
          leftIcon={<Calendar size={18} color={palette.primary} />}
          accessibilityLabel="Select appointment month"
          options={monthOptions}
          value={month}
          onValueChange={selectMonth}
          containerStyle={styles.monthDropdown}
          triggerStyle={styles.monthTrigger}
          valueStyle={styles.monthLabel}
        />
      </View>
      <View style={styles.dateControls}>
        <FadedScrollView
          edgeColor={palette.white}
          containerStyle={styles.dateStrip}
          style={styles.horizontalScroll}
          ref={datesRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.daysList}
          onContentSizeChange={scrollToSelectedDate}
        >
          {days.map((day) => (
            <DayPill
              key={day.key}
              day={day}
              selected={date === day.key}
              onPress={selectDate}
            />
          ))}
        </FadedScrollView>
        <FadedScrollView
          horizontal
          edgeColor={palette.white}
          containerStyle={styles.filterStrip}
          style={styles.horizontalScroll}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filters}
        >
          {appointmentFilters.map((mode) => (
            <Chip
              key={mode}
              theme="doctor"
              variant="radio"
              style={styles.filterPill}
              label={mode === "all" ? "All" : modeLabels[mode]}
              selected={filter === mode}
              onPress={() => setFilter(mode)}
            />
          ))}
        </FadedScrollView>
      </View>
      {appointments.isLoading ? (
        <Loader theme="doctor" style={{ minHeight: 88 }} />
      ) : null}
      {appointments.isError ? (
        <Panel>
          <Label style={ui.error}>
            Could not load appointments. Pull down to retry.
          </Label>
        </Panel>
      ) : null}
      {visible.map((item) => (
        <PatientCard
          now={now}
          key={item.id}
          appointment={item}
          onOpen={() =>
            router.push({
              pathname: "/appointment-details",
              params: { appointmentId: item.id },
            })
          }
        />
      ))}
      {date &&
      visible.length === 0 &&
      !appointments.isLoading &&
      !appointments.isError ? (
        <View style={styles.emptyState}>
          <Heading style={styles.emptyText}>No appointments</Heading>
          <Label muted style={styles.emptyText}>
            {filter === "all"
              ? "No appointments for this date."
              : `No ${modeLabels[filter].toLowerCase()} appointments for this date.`}
          </Label>
        </View>
      ) : null}
      {!date ? (
        <Panel>
          <Label muted>Choose a day to see appointments.</Label>
        </Panel>
      ) : null}
    </DoctorScreen>
  );
}
