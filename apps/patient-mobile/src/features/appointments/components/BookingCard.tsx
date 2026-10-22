import type { BookingCardProps } from "../types/booking-card";
import { AppText as Text, Card, useToast } from "@startup/mobile-ui";
import {
  Pressable,
  ActivityIndicator,
  StyleSheet,
  View,
  type GestureResponderEvent,
} from "react-native";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import {
  CalendarDays,
  ChevronRight,
  EllipsisVertical,
  UserRound,
} from "lucide-react-native";
import {
  colors,
  fontFamilies,
  gradients,
  mobileTypography,
  radius,
  typography,
} from "@startup/design-tokens";

export default function BookingCard({
  appointment,
  onPress,
  statusLabel,
  footer,
  onMorePress,
  moreDisabled = false,
  moreLoading = false,
}: BookingCardProps) {
  const { showToast } = useToast();
  const openDoctorProfile = (event?: GestureResponderEvent) => {
    event?.stopPropagation();
    if (!appointment.practiceId) {
      showToast({
        type: "info",
        title: "Doctor details unavailable",
        message:
          "The doctor profile link is not available for this booking yet.",
      });
      return;
    }
    router.push({
      pathname: "/doctor-profile",
      params: {
        practiceId: appointment.practiceId,
        serviceId: appointment.serviceId ?? "",
        consultationType: appointment.consultationType,
      },
    });
  };
  const doctorLinkLabel = `View doctor profile for ${appointment.doctorName}`;
  const displayedStatus =
    statusLabel ??
    (appointment.status === "approved" ? "Confirmed" : "Pending");
  const statusTone =
    displayedStatus.toLowerCase() === "pending"
      ? styles.pendingStatus
      : ["cancelled", "no show"].includes(displayedStatus.toLowerCase())
        ? styles.inactiveStatus
        : styles.confirmedStatus;

  return (
    <Card
      accessible={false}
      variant="outlined"
      theme="patient"
      backgroundColor={gradients.patientBanner.colors[0]}
      borderRadius={radius.lg}
      padding={0}
      gap={0}
      style={styles.card}
    >
      <LinearGradient
        pointerEvents="none"
        colors={gradients.patientBanner.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      />
      <Pressable
        accessibilityRole={onPress ? "button" : undefined}
        accessibilityLabel={`${appointment.consultationType} with ${appointment.doctorName} on ${appointment.date} at ${appointment.time}${onPress ? ". Open appointment details" : ""}`}
        accessibilityActions={[
          { name: "doctorProfile", label: doctorLinkLabel },
          ...(onMorePress
            ? [{ name: "bookingActions", label: "More booking actions" }]
            : []),
        ]}
        onAccessibilityAction={(event) => {
          if (event.nativeEvent.actionName === "doctorProfile")
            openDoctorProfile();
          if (
            event.nativeEvent.actionName === "bookingActions" &&
            !moreDisabled &&
            !moreLoading
          )
            onMorePress?.();
        }}
        onPress={onPress}
        style={({ pressed }) => [
          styles.summary,
          pressed && onPress && styles.pressed,
        ]}
      >
        <View style={styles.row}>
          <View style={styles.profileSummary}>
            <Pressable
              accessibilityRole="link"
              accessibilityLabel={doctorLinkLabel}
              onPress={openDoctorProfile}
              style={({ pressed }) => [
                styles.avatar,
                pressed && styles.pressed,
              ]}
            >
              <UserRound color={colors.white} size={24} strokeWidth={1.8} />
            </Pressable>
            <View style={styles.content}>
              <Pressable
                accessibilityRole="link"
                accessibilityLabel={doctorLinkLabel}
                onPress={openDoctorProfile}
                style={({ pressed }) => [
                  styles.nameLink,
                  pressed && styles.pressed,
                ]}
              >
                <Text variant="inherit" numberOfLines={2} style={styles.name}>
                  {appointment.doctorName}
                </Text>
              </Pressable>
              <Text variant="inherit" style={styles.specialty}>
                {appointment.specialty ? `${appointment.specialty} · ` : ""}
                {appointment.consultationType}
              </Text>
            </View>
          </View>
          {onMorePress || onPress ? (
            <View style={styles.trailingActions}>
              {onMorePress ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`More booking actions for ${appointment.doctorName}`}
                  accessibilityState={{
                    disabled: moreDisabled || moreLoading,
                    busy: moreLoading,
                  }}
                  disabled={moreDisabled || moreLoading}
                  onPress={(event) => {
                    event.stopPropagation();
                    onMorePress();
                  }}
                  style={({ pressed }) => [
                    styles.moreButton,
                    pressed && styles.pressed,
                    moreDisabled && styles.disabled,
                  ]}
                >
                  {moreLoading ? (
                    <ActivityIndicator color={colors.white} size="small" />
                  ) : (
                    <EllipsisVertical color={colors.white} size={18} />
                  )}
                </Pressable>
              ) : null}
              {onPress ? (
                <View style={styles.chevron}>
                  <ChevronRight
                    color={colors.patient.primaryDark}
                    size={18}
                    strokeWidth={2}
                  />
                </View>
              ) : null}
            </View>
          ) : null}
        </View>
        <View style={styles.scheduleRow}>
          <View style={styles.schedule}>
            <CalendarDays color={colors.white} size={14} strokeWidth={1.8} />
            <Text variant="inherit" style={styles.scheduleText}>
              {appointment.date}
              {"\u00a0· "}
              {appointment.time.replace(/\s([ap]m)\b/gi, "\u00a0$1")}
            </Text>
          </View>
          <View style={styles.statusBadge}>
            <View
              style={[styles.statusDot, { backgroundColor: statusTone.color }]}
            />
            <Text variant="inherit" style={styles.statusText}>
              {displayedStatus}
            </Text>
          </View>
        </View>
      </Pressable>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { overflow: "hidden" },
  gradient: { ...StyleSheet.absoluteFill, borderRadius: radius.lg },
  summary: { paddingVertical: 16, gap: 12 },
  footer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#FFFFFF33",
  },
  moreButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  disabled: { opacity: 0.5 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
  },
  trailingActions: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 0,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "#FFFFFF33",
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  profileSummary: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    flexShrink: 0,
    borderRadius: 14,
    backgroundColor: "#FFFFFF42",
    alignItems: "center",
    justifyContent: "center",
  },
  content: { flex: 1, minWidth: 0, gap: 4 },
  nameLink: { minWidth: 0, justifyContent: "center" },
  name: {
    ...typography.body,
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontWeight: "600",
  },
  specialty: {
    ...typography.caption,
    color: "#EFFAF9",
    fontFamily: fontFamilies.regular,
  },
  statusBadge: {
    maxWidth: "48%",
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#0000001A",
  },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  confirmedStatus: { color: "#A7F3D0" },
  pendingStatus: { color: "#FDE68A" },
  inactiveStatus: { color: "#EFFAF9" },
  statusText: {
    ...mobileTypography.caption,
    flexShrink: 1,
    color: colors.white,
    fontFamily: fontFamilies.medium,
    fontWeight: "500",
    textTransform: "capitalize",
  },
  schedule: {
    flex: 1,
    minWidth: 0,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  scheduleText: {
    ...typography.caption,
    flex: 1,
    color: colors.white,
    fontFamily: fontFamilies.medium,
    fontWeight: "500",
    fontVariant: ["tabular-nums"],
  },
  chevron: {
    width: 28,
    height: 28,
    flexShrink: 0,
    borderRadius: 14,
    backgroundColor: colors.patient.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.75 },
});
