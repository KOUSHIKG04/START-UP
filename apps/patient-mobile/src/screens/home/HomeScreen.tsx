import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { router, type Href } from "expo-router";
import { Bell, ChevronDown, ChevronRight, MapPin } from "lucide-react-native";
import {
  colors,
  fontFamilies,
  gradients,
  shadows,
  spacing,
} from "@startup/design-tokens";
import { IconLabel, SafeAreaView, SearchInput } from "@startup/mobile-ui";
import { homeActions } from "../../utils/HomeActions";
import AmbulanceBanner from "../../components/AmbulanceBanner";
import UpcomingAppointmentCard from "../../components/UpcomingAppointmentCard";
import PopularServices from "../../components/PopularServices";

const findDoctorRoute = "/find-doctor" as Href;

export function HomeScreen() {
  return (
    <View style={styles.screen}>
      <LinearGradient
        colors={gradients.patientBanner.colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <SafeAreaView edges={["top"]} style={styles.safeArea}>
          <View style={styles.headerRow}>
            <View style={styles.welcome}>
              <Text style={styles.greeting}>Good Morning 👋</Text>
              {/* <View style={styles.locationRow}>
                <MapPin
                  color={styles.location.color}
                  size={12}
                  strokeWidth={2}
                />
                <Text style={styles.location}>New Delhi, India</Text>
                <ChevronDown
                  color={styles.location.color}
                  size={12}
                  strokeWidth={2}
                />
              </View> */}
            </View>

            <View style={styles.notificationButton}>
              <Bell
                color={colors.patient.primaryDark}
                size={20}
                strokeWidth={1.9}
              />
            </View>
          </View>
        </SafeAreaView>
      </LinearGradient>

      <View style={styles.searchWrap}>
        <SearchInput
          accessibilityLabel="Search doctors and services"
          containerStyle={styles.search}
          inputStyle={styles.searchInput}
          placeholder="Search doctors, services..."
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.actionsRow}>
          {homeActions.map((action) => (
            <IconLabel
              key={action.key}
              icon={action.icon}
              label={action.label}
              onPress={
                action.key === "doctor"
                  ? () => router.push(findDoctorRoute)
                  : undefined
              }
              surfaceSize={52}
              surfaceRadius={16}
              iconSize={24}
              labelWidth={76}
              gap={8}
              labelNumberOfLines={2}
              labelStyle={styles.actionLabel}
            />
          ))}
        </View>

        <View style={styles.ambulanceBanner}>
          <AmbulanceBanner />
        </View>

        <View style={styles.appointmentSection}>
          <View style={styles.appointmentHeading}>
            <Text style={styles.appointmentTitle}>Upcoming Appointments</Text>
            <Pressable style={styles.seeAllButton}>
              <Text style={styles.seeAllText}>See all</Text>
              <ChevronRight
                color={colors.patient.primaryDark}
                size={16}
                strokeWidth={2.2}
              />
            </Pressable>
          </View>

          <UpcomingAppointmentCard />
        </View>

        <PopularServices />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingBottom: 32,
    height: 165,
  },
  safeArea: {
    backgroundColor: "transparent",
  },
  headerRow: {
    minHeight: 72,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingTop: 8,
  },
  welcome: {
    gap: 4,
  },
  greeting: {
    color: colors.white,
    fontFamily: fontFamilies.semibold,
    fontSize: 22,
    fontWeight: "600",
    lineHeight: 34,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  location: {
    color: "#BFE7E3",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 14,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: colors.white,
    ...shadows.card,
  },
  searchWrap: {
    zIndex: 2,
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    marginTop: -22,
  },
  search: {
    maxWidth: 360,
    minHeight: 50,
    paddingVertical: 8,
    borderWidth: 0,
    borderRadius: 22,
    ...shadows.card,
  },
  searchInput: {
    fontFamily: fontFamilies.regular,
  },
  content: {
    paddingTop: 18,
    paddingHorizontal: 14,
    paddingBottom: 120,
    flexDirection: "column",
    gap: 14,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    gap: 8,
    marginTop: 2,
  },
  actionLabel: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    fontWeight: "400",
    lineHeight: 16,
  },
  ambulanceBanner: {
    marginTop: 10,
    alignItems: "center",
  },
  appointmentSection: {
    gap: 10,
    marginTop: 16,
  },
  appointmentHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  appointmentTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  seeAllText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "600",
    lineHeight: 18,
  },
});
