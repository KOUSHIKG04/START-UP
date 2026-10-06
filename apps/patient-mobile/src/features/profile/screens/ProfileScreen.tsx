import { useEffect, useState } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  getMyPatientProfileDetail,
  listClinicAppointments,
  listMyFamilyProfiles,
} from "@startup/data-access";
import {
  Bell,
  CalendarDays,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Card, FadedScrollView, Header, useToastFeedback } from "@startup/mobile-ui";
import { NotificationDrawer } from "../../../components/NotificationDrawer";
import {
  ProfileIdentity,
  ProfileStats,
  SettingsView,
} from "../components/index";
import { supabase, useMobileSession } from "../../../services/supabase";
import type { ProfileScreenProps } from "../types/profile";

export function ProfileScreen({ onBackPress }: ProfileScreenProps) {
  const { profile } = useMobileSession();
  const detail = useQuery({
    queryKey: ["my-patient-profile-detail", profile?.patient_id],
    queryFn: () => getMyPatientProfileDetail(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const family = useQuery({
    queryKey: ["my-family-profiles", profile?.patient_id],
    queryFn: () => listMyFamilyProfiles(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  useToastFeedback({ error: family.isError ? "Family profiles are unavailable right now." : "" });
  const bookings = useQuery({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const name =
    detail.data?.full_name ?? profile?.display_name ?? "Your profile";
  const [currentView, setCurrentView] = useState<"profile" | "settings">(
    "profile"
  );
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
    const sub = BackHandler.addEventListener(
      "hardwareBackPress",
      onHardwareBack
    );
    return () => sub.remove();
  }, [currentView]);

  // Render Settings View as a dedicated page
  if (currentView === "settings") {
    return <SettingsView onBack={() => setCurrentView("profile")} />;
  }

  // Render Main Profile Page
  return (
    <View style={styles.screen}>
      <Header title="Profile" app="patient" onBackPress={onBackPress} />
      <FadedScrollView
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Avatar & Name - Cleanly below header */}
        <ProfileIdentity
          initials={name
            .split(/\s+/)
            .slice(0, 2)
            .map((part) => part[0])
            .join("")
            .toUpperCase()}
          name={name}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Edit profile"
          onPress={() => router.push("/(app)/edit-profile")}
          style={styles.editButton}
        >
          <Text style={styles.editText}>Edit profile</Text>
        </Pressable>

        {/* Stats Row */}
        <ProfileStats
          age={
            detail.data?.age_years === null ||
            detail.data?.age_years === undefined
              ? "—"
              : `${detail.data.age_years} yrs`
          }
          blood={detail.data?.blood_group ?? "—"}
          bookings={String(bookings.data?.length ?? 0)}
        />
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
            accessibilityLabel="Add family member"
            onPress={() => router.push("/(app)/family-profile")}
            style={styles.actionRow}
          >
            <View style={styles.iconCircle}>
              <Text style={styles.familyIcon}>+</Text>
            </View>
            <View style={styles.copyCol}>
              <Text style={styles.rowTitle}>Family members</Text>
              <Text style={styles.rowSubtitle}>Add a family profile</Text>
            </View>
            <ChevronRight color="#8EA0B4" size={18} />
          </Pressable>
          {family.data?.map((member) => (
            <View key={member.id} style={styles.familyRow}>
              <Text style={styles.rowTitle}>
                {member.full_name} · {member.relation}
              </Text>
              <Text style={styles.rowSubtitle}>
                {member.verified ? "Verified" : "Awaiting verification"}
              </Text>
            </View>
          ))}
        </Card>

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
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.pressed,
            ]}
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
              <Text style={styles.badgeText}>{bookings.data?.length ?? 0}</Text>
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
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.pressed,
            ]}
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
              <Text style={styles.newBadgeText}>0 New</Text>
            </View>
            <ChevronRight color="#8EA0B4" size={18} />
          </Pressable>
        </Card>

        {/* Settings */}
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
            style={({ pressed }) => [
              styles.actionRow,
              pressed && styles.pressed,
            ]}
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
  editButton: {
    alignSelf: "flex-end",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.patient.primaryDark,
  },
  editText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  familyIcon: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 25,
  },
  familyRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 10,
    marginTop: 10,
    gap: 3,
  },
});
