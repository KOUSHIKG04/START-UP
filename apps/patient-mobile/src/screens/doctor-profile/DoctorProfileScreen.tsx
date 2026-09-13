import { useRef, useState } from "react";
import {
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { MapPin, Video } from "lucide-react-native";
import {
  colors,
  fontFamilies,
  radius,
  shadows,
  spacing,
} from "@startup/design-tokens";
import {
  Button,
  Card,
  CardContent,
  CardSeparator,
  Chip,
  Header,
  Input,
  TimeSlot,
} from "@startup/mobile-ui";
import DoctorCard, { type DoctorCardProps } from "../../components/DoctorCard";
import type { PatientScreenProps } from "../types";

type ProfileTab = "about" | "slots";

type DoctorProfileScreenProps = PatientScreenProps & {
  doctor: DoctorCardProps;
  onBookAppointment: (selection: BookingSelection) => void;
};

export type BookingSelection = {
  date: string;
  time: string;
  patient: string;
  reason: string;
  consultationType: "Clinic Visit" | "Online";
};

const dates = [
  { key: "today", day: "Today", date: "20 Aug", closed: false },
  { key: "tomorrow", day: "Tomorrow", date: "21 Aug", closed: true },
  { key: "sat", day: "Sat", date: "22 Aug", closed: true },
  { key: "sun", day: "Sun", date: "23 Aug", closed: true },
  { key: "mon", day: "Mon", date: "24 Aug", closed: false },
] as const;

const timeSlots = [
  { time: "09:00 AM", disabled: true },
  { time: "09:30 AM", disabled: true },
  { time: "10:00 AM", disabled: true },
  { time: "10:30 AM", disabled: true },
  { time: "11:00 AM", disabled: true },
  { time: "11:30 AM", disabled: true },
  { time: "02:00 PM", disabled: false },
  { time: "02:30 PM", disabled: false },
  { time: "03:00 PM", disabled: false },
  { time: "03:30 PM", disabled: false },
  { time: "04:00 PM", disabled: false },
  { time: "04:30 PM", disabled: false },
  { time: "05:00 PM", disabled: false },
  { time: "05:30 PM", disabled: false },
] as const;

export function DoctorProfileScreen({
  doctor,
  onBackPress,
  onBookAppointment,
}: DoctorProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
  const [consultationType, setConsultationType] = useState<
    "Clinic Visit" | "Online"
  >("Clinic Visit");
  const [pageHeights, setPageHeights] = useState<Record<ProfileTab, number>>({
    about: 0,
    slots: 0,
  });
  const pagerRef = useRef<ScrollView>(null);
  const { width } = useWindowDimensions();
  const pageWidth = width - spacing.lg * 2;

  const changeTab = (tab: ProfileTab) => {
    setActiveTab(tab);
    pagerRef.current?.scrollTo({
      x: tab === "about" ? 0 : pageWidth,
      animated: true,
    });
  };

  const recordPageHeight = (tab: ProfileTab, event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    setPageHeights((current) =>
      current[tab] === height ? current : { ...current, [tab]: height }
    );
  };

  const handleSwipeEnd = (
    event: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    const nextTab =
      event.nativeEvent.contentOffset.x >= pageWidth / 2 ? "slots" : "about";
    setActiveTab(nextTab);
  };

  const selectOnlineConsultation = () => {
    setConsultationType("Online");
    changeTab("slots");
  };

  return (
    <View style={styles.screen}>
      <Header
        title="Doctor Details"
        app="patient"
        onBackPress={onBackPress}
        titleStyle={styles.headerTitle}
      />

      <ScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DoctorCard
          {...doctor}
          contextLabel={
            consultationType === "Online" ? "Online Consultation" : undefined
          }
          showChevron={false}
        />

        {consultationType !== "Online" ? (
          <OnlineConsultation
            fee={doctor.fee}
            onBookPress={selectOnlineConsultation}
          />
        ) : null}

        <ProfileTabs activeTab={activeTab} onTabChange={changeTab} />

        <ScrollView
          ref={pagerRef}
          horizontal
          bounces={false}
          nestedScrollEnabled
          onMomentumScrollEnd={handleSwipeEnd}
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          style={[
            styles.pager,
            pageHeights[activeTab]
              ? { height: pageHeights[activeTab] }
              : undefined,
          ]}
        >
          <View
            onLayout={(event) => recordPageHeight("about", event)}
            style={[styles.page, { width: pageWidth }]}
          >
            <AboutDoctor doctorName={doctor.name} />
          </View>
          <View
            onLayout={(event) => recordPageHeight("slots", event)}
            style={[styles.page, { width: pageWidth }]}
          >
            <BookSlots
              consultationType={consultationType}
              onBookAppointment={onBookAppointment}
            />
          </View>
        </ScrollView>
      </ScrollView>
    </View>
  );
}

type OnlineConsultationProps = {
  fee: string;
  onBookPress: () => void;
};

function OnlineConsultation({ fee, onBookPress }: OnlineConsultationProps) {
  return (
    <Card
      backgroundColor={colors.patient.surface}
      borderRadius={radius.md}
      gap={10}
      orientation="horizontal"
      padding={12}
      variant="soft"
    >
      <View style={styles.videoIcon}>
        <Video color={colors.patient.primaryDark} size={19} strokeWidth={2} />
      </View>
      <CardContent gap={1} style={styles.consultationCopy}>
        <Text style={styles.consultationTitle}>
          Online consultation available
        </Text>
        <Text style={styles.consultationDescription}>
          Video call from home · {fee}
        </Text>
      </CardContent>
      <Button
        label="Book"
        onPress={onBookPress}
        style={styles.smallButton}
        labelStyle={styles.smallButtonLabel}
      />
    </Card>
  );
}

type ProfileTabsProps = {
  activeTab: ProfileTab;
  onTabChange: (tab: ProfileTab) => void;
};

function ProfileTabs({ activeTab, onTabChange }: ProfileTabsProps) {
  return (
    <View accessibilityRole="tablist" style={styles.tabs}>
      {(["about", "slots"] as const).map((tab) => {
        const selected = activeTab === tab;
        const label = tab === "about" ? "About" : "Book Slots";
        return (
          <Pressable
            key={tab}
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            onPress={() => onTabChange(tab)}
            style={({ pressed }) => [
              styles.tab,
              selected ? styles.activeTab : undefined,
              pressed ? styles.pressed : undefined,
            ]}
          >
            <Text style={[styles.tabLabel, selected && styles.activeTabLabel]}>
              {label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function AboutDoctor({ doctorName }: { doctorName: string }) {
  return (
    <Card borderRadius={radius.md} gap={16} padding={16}>
      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>About</Text>
        <Text style={styles.bodyText}>
          {doctorName} is an experienced General Physician focused on chronic
          conditions, infectious diseases, preventive care, and clear guidance
          for every patient.
        </Text>
      </View>

      <CardSeparator color="#E8ECEF" />

      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>Hospital</Text>
        <View style={styles.hospitalRow}>
          <MapPin
            color={colors.patient.primaryDark}
            size={18}
            strokeWidth={1.9}
          />
          <View style={styles.hospitalCopy}>
            <Text style={styles.hospitalName}>Apollo Hospitals</Text>
            <Text style={styles.secondaryText}>Koramangala, Bengaluru</Text>
            <Text style={styles.secondaryText}>1.2 km from you</Text>
          </View>
        </View>
      </View>

      <CardSeparator color="#E8ECEF" />

      <View style={styles.aboutSection}>
        <Text style={styles.sectionTitle}>Languages</Text>
        <View style={styles.languageRow}>
          {(["English", "Hindi", "Kannada"] as const).map((language) => (
            <Chip key={language} label={language} style={styles.languageChip} />
          ))}
        </View>
      </View>
    </Card>
  );
}

function BookSlots({
  consultationType,
  onBookAppointment,
}: {
  consultationType: "Clinic Visit" | "Online";
  onBookAppointment: (selection: BookingSelection) => void;
}) {
  const [selectedDate, setSelectedDate] = useState("today");
  const [selectedTime, setSelectedTime] = useState("02:30 PM");
  const [patient, setPatient] = useState("Self");
  const [reason, setReason] = useState("");

  return (
    <Card borderRadius={radius.md} gap={20} padding={14}>
      <View style={styles.bookingSection}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>Select date</Text>
          <Text style={styles.monthLabel}>August</Text>
        </View>
        <ScrollView
          horizontal
          contentContainerStyle={styles.dateRow}
          showsHorizontalScrollIndicator={false}
        >
          {dates.map((date) => {
            const selected = date.key === selectedDate;
            return (
              <Pressable
                key={date.key}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: date.closed === true }}
                disabled={date.closed}
                onPress={() => setSelectedDate(date.key)}
                style={({ pressed }) => [
                  styles.dateOption,
                  selected ? styles.selectedDate : undefined,
                  date.closed ? styles.closedDate : undefined,
                  pressed ? styles.pressed : undefined,
                ]}
              >
                <Text
                  style={[
                    styles.dateDay,
                    selected ? styles.selectedDateText : undefined,
                  ]}
                >
                  {date.day}
                </Text>
                <Text
                  style={[
                    styles.dateValue,
                    selected ? styles.selectedDateText : undefined,
                  ]}
                >
                  {date.date}
                </Text>
                {date.closed ? (
                  <Text style={styles.closedLabel}>Closed</Text>
                ) : null}
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.bookingSection}>
        <Text style={styles.availability}>5 slots available</Text>
        <View style={styles.slotGrid}>
          {timeSlots.map((slot) => {
            const selected = selectedTime === slot.time;
            return (
              <TimeSlot
                key={slot.time}
                time={slot.time}
                disabled={slot.disabled}
                accessibilityState={{ selected }}
                onPress={() => setSelectedTime(slot.time)}
                style={[
                  styles.timeSlot,
                  selected ? styles.selectedTimeSlot : undefined,
                ]}
                textStyle={selected ? styles.selectedTimeText : undefined}
              />
            );
          })}
        </View>
      </View>

      <View style={styles.bookingSection}>
        <Text style={styles.sectionTitle}>For whom?</Text>
        <View style={styles.patientRow}>
          {(["Self", "Family 1"] as const).map((option) => {
            const selected = patient === option;
            return (
              <Chip
                key={option}
                label={option}
                accessibilityState={{ selected }}
                onPress={() => setPatient(option)}
                style={[
                  styles.patientChip,
                  selected ? styles.selectedPatientChip : undefined,
                ]}
                labelStyle={selected ? styles.selectedPatientText : undefined}
              />
            );
          })}
        </View>
      </View>

      <Input
        accessibilityLabel="Reason for visit"
        label="Reason for visit (optional)"
        placeholder="e.g. Fever, back pain, routine check-up..."
        value={reason}
        onChangeText={setReason}
      />

      <Button
        label="Book Appointment"
        onPress={() => {
          const date = dates.find((item) => item.key === selectedDate)?.date;
          onBookAppointment({
            date: date ?? "20 Aug",
            time: selectedTime,
            patient,
            reason,
            consultationType,
          });
        }}
        style={styles.bookButton}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.patient.background,
  },
  headerTitle: {
    fontFamily: fontFamilies.bold,
    fontSize: 20,
    fontWeight: "700",
    lineHeight: 26,
  },
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: 126,
  },
  videoIcon: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 11,
    backgroundColor: colors.white,
  },
  consultationCopy: {
    flex: 1,
  },
  consultationTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    fontWeight: "700",
    lineHeight: 16,
  },
  consultationDescription: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  smallButton: {
    minHeight: 34,
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 17,
  },
  smallButtonLabel: {
    fontSize: 11,
    lineHeight: 14,
  },
  tabs: {
    minHeight: 44,
    flexDirection: "row",
    padding: 3,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  pager: {
    width: "100%",
  },
  page: {
    paddingBottom: 2,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: colors.patient.primaryDark,
  },
  tabLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
  },
  activeTabLabel: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontWeight: "700",
  },
  pressed: {
    opacity: 0.76,
  },
  aboutSection: {
    gap: 8,
  },
  sectionTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  bodyText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 19,
  },
  hospitalRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 9,
  },
  hospitalCopy: {
    gap: 2,
  },
  hospitalName: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  secondaryText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  languageRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  languageChip: {
    paddingHorizontal: 11,
    paddingVertical: 4,
  },
  bookingSection: {
    gap: 10,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
  },
  dateRow: {
    gap: 8,
  },
  dateOption: {
    minWidth: 64,
    minHeight: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 11,
    backgroundColor: colors.patient.background,
  },
  selectedDate: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  closedDate: {
    opacity: 0.58,
  },
  dateDay: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    lineHeight: 12,
  },
  dateValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  selectedDateText: {
    color: colors.white,
  },
  closedLabel: {
    color: colors.danger,
    fontFamily: fontFamilies.medium,
    fontSize: 8,
    lineHeight: 10,
  },
  availability: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  slotGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    minWidth: 0,
    width: "31%",
    flexGrow: 1,
    paddingHorizontal: 5,
  },
  selectedTimeSlot: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  selectedTimeText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
  patientRow: {
    flexDirection: "row",
    gap: 8,
  },
  patientChip: {
    borderColor: colors.patient.primaryDark,
  },
  selectedPatientChip: {
    backgroundColor: colors.patient.surface,
  },
  selectedPatientText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
  },
  bookButton: {
    minHeight: 50,
    borderRadius: radius.md,
  },
});
