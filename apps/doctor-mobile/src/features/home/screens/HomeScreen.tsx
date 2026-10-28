import { useDoctorHome } from "../hooks/useDoctorHome";

import { Pressable, StyleSheet, Text, View } from "react-native";

import { Bell, MapPin, ArrowRight, ChevronDown } from "lucide-react-native";
import { router } from "expo-router";

import { FadedScrollView, Skeleton } from "@startup/mobile-ui";
import { fontFamilies, shadows } from "@startup/design-tokens";
import { StatusBar } from "expo-status-bar";
import { NotificationDrawer } from "../../notifications/components/NotificationDrawer";
import { PatientCard } from "../../patients/components/PatientCard";
import {
  Choice,
  Heading,
  IconButton,
  Label,
  Panel,
} from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

import { locationHeadline } from "../../locations/utils/locationDisplay";

export function HomeScreen() {
  const {
    refresh,
    greeting,
    insets,
    showNotifications,
    setShowNotifications,
    presenceError,
    selectedLocation,
    doctorProfile,
    appointments,
    presence,
    todayAppointments,
    waiting,
    pendingRequests,
    homeAppointments,
    changePresence,
  } = useDoctorHome();
  return (
    <View style={ui.screen}>
      <StatusBar style="light" />
      <View
        style={[styles.header, { minHeight: Math.max(165, insets.top + 88) }]}
      >
        <View style={[styles.headerRow, { marginTop: insets.top + 18 }]}>
          <Text style={styles.greeting} numberOfLines={1}>
            {greeting}! {doctorProfile.data?.full_name ?? "Doctor"}
          </Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Selected location: ${locationHeadline(selectedLocation)}. Change location`}
            onPress={() => router.push("/select-location")}
            style={styles.location}
          >
            <MapPin size={15} strokeWidth={2} color={palette.white} />
            <Text
              style={styles.locationText}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {locationHeadline(selectedLocation)}
            </Text>
            <ChevronDown size={15} color={palette.white} />
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          hitSlop={10}
          onPress={() => setShowNotifications(true)}
          style={({ pressed }) => [
            styles.notificationButton,
            { top: insets.top + 22 },
            pressed && styles.notificationButtonPressed,
          ]}
        >
          <Bell size={20} strokeWidth={1.9} color={palette.primary} />
        </Pressable>
      </View>
      <FadedScrollView
        onRefresh={refresh}
        refreshTheme="doctor"
        edgeColor="white"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 130 + insets.bottom },
        ]}
      >
        <View style={ui.row}>
          {[
            [String(todayAppointments.length), "Appointments"],
            [String(waiting), "In Queue"],
          ].map(([value, title], index) => (
            <View key={title} style={styles.stat}>
              <Heading
                style={{
                  fontSize: 24,
                  lineHeight: 30,
                  color: index === 1 ? palette.text : palette.accent,
                }}
              >
                {value}
              </Heading>
              <Label muted style={styles.caption}>
                {title}
              </Label>
            </View>
          ))}
        </View>
        <View style={[ui.between, { marginTop: 12 }]}>
          <Heading>
            {pendingRequests.length
              ? "Appointment requests"
              : "Today’s Appointment"}
          </Heading>
          <IconButton
            label="See all appointments"
            onPress={() => router.navigate("/appointments")}
            style={{ width: 80 }}
          >
            <View style={{ ...ui.row, gap: 4 }}>
              <Label style={{ color: palette.dark, fontSize: 13 }}>
                See all
              </Label>
              <ArrowRight size={15} color={palette.dark} />
            </View>
          </IconButton>
        </View>
        {appointments.isLoading ? (
          <Skeleton theme="doctor" height={110} radius={14} />
        ) : null}
        {appointments.isError ? (
          <Panel>
            <Label style={ui.error}>Could not load appointments.</Label>
          </Panel>
        ) : null}
        {homeAppointments.length === 0 &&
        !appointments.isLoading &&
        !appointments.isError ? (
          <View style={styles.emptyAppointments}>
            <Label muted style={styles.emptyText}>
              No clinic appointments today.
            </Label>
          </View>
        ) : null}
        {homeAppointments.slice(0, 2).map((item) => (
          <PatientCard
            key={item.id}
            appointment={item}
            home
            actionLabel={
              item.confirmation_payment_pending
                ? "View payment status"
                : item.status === "pending"
                  ? "Review request"
                  : "View appointment"
            }
            onOpen={() =>
              router.navigate({
                pathname: "/appointment-details",
                params: { appointmentId: item.id },
              })
            }
            onAction={() =>
              router.navigate({
                pathname: "/appointment-details",
                params: { appointmentId: item.id },
              })
            }
          />
        ))}
        <View
          style={[
            styles.availability,
            todayAppointments.length === 0 && styles.emptyAvailability,
          ]}
        >
          <View
            style={[
              ui.row,
              {
                gap: 0,
                borderRadius: 24,
                padding: 4,
                backgroundColor: palette.surface,
              },
            ]}
          >
            <Choice
              label="Out"
              selected={!presence.data}
              onPress={() => void changePresence(false)}
            />
            <Choice
              label="In"
              selected={Boolean(presence.data)}
              onPress={() => void changePresence(true)}
            />
          </View>
          <Label muted style={{ fontSize: 11 }}>
            Clinic presence
          </Label>
        </View>
        {presenceError ? <Label style={ui.error}>{presenceError}</Label> : null}
      </FadedScrollView>
      <NotificationDrawer
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    backgroundColor: palette.primary,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  emptyAppointments: {
    flex: 1,
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: { textAlign: "center" },
  emptyAvailability: { flex: 0 },
  headerRow: {
    height: 70,
    justifyContent: "center",
    alignItems: "flex-start",
    paddingHorizontal: 24,
  },
  greeting: {
    color: palette.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 34,
    paddingRight: 52,
    maxWidth: "100%",
  },
  notificationButton: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: palette.white,
    alignItems: "center",
    justifyContent: "center",
    ...shadows.card,
  },
  notificationButtonPressed: { opacity: 0.75, transform: [{ scale: 0.95 }] },
  location: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    maxWidth: "75%",
    minHeight: 26,
  },
  locationText: {
    color: palette.white,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    flexShrink: 1,
  },
  content: { padding: 16, paddingTop: 10, gap: 14, flexGrow: 1 },
  stat: {
    flex: 1,
    minWidth: 0,
    minHeight: 72,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.subtle,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 10,
  },
  caption: { fontSize: 11, fontFamily: fontFamilies.medium },
  availability: {
    flex: 1,
    minHeight: 110,
    justifyContent: "flex-end",
    alignItems: "flex-end",
    paddingTop: 20,
  },
});
