import { useEffect, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { MapPin, Navigation, Video } from "lucide-react-native";
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
  FadedScrollView,
  Header,
  Input,
  TimeSlot,
} from "@startup/mobile-ui";
import DoctorCard, { type DoctorCardProps } from "../../components/DoctorCard";
import type { ConsultationType } from "../../types/appointment";
import { consultationFlows } from "../../utils/consultationFlow";
import type { PatientScreenProps } from "../types";
import {
  DEFAULT_ADDRESS,
  dates,
  getDatesForMonth,
  languages,
  months,
  patientOptions,
  profileTabs,
  timeSlots,
  type ProfileTab,
} from "../../utils/doctorProfileConstants";

type DoctorProfileScreenProps = PatientScreenProps & {
  doctor: DoctorCardProps;
  consultationType: ConsultationType;
  onBookAppointment: (selection: BookingSelection) => void;
};

export type BookingSelection = {
  date: string;
  time: string;
  patient: string;
  reason: string;
  consultationType: ConsultationType;
  address?: string;
};

export function DoctorProfileScreen({
  doctor,
  consultationType: initialConsultationType,
  onBackPress,
  onBookAppointment,
}: DoctorProfileScreenProps) {
  const [activeTab, setActiveTab] = useState<ProfileTab>("about");
  const [consultationType, setConsultationType] = useState<ConsultationType>(
    initialConsultationType
  );
  const [addressDraft, setAddressDraft] = useState(DEFAULT_ADDRESS);
  const [homeAddress, setHomeAddress] = useState(addressDraft);
  const flow = consultationFlows[consultationType];

  const changeTab = (tab: ProfileTab) => {
    setActiveTab(tab);
  };

  const selectOnlineConsultation = () => {
    setConsultationType("Online");
    changeTab("slots");
  };

  return (
    <View style={styles.screen}>
      <Header
        title={
          consultationType === "Online"
            ? "Doctor Details (Online Consultation)"
            : "Doctor Details"
        }
        app="patient"
        onBackPress={onBackPress}
        titleStyle={
          consultationType === "Online"
            ? styles.onlineHeaderTitle
            : styles.headerTitle
        }
      />

      <FadedScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <DoctorCard
          {...doctor}
          contextLabel={
            consultationType === "Online" ? undefined : flow.profileContext
          }
          showChevron={false}
        />

        {consultationType === "Clinic Visit" ? (
          <OnlineConsultation
            fee={doctor.fee}
            onBookPress={selectOnlineConsultation}
          />
        ) : null}

        {flow.requiresAddress ? (
          <HomeVisitAddress
            address={addressDraft}
            onAddressChange={setAddressDraft}
            onConfirm={() => setHomeAddress(addressDraft.trim())}
            verifiedAddress={homeAddress}
          />
        ) : null}

        <ProfileTabs activeTab={activeTab} onTabChange={changeTab} />

        <View style={styles.page}>
          {activeTab === "about" ? (
            <AboutDoctor doctorName={doctor.name} />
          ) : (
            <BookSlots
              address={flow.requiresAddress ? homeAddress : undefined}
              consultationType={consultationType}
              onBookAppointment={onBookAppointment}
            />
          )}
        </View>
      </FadedScrollView>
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
      style={styles.consultationCopy}
    >
      <CardContent gap={1} style={styles.consultationCard}>
        <Text style={styles.consultationTitle}>
          Online consultation available: {fee}
        </Text>
      </CardContent>
      <Button
        label="Book"
        onPress={onBookPress}
        style={styles.smallButton}
        labelStyle={styles.smallButtonLabel}
        leftIcon={<Video color={colors.white} size={19} strokeWidth={2} />}
      />
    </Card>
  );
}

