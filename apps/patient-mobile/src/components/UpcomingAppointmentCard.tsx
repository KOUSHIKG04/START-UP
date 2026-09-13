import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  CalendarDays,
  ChevronRight,
  Clock3,
  UserRound,
} from "lucide-react-native";
import { colors, fontFamilies, gradients } from "@startup/design-tokens";
import {
  Button,
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardSeparator,
  CardTitle,
} from "@startup/mobile-ui";

export type UpcomingAppointmentCardProps = {
  doctorName?: string;
  specialization?: string;
  date?: string;
  time?: string;
  onCardPress?: () => void;
  onReschedulePress?: () => void;
  onViewProfilePress?: () => void;
};

export default function UpcomingAppointmentCard({
  doctorName = "Dr. Ananya Sharma",
  specialization = "General Physician",
  date = "Aug 18, Sunday",
  time = "8:30 PM – 9:00 PM",
  onCardPress,
  onReschedulePress,
  onViewProfilePress,
}: UpcomingAppointmentCardProps) {
  return (
    <Card
      accessibilityLabel={`Upcoming appointment with ${doctorName} on ${date} at ${time}`}
      backgroundColor={gradients.patientBanner.colors[1]}
      borderRadius={16}
      gap={10}
      onPress={onCardPress}
      padding={14}
      style={styles.card}
    >
      <LinearGradient
        pointerEvents="none"
        colors={gradients.patientBanner.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />

      <CardHeader gap={12} style={styles.header}>
        <View style={styles.avatar}>
          <UserRound color={colors.white} size={23} strokeWidth={1.9} />
        </View>

        <View style={styles.doctorDetails}>
          <CardTitle numberOfLines={1} style={styles.doctorName}>
            {doctorName}
          </CardTitle>
          <CardDescription numberOfLines={1} style={styles.specialization}>
            {specialization}
          </CardDescription>
        </View>

        <CardAction style={styles.chevronButton}>
          <ChevronRight
            color={colors.patient.primaryDark}
            size={17}
            strokeWidth={2.2}
          />
        </CardAction>
      </CardHeader>

      <CardSeparator color="#FFFFFF47" />

      <CardContent style={styles.detailsRow}>
        <AppointmentDetail
          icon={<CalendarDays color={colors.white} size={17} strokeWidth={1.9} />}
          label="Date"
          value={date}
        />
        <View style={styles.detailDivider} />
        <AppointmentDetail
          icon={<Clock3 color={colors.white} size={17} strokeWidth={1.9} />}
          label="Time"
          value={time}
        />
      </CardContent>

      <CardFooter gap={14} style={styles.cardFooter}>
        <Button
          hitSlop={4}
          label="Re-schedule"
          onPress={onReschedulePress}
          style={styles.actionButton}
          labelStyle={styles.actionLabel}
          theme="patient"
          variant="secondary"
        />
        <Button
          hitSlop={4}
          label="View Profile"
          onPress={onViewProfilePress}
          style={styles.actionButton}
          labelStyle={styles.actionLabel}
          theme="patient"
          variant="secondary"
        />
      </CardFooter>
    </Card>
  );
}

type AppointmentDetailProps = {
  icon: ReactNode;
  label: string;
  value: string;
};

function AppointmentDetail({ icon, label, value }: AppointmentDetailProps) {
  return (
    <View style={styles.detail}>
      <View style={styles.detailIcon}>{icon}</View>
      <View style={styles.detailText}>
        {/* <Text style={styles.detailLabel}>{label}</Text> */}
        <Text
          adjustsFontSizeToFit
          minimumFontScale={0.86}
          numberOfLines={1}
          style={styles.detailValue}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    width: "98%",
    padding:20,
    alignItems: "center",
  },
  gradient: {
    ...StyleSheet.absoluteFill,
    borderRadius: 18,
  },
  header: {
    minHeight: 4,
    marginBottom:8
  },
  avatar: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "#E6F7F675",
  },
  doctorDetails: {
    flex: 1,
    gap: 2,
  },
  doctorName: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
  },
  specialization: {
    color: "#FFFFFFC7",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  chevronButton: {
    width: 30,
    height: 30,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 15,
    backgroundColor: colors.patient.surface,
  },
  detailsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical:4
  },
  detail: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  detailIcon: {
    width: 20,
    alignItems: "center",
  },
  detailText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  detailLabel: {
    color: "#FFFFFFB8",
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
  detailValue: {
    color: colors.white,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  detailDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: "#FFFFFF38",
  },
  actionButton: {
    flex: 1,
    minHeight: 38,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  actionLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    lineHeight: 16,
  },
  cardFooter:{
    marginTop:4
  }
});
