import { useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Card, FadedScrollView, Header } from "@startup/mobile-ui";
import { NotificationDrawer } from "../../../components/NotificationDrawer";
import {
  ProfileIdentity,
  ProfilePinCard,
  ProfileStats,
  SettingsView,
} from "../components/index";
import { patientProfile } from "../utils/profileConstants";
import type { ProfileScreenProps } from "../types/profile";

export function ProfileScreen({ onBackPress }: ProfileScreenProps) {
  const [currentView, setCurrentView] = useState<"profile" | "settings">("profile");
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  // Hardware back button handling
  useEffect(() => {
    const onHardwareBack = () => {
      if (currentView === "settings") {
        setCurrentView("profile");
        return true;
      }
      return false;
    };
    const sub = BackHandler.addEventListener("hardwareBackPress", onHardwareBack);
    return () => sub.remove();
  }, [currentView]);

  // Render Settings View as a dedicated page
  if (currentView === "settings") {
    return <SettingsView onBack={() => setCurrentView("profile")} />;
  }

  // Render Main Profile Page
  return (
    <View style={styles.screen}>
      <Header
        title="Profile"
        app="patient"
        onBackPress={onBackPress}
      />
      <FadedScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar & Name - Cleanly below header */}
        <ProfileIdentity
          initials={patientProfile.initials}
          name={patientProfile.name}
        />

        {/* Stats Row */}
        <ProfileStats
          age={patientProfile.age}
          blood={patientProfile.blood}
          bookings={patientProfile.bookings}
        />

        {/* 1. SEPARATE CARD: My Bookings */}
        <Card
          variant="outlined"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          backgroundColor={colors.white}
          padding={16}
          style={styles.cardNoShadow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="My Bookings"
            onPress={() => router.navigate("/appointments")}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.iconCircle}>
              <CalendarDays color={colors.patient.primaryDark} size={18} />
            </View>
            <View style={styles.copyCol}>
              <Text style={styles.rowTitle}>My Bookings</Text>
              <Text style={styles.rowSubtitle}>
                View past & upcoming consultations
              </Text>
            </View>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{patientProfile.bookings}</Text>
            </View>
            <ChevronRight color="#8EA0B4" size={18} />
          </Pressable>
        </Card>

        {/* 2. SEPARATE CARD: Notifications */}
        <Card
          variant="outlined"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          backgroundColor={colors.white}
          padding={16}
          style={styles.cardNoShadow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={() => setNotificationsOpen(true)}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.iconCircle}>
              <Bell color={colors.patient.primaryDark} size={18} />
            </View>
            <View style={styles.copyCol}>
              <Text style={styles.rowTitle}>Notifications</Text>
              <Text style={styles.rowSubtitle}>
                Reminders, prescriptions & alerts
              </Text>
            </View>
            <View style={styles.newBadge}>
              <Text style={styles.newBadgeText}>3 New</Text>
            </View>
            <ChevronRight color="#8EA0B4" size={18} />
          </Pressable>
        </Card>

        {/* 3. SEPARATE CARD: Set Security PIN */}
        <ProfilePinCard />

        {/* 4. SEPARATE CARD: Settings (Opens Settings Page) */}
        <Card
          variant="outlined"
          borderRadius={radius.md}
          borderWidth={1}
          borderColor="#E0E5EB"
          backgroundColor={colors.white}
          padding={16}
          style={styles.cardNoShadow}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            onPress={() => setCurrentView("settings")}
            style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
          >
            <View style={styles.iconCircle}>
              <SettingsIcon color={colors.patient.primaryDark} size={18} />
            </View>
            <View style={styles.copyCol}>
              <Text style={styles.rowTitle}>Settings</Text>
              <Text style={styles.rowSubtitle}>
                Theme, help, privacy & logout
              </Text>
            </View>
            <ChevronRight color="#8EA0B4" size={18} />
          </Pressable>
        </Card>
      </FadedScrollView>

      {/* Notifications Drawer */}
      <NotificationDrawer
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.patient.background },
  content: {
    gap: 14,
    paddingHorizontal: spacing.lg,
    paddingTop: 12,
    paddingBottom: 100,
  },
  cardNoShadow: {
    elevation: 0,
    shadowOpacity: 0,
  },
  actionRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#EDF9F7",
  },
  copyCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
  },
  rowSubtitle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  badge: {
    minWidth: 24,
    height: 22,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 7,
    borderRadius: 11,
    backgroundColor: colors.patient.accent,
  },
  badgeText: {
    color: colors.white,
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    fontWeight: "700",
  },
  newBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: "#E8F5F4",
    borderWidth: 1,
    borderColor: "#C8EDE9",
  },
  newBadgeText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 10,
    fontWeight: "700",
  },
  pressed: { opacity: 0.72 },
});
