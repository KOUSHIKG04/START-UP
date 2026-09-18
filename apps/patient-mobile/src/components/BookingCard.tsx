import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Building2,
  CalendarDays,
  ChevronRight,
  Clock3,
  CreditCard,
  Hash,
  MapPin,
  Star,
  Stethoscope,
  UserRound,
} from "lucide-react-native";
import {
  colors,
  fontFamilies,
  gradients,
  radius,
} from "@startup/design-tokens";
import {
  Accordion,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardSeparator,
} from "@startup/mobile-ui";
import type { Appointment } from "../types/appointment";

type BookingCardProps = {
  appointment: Appointment;
  onPress?: () => void;
};

export default function BookingCard({
  appointment,
  onPress,
}: BookingCardProps) {
  return (
    <Card
      accessibilityLabel={`${appointment.consultationType} with ${appointment.doctorName} on ${appointment.date}`}
      backgroundColor={gradients.patientBanner.colors[0]}
      borderRadius={radius.lg}
      gap={11}
      padding={16}
    >
      <LinearGradient
        pointerEvents="none"
        colors={gradients.patientBanner.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />
      <View style={styles.topRow}>
        <Text style={styles.type}>{appointment.consultationType}</Text>
        <View style={styles.statusBadge}>
          <View
            style={[
              styles.statusDot,
              appointment.status === "approved"
                ? styles.statusDotApproved
                : styles.statusDotPending,
            ]}
          />
          <Text style={styles.statusText}>
            {appointment.status === "approved" ? "Confirmed" : "Pending"}
          </Text>
        </View>
      </View>

      <CardHeader gap={11}>
        <View style={styles.avatar}>
          <UserRound color={colors.white} size={22} strokeWidth={1.8} />
        </View>
        <CardContent gap={1} style={styles.identity}>
          <Text numberOfLines={1} style={styles.name}>
            {appointment.doctorName}
          </Text>
          <Text style={styles.specialty}>{appointment.specialty}</Text>
        </CardContent>
        {onPress ? (
          <Pressable
            accessibilityLabel="Open appointment details"
            accessibilityRole="button"
            onPress={onPress}
            style={styles.chevron}
          >
            <ChevronRight
              color={colors.patient.primaryDark}
              size={19}
              strokeWidth={2.3}
            />
          </Pressable>
        ) : null}
      </CardHeader>

      <CardSeparator color="#FFFFFF44" />

      <View style={styles.details}>
        <BookingDetail
          icon={<CalendarDays color={colors.white} size={18} strokeWidth={1.8} />}
          label="Date"
          value={appointment.date}
        />
        <BookingDetail
          icon={<Clock3 color={colors.white} size={18} strokeWidth={1.8} />}
          label="Time"
          value={appointment.time}
        />
      </View>

      <Accordion
        title="Appointment Details"
        variant="plain"
        chevronColor={colors.white}
        chevronSize={17}
        separator={false}
        headerStyle={styles.accordionHeader}
        titleStyle={styles.accordionTitle}
        contentStyle={styles.accordionContent}
      >
        <View style={styles.detailsList}>
          <DetailRow
            icon={<Hash size={15} color="#C8EDE9" strokeWidth={2} />}
            label="Appointment ID"
            value={appointment.id}
          />
          <DetailRow
            icon={<Building2 size={15} color="#C8EDE9" strokeWidth={2} />}
            label="Hospital"
            value={appointment.hospital}
          />
          <DetailRow
            icon={<MapPin size={15} color="#C8EDE9" strokeWidth={2} />}
            label="Location"
            value={appointment.location}
          />
          <DetailRow
            icon={<CreditCard size={15} color="#C8EDE9" strokeWidth={2} />}
            label="Consultation Fee"
            value={appointment.fee}
          />
          <DetailRow
            icon={<Stethoscope size={15} color="#C8EDE9" strokeWidth={2} />}
            label="Doctor Experience"
            value={appointment.experience}
          />
          <DetailRow
            icon={<Star size={15} color="#C8EDE9" strokeWidth={2} />}
            label="Doctor Rating"
            value={appointment.rating}
          />
          <DetailRow
            icon={<UserRound size={15} color="#C8EDE9" strokeWidth={2} />}
            label="Qualification"
            value={appointment.qualification}
          />
        </View>

        {onPress ? (
          <Button
            label="View Appointment Status"
            variant="secondary"
            theme="patient"
            onPress={onPress}
            style={styles.actionButton}
            labelStyle={styles.actionButtonLabel}
            rightIcon={
              <ChevronRight
                size={16}
                color={colors.patient.primaryDark}
                strokeWidth={2.4}
              />
            }
          />
        ) : null}
      </Accordion>
    </Card>
  );
}

function BookingDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detail}>
      {icon}
      <View style={styles.detailCopy}>
        <Text style={styles.detailLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.detailValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.expandedRow}>
      <View style={styles.expandedLabelCol}>
        {icon}
        <Text style={styles.expandedLabel}>{label}</Text>
      </View>
      <Text numberOfLines={2} style={styles.expandedValue}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: radius.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  type: {
    color: colors.white,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    fontWeight: "500",
    lineHeight: 18,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#FFFFFF2E",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusDotApproved: {
    backgroundColor: "#A7F3D0",
  },
  statusDotPending: {
    backgroundColor: "#FDE68A",
  },
  statusText: {
    color: colors.white,
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: "500",
  },
  avatar: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: "#FFFFFF42",
  },
  identity: { flex: 1 },
  name: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
  },
  specialty: {
    color: "#D8F1EF",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 15,
  },
  chevron: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 17,
    backgroundColor: colors.patient.surface,
  },
  details: {
    flexDirection: "row",
    gap: 14,
  },
  detail: {
    minWidth: 0,
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailCopy: { minWidth: 0, flex: 1 },
  detailLabel: {
    color: "#C8EDE9",
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 13,
  },
  detailValue: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 15,
  },
  accordionHeader: {
    paddingHorizontal: 0,
    paddingVertical: 6,
    minHeight: 32,
  },
  accordionTitle: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
  },
  accordionContent: {
    paddingHorizontal: 0,
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  detailsList: {
    gap: 9,
    paddingVertical: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#FFFFFF33",
    paddingTop: 10,
  },
  expandedRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  expandedLabelCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  expandedLabel: {
    color: "#C8EDE9",
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    fontWeight: "500",
  },
  expandedValue: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "right",
    flexShrink: 1,
  },
  actionButton: {
    minHeight: 40,
    borderRadius: radius.md,
    backgroundColor: colors.white,
    marginTop: 4,
  },
  actionButtonLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 13,
    fontWeight: "700",
  },
});
