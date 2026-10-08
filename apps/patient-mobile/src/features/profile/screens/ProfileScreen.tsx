import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import { useEffect, useState, type ReactNode } from "react";
import { BackHandler, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import {
  getMyPatientProfileDetail,
  listClinicAppointments,
  listMyFamilyProfiles,
  listMyNotifications,
} from "@startup/data-access";
import {
  Bell,
  CalendarDays,
  Receipt,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  UserRound,
  Users,
  ChevronRight,
  Settings as SettingsIcon,
} from "lucide-react-native";
import { colors, fontFamilies, gradients } from "@startup/design-tokens";
import { StatusBar } from "expo-status-bar";
import {
  Accordion,
  Button,
  Card,
  Skeleton,
  FadedScrollView,
  Header,
  useToastFeedback,
  useToast,
} from "@startup/mobile-ui";
import { NotificationDrawer } from "../../../components/NotificationDrawer";
import {
  ProfileIdentity,
  ProfileStats,
  SettingsView,
} from "../components/index";
import { supabase, useMobileSession } from "../../../services/supabase";
import type { ProfileScreenProps } from "../types/profile";

export function ProfileScreen({ onBackPress }: ProfileScreenProps) {
  const { showToast } = useToast();
  const { profile } = useMobileSession();
  const detail = useQuery({
    queryKey: ["my-patient-profile-detail", profile?.patient_id],
    queryFn: () => getMyPatientProfileDetail(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const profilePhoto = useQuery({
    queryKey: ["my-patient-profile-photo", detail.data?.profile_photo_path],
    queryFn: async () => {
      const { data, error } = await supabase!.storage
        .from("patient-profile-photos")
        .createSignedUrl(detail.data!.profile_photo_path!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
    enabled: Boolean(supabase && detail.data?.profile_photo_path),
    staleTime: 30 * 60 * 1000,
  });
  const family = useQuery({
    queryKey: ["my-family-profiles", profile?.patient_id],
    queryFn: () => listMyFamilyProfiles(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  useToastFeedback({
    error: family.isError ? "Family profiles are unavailable right now." : "",
  });
  const bookings = useQuery({
    queryKey: ["patient-clinic-appointments"],
    queryFn: () => listClinicAppointments(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const notifications = useQuery({
    queryKey: ["my-notifications"],
    queryFn: () => listMyNotifications(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });
  const unreadCount =
    notifications.data?.filter((item) => !item.is_read).length ?? 0;
  useToastFeedback({
    error: detail.isError
      ? "Could not load your profile. Use Retry profile to try again."
      : bookings.isError
        ? "Your bookings are unavailable right now."
        : "",
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

  return (
    <View style={styles.screen}>
      <View style={styles.screen} pointerEvents={(currentView === "settings") ? "none" : "auto"} accessibilityElementsHidden={(currentView === "settings")} importantForAccessibility={(currentView === "settings") ? "no-hide-descendants" : "auto"}>
      <StatusBar style="light" />
      <LinearGradient style={styles.summaryGradient} colors={gradients.patientBanner.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
        <SafeAreaView edges={["top"]}>
          <Header title="Profile" app="patient" backgroundColor="transparent" safeAreaEdges={[]} onBackPress={onBackPress} rightAction={
            <Pressable accessibilityRole="button" accessibilityLabel="Open Settings" onPress={() => setCurrentView("settings")} style={({ pressed }) => [styles.headerSettings, pressed && styles.headerSettingsPressed]}>
              <View style={styles.headerSettingsCircle}>
                <SettingsIcon size={22} color={colors.patient.primaryDark} />
              </View>
            </Pressable>
          } />
        <View style={styles.identitySection}>
          {detail.isLoading ? (
            <View style={styles.identityLoading}>
              <Skeleton width={88} height={88} radius={44} />
              <View style={styles.identityLoadingCopy}>
                <Skeleton width="80%" height={26} />
                <Skeleton width={116} height={44} />
              </View>
            </View>
          ) : (
            <ProfileIdentity
              initials={name
                .split(/\s+/)
                .slice(0, 2)
                .map((part) => part[0])
                .join("")
                .toUpperCase()}
              inverse
              name={name}
              photoUrl={profilePhoto.data}
            >
              <ProfileStats
            age={
              detail.data?.age_years == null
                ? "—"
                : `${detail.data.age_years} yrs`
            }
            blood={detail.data?.blood_group ?? "—"}
              />
            </ProfileIdentity>
          )}
        </View>

        </SafeAreaView>
      </LinearGradient>
      <FadedScrollView
        contentContainerStyle={styles.content}
        edgeColor={colors.white}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.section}>
          <Card theme="patient" variant="outlined" borderWidth={1} borderRadius={16} padding={0} gap={0} style={styles.flatCard}>
            <ProfileAction title="Add family members" icon={<Users size={21} color={colors.patient.primaryDark} />} trailingIcon={<View style={styles.familyPlus}><Plus size={21} color={colors.patient.primaryDark} /></View>} count={family.data?.length ? String(family.data.length) : undefined} onPress={() => router.push("/(app)/family-profile")} />
          </Card>
        </View>

        <View style={styles.section}>
          <Accordion
            title="Personal details"
            defaultOpen
            theme="patient"
            variant="outlined"
            leftIcon={<View style={styles.actionIcon}><UserRound size={21} color={colors.patient.primaryDark} /></View>}
            style={styles.detailsAccordion}
            headerStyle={styles.detailsHeader}
            titleStyle={styles.personalTitle}
            contentStyle={styles.detailsBody}
            separatorColor={colors.border}
          >
          {detail.isLoading ? (
            <View style={styles.detailLoading}>
              <Skeleton height={18} width="70%" />
              <Skeleton height={18} width="85%" />
              <Skeleton height={18} width="60%" />
            </View>
          ) : (
            <View style={styles.details}>
              <ContactDetail
                icon={<Phone size={18} color={colors.patient.primaryDark} />}
                label="Phone number"
                value={detail.data?.contact_phone || "Not added"}
              />
              <ContactDetail
                icon={<Mail size={18} color={colors.patient.primaryDark} />}
                label="Email"
                value={detail.data?.email || "Not added"}
              />
              <ContactDetail
                icon={
                  <UserRound size={18} color={colors.patient.primaryDark} />
                }
                label="Gender"
                value={detail.data?.gender || "Not added"}
              />
              <ContactDetail
                icon={<MapPin size={18} color={colors.patient.primaryDark} />}
                label="Address"
                value={
                  detail.data?.address
                    ? [
                        detail.data.address.building,
                        detail.data.address.line1,
                        detail.data.address.line2,
                        detail.data.address.city,
                        detail.data.address.state,
                        detail.data.address.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ")
                    : "Not added"
                }
              />
              {detail.isError ? (
                <Button
                  label="Retry profile"
                  loading={detail.isFetching}
                  variant="outline"
                  onPress={() => void detail.refetch()}
                />
              ) : null}
            </View>
          )}
          <Button theme="patient" label="Edit profile" variant="outline" leftIcon={<Pencil size={15} color={colors.patient.primaryDark} />} onPress={() => router.push("/(app)/edit-profile")} style={styles.editButton} labelStyle={styles.editLabel} />
          </Accordion>
        </View>



        <View style={styles.section}>
          <Card
            theme="patient"
            variant="outlined"
            borderWidth={1}
            borderRadius={16}
            padding={0}
            gap={0}
            style={styles.flatCard}
          >
            <ProfileAction
              title="My Bookings"

              icon={
                <CalendarDays size={21} color={colors.patient.primaryDark} />
              }
              onPress={() => router.navigate("/appointments")}
            />
          </Card>

          <Card theme="patient" variant="outlined" borderWidth={1} borderRadius={16} padding={0} gap={0} style={styles.flatCard}>
            <ProfileAction title="Transactions" icon={<Receipt size={21} color={colors.patient.primaryDark} />} onPress={() => showToast({ type: "info", title: "Transactions unavailable", message: "Transaction history is not available yet. Payments are not connected." })} />
          </Card>
          <Card theme="patient" variant="outlined" borderWidth={1} borderRadius={16} padding={0} gap={0} style={styles.flatCard}>
            <ProfileAction
              title="Notifications"

              icon={<Bell size={21} color={colors.patient.primaryDark} />}
              count={unreadCount > 0 ? `${unreadCount} new` : undefined}
              onPress={() => setNotificationsOpen(true)}
            />
          </Card>
        </View>

      </FadedScrollView>
      <NotificationDrawer
        visible={notificationsOpen}
        onClose={() => setNotificationsOpen(false)}
      />
      </View>
      <View
        accessibilityViewIsModal={currentView === "settings"}
        accessibilityElementsHidden={currentView !== "settings"}
        importantForAccessibility={currentView === "settings" ? "auto" : "no-hide-descendants"}
        pointerEvents={currentView === "settings" ? "auto" : "none"}
        style={[StyleSheet.absoluteFill, styles.settingsOverlay, { opacity: currentView === "settings" ? 1 : 0 }]}
      >
        <SettingsView onBack={() => setCurrentView("profile")} />
      </View>
    </View>
  );
}

function ContactDetail({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>{icon}</View>
      <View style={styles.copyCol}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text style={styles.contactValue} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}

function ProfileAction({
  icon,
  title,
  count,
  trailingIcon,
  onPress,
}: {
  icon: ReactNode;
  title: string;
  count?: string;
  trailingIcon?: ReactNode;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.copyCol}>
        <Text style={styles.actionTitle}>{title}</Text>
      </View>
      {count ? (
        <View style={styles.countBadge}>
          <Text style={styles.countLabel}>{count}</Text>
        </View>
      ) : null}
      <View style={styles.trailingIcon}>
        {trailingIcon ?? <ChevronRight size={19} color={colors.patient.primaryDark} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.white },
  settingsOverlay: { backgroundColor: colors.white, zIndex: 2 },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 110,
    gap: 14,
  },
  summaryGradient: { borderBottomLeftRadius: 16, borderBottomRightRadius: 16, overflow: "hidden" },
  personalTitle: { fontFamily: fontFamilies.medium, fontWeight: "500", fontSize: 16, lineHeight: 21, color: colors.patient.text },
  identitySection: { gap: 0, paddingHorizontal: 20, paddingTop: 24, paddingBottom: 32 },
  headerSettings: { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: 4, marginTop: 4 },
  headerSettingsCircle: { width: 38, height: 38, borderRadius: 19, backgroundColor: colors.white, alignItems: "center", justifyContent: "center" },
  headerSettingsPressed: { opacity: 0.75, transform: [{ scale: 0.95 }] },
  identityLoading: { flexDirection: "row", alignItems: "center", gap: 16 },
  identityLoadingCopy: { flex: 1, gap: 12 },
  editButton: {
    alignSelf: "flex-end",
    borderRadius: 10,
    minHeight: 44,
    paddingHorizontal: 14,
    borderColor: colors.border,
    backgroundColor: colors.white,
    marginTop: 18,
  },
  editLabel: {
    fontSize: 14,
    lineHeight: 19,
    fontFamily: fontFamilies.semibold,
    color: colors.patient.primaryDark,
  },
  section: { gap: 14 },
  sectionHeading: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  sectionTitle: {
    fontFamily: fontFamilies.semibold,
    fontSize: 19,
    lineHeight: 25,
    color: colors.patient.text,
    flexShrink: 1,
  },
  addButton: { minHeight: 44, paddingHorizontal: 8, marginTop: 14, alignSelf: "flex-start" },
  addLabel: { fontFamily: fontFamilies.semibold, fontSize: 15 },
  details: { gap: 18 },
  detailsAccordion: { borderRadius: 16, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.white, elevation: 0, shadowOpacity: 0, boxShadow: "none", overflow: "hidden" },
  detailsHeader: { borderRadius: 16, minHeight: 57, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: colors.white },
  detailsBody: { padding: 18 },
  detailLoading: { gap: 18, paddingVertical: 8 },
  contactRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  contactIcon: { width: 24, paddingTop: 3, alignItems: "center" },
  copyCol: { flex: 1, gap: 5 },
  contactLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  contactValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  flatCard: { borderWidth: 1, borderColor: colors.border, boxShadow: "none", elevation: 0, shadowOpacity: 0, overflow: "hidden" },
  familyRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  dividedFamilyRow: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 18,
    paddingTop: 18,
  },
  familyAvatar: {
    width: 42,
    height: 42,
    backgroundColor: colors.patient.surface,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
  memberName: {
    fontFamily: fontFamilies.semibold,
    fontSize: 16,
    lineHeight: 21,
    color: colors.patient.text,
  },
  memberMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    color: colors.patient.textSecondary,
  },
  verification: {
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 17,
    color: colors.patient.textSecondary,
  },
  verified: { color: colors.patient.primaryDark },
  emptyFamily: { flexDirection: "row", alignItems: "center", gap: 14 },
  emptyCopy: {
    flex: 1,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 21,
    color: colors.patient.textSecondary,
  },
  actionRow: {
    borderRadius: 16,
    overflow: "hidden",
    minHeight: 57,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  trailingIcon: { transform: [{ translateX: -1 }] },
  familyPlus: { transform: [{ translateX: -3 }] },
  actionIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTitle: {
    fontFamily: fontFamilies.medium,
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 21,
    color: colors.patient.text,
  },
  actionDescription: {
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 18,
    color: colors.patient.textSecondary,
  },
  actionDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: 16,
  },
  countBadge: {
    backgroundColor: colors.patient.surface,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  countLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    lineHeight: 17,
    color: colors.patient.primaryDark,
  },
  pressed: { backgroundColor: "#0C243408" },
});