function HomeVisitAddress({
  address,
  onAddressChange,
  onConfirm,
  verifiedAddress,
}: {
  address: string;
  onAddressChange: (address: string) => void;
  onConfirm: () => void;
  verifiedAddress: string;
}) {
  return (
    <Card borderRadius={radius.md} gap={12} padding={14}>
      <Input
        accessibilityLabel="Home visit address"
        label="Your address"
        placeholder="Enter your address here..."
        value={address}
        onChangeText={onAddressChange}
      />
      <Button
        label="Update your location"
        disabled={!address.trim()}
        onPress={onConfirm}
        style={styles.locationButton}
      />
      <View style={styles.pinnedLocation}>
        <Navigation
          color={colors.patient.primaryDark}
          size={19}
          strokeWidth={1.9}
        />
        <View style={styles.pinnedLocationCopy}>
          <Text style={styles.pinnedLocationTitle}>
            Verified visit location
          </Text>
          <Text numberOfLines={2} style={styles.pinnedLocationAddress}>
            {verifiedAddress || "Add an address for the doctor’s visit"}
          </Text>
        </View>
      </View>
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
      {profileTabs.map((tab) => {
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
    <Card
      borderRadius={radius.md}
      gap={16}
      padding={16}
      style={styles.aboutCard}
    >
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
          {languages.map((language) => (
            <Chip key={language} label={language} style={styles.languageChip} />
          ))}
        </View>
      </View>
    </Card>
  );
}

function BookSlots({
  address,
  consultationType,
  onBookAppointment,
}: {
  address?: string;
  consultationType: ConsultationType;
  onBookAppointment: (selection: BookingSelection) => void;
}) {
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(10); // November (matches reference)
  const [monthDates, setMonthDates] = useState(() => getDatesForMonth(10));
  const [selectedDate, setSelectedDate] = useState("5-nov");
  const [selectedTime, setSelectedTime] = useState("02:30 PM");
  const [patient, setPatient] = useState("Self");
  const [reason, setReason] = useState("");

  const datesScrollRef = useRef<ScrollView>(null);
  const monthsScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      monthsScrollRef.current?.scrollTo({
        x: Math.max(0, 10 * 85 - 80),
        animated: false,
      });
      const selIdx = monthDates.findIndex((d) => d.key === "5-nov");
      if (selIdx >= 0) {
        datesScrollRef.current?.scrollTo({
          x: Math.max(0, selIdx * 54 - 110),
          animated: false,
        });
      }
    }, 120);
    return () => clearTimeout(timer);
  }, []);

  const handleSelectMonth = (index: number) => {
    setSelectedMonthIndex(index);
    const newDates = getDatesForMonth(index);
    setMonthDates(newDates);

    const targetKey = `5-${months[index].short.toLowerCase()}`;
    const targetDate =
      newDates.find((d) => d.key === targetKey && !d.closed) ??
      newDates.find((d) => !d.closed) ??
      newDates[0];
    setSelectedDate(targetDate.key);

    const selIdx = newDates.findIndex((d) => d.key === targetDate.key);
    if (selIdx >= 0) {
      setTimeout(() => {
        datesScrollRef.current?.scrollTo({
          x: Math.max(0, selIdx * 54 - 110),
          animated: true,
        });
      }, 50);
    }
  };

  const handleSelectDate = (key: string, idx: number) => {
    setSelectedDate(key);
    datesScrollRef.current?.scrollTo({
      x: Math.max(0, idx * 54 - 110),
      animated: true,
    });
  };

  return (
    <Card
      borderRadius={radius.md}
      gap={20}
      padding={14}
      style={styles.bookSlotsCard}
    >
      <View style={styles.bookingSection}>
        {/* Horizontal Months Strip using Chips */}
        <ScrollView
          ref={monthsScrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.monthsStrip}
        >
          {months.map((m) => {
            const isSelected = m.index === selectedMonthIndex;
            return (
              <Chip
                key={m.name}
                label={m.name}
                selected={isSelected}
                accessibilityState={{ selected: isSelected }}
                onPress={() => handleSelectMonth(m.index)}
                style={[
                  styles.monthChip,
                  isSelected ? styles.selectedMonthChip : undefined,
                ]}
                labelStyle={
                  isSelected
                    ? styles.selectedMonthChipText
                    : styles.monthChipText
                }
              />
            );
          })}
        </ScrollView>

        {/* Dates Carousel - all same size with border */}
        <ScrollView
          ref={datesScrollRef}
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.datesCarousel}
        >
          {monthDates.map((date, idx) => {
            const selected = date.key === selectedDate;

            return (
              <Pressable
                key={date.key}
                accessibilityRole="radio"
                accessibilityState={{
                  selected,
                  disabled: date.closed === true,
                }}
                disabled={date.closed}
                onPress={() => handleSelectDate(date.key, idx)}
                style={({ pressed }) => [
                  styles.dateCard,
                  selected ? styles.selectedDateCard : undefined,
                  date.closed ? styles.closedDateCard : undefined,
                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.dateNumber,
                    selected ? styles.selectedDateNumber : undefined,
                  ]}
                >
                  {date.dayNumber}
                </Text>
                <Text
                  style={[
                    styles.dateDay,
                    selected ? styles.selectedDateDay : undefined,
                  ]}
                >
                  {date.day}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      <View style={styles.bookingSection}>
        <View style={styles.sectionHeadingRow}>
          <Text style={styles.sectionTitle}>Select time</Text>
          <Text style={styles.availability}>5 slots available</Text>
        </View>
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
          {patientOptions.map((option) => {
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
          const date =
            monthDates.find((item) => item.key === selectedDate)?.date ??
            selectedDate;
          onBookAppointment({
            date,
            time: selectedTime,
            patient,
            reason,
            consultationType,
            address,
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
    color: colors.white,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  onlineHeaderTitle: {
    color: colors.white,
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 22,
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
  consultationCard: {
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  consultationCopy: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 4,
  },
  consultationTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 16,
  },
  consultationDescription: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    lineHeight: 14,
  },
  locationButton: {
    minHeight: 44,
    borderRadius: radius.md,
  },
  pinnedLocation: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.patient.surface,
  },
  pinnedLocationCopy: { flex: 1, gap: 2 },
  pinnedLocationTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 16,
  },
  pinnedLocationAddress: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontStyle: "italic",
    lineHeight: 15,
  },
  smallButton: {
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  smallButtonLabel: {
    fontSize: 12,
    lineHeight: 14,
  },
  tabs: {
    minHeight: 44,
    flexDirection: "row",
    padding: 1,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
  },
  pager: {
    width: "100%",
  },
  page: {
    paddingBottom: 2,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  aboutCard: {
    flex: 1,
  },
  bookSlotsCard: {
    flex: 1,
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
    fontSize: 14,
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
  monthsStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 2,
  },
  monthChip: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.patient.background,
  },
  selectedMonthChip: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  monthChipText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
  selectedMonthChipText: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
  },
  datesCarousel: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
  },
  dateCard: {
    width: 54,
    height: 64,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    backgroundColor: colors.patient.background,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
  selectedDateCard: {
    borderColor: colors.patient.primaryDark,
    backgroundColor: colors.patient.primaryDark,
  },
  closedDateCard: {
    opacity: 0.38,
  },
  dateNumber: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  selectedDateNumber: {
    color: colors.white,
  },
  dateDay: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  selectedDateDay: {
    color: colors.white,
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  availability: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
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
