import { ProfileAction } from "../components/ProfileAction";
import { ContactDetail } from "../components/ContactDetail";
import { styles } from "../components/ProfileScreen.styles";
import { usePatientProfile } from "../hooks/usePatientProfile";

import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";

import { Pressable, StyleSheet, View } from "react-native";
import { router } from "expo-router";

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
  Settings as SettingsIcon,
} from "lucide-react-native";
import { colors, gradients } from "@startup/design-tokens";
import { StatusBar } from "expo-status-bar";
import {
  Accordion,
  Button,
  Card,
  Skeleton,
  FadedScrollView,
  Header,
} from "@startup/mobile-ui";
import { NotificationDrawer } from "../../notifications/components/NotificationDrawer";
import {
  ProfileIdentity,
  ProfileStats,
  SettingsView,
} from "../components/index";

import type { ProfileScreenProps } from "../types/profile";

export function ProfileScreen({ onBackPress }: ProfileScreenProps) {
  const {
    showToast,
    detail,
    profilePhoto,
    family,
    unreadCount,
    name,
    currentView,
    setCurrentView,
    notificationsOpen,
    setNotificationsOpen,
  } = usePatientProfile({ onBackPress });
  return (
    <View style={styles.screen}>
      <View
        style={styles.screen}
        pointerEvents={currentView === "settings" ? "none" : "auto"}
        accessibilityElementsHidden={currentView === "settings"}
        importantForAccessibility={
          currentView === "settings" ? "no-hide-descendants" : "auto"
        }
      >
        <StatusBar style="light" />
        <LinearGradient
          style={styles.summaryGradient}
          colors={gradients.patientBanner.colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <SafeAreaView edges={["top"]}>
            <Header
              title="Profile"
              app="patient"
              backgroundColor="transparent"
              safeAreaEdges={[]}
              onBackPress={onBackPress}
              rightAction={
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open Settings"
                  onPress={() => setCurrentView("settings")}
                  style={({ pressed }) => [
                    styles.headerSettings,
                    pressed && styles.headerSettingsPressed,
                  ]}
                >
                  <View style={styles.headerSettingsCircle}>
                    <SettingsIcon
                      size={22}
                      color={colors.patient.primaryDark}
                    />
                  </View>
                </Pressable>
              }
            />
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
                  gender={detail.data?.gender}
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
                title="Add family members"
                icon={<Users size={21} color={colors.patient.primaryDark} />}
                trailingIcon={
                  <View style={styles.familyPlus}>
                    <Plus size={21} color={colors.patient.primaryDark} />
                  </View>
                }
                neutralCount
                count={
                  family.data?.length ? String(family.data.length) : undefined
                }
                onPress={() => router.push("/(app)/family-profile")}
              />
            </Card>
          </View>

          <View style={styles.section}>
            <Accordion
              title="Personal details"
              defaultOpen
              theme="patient"
              variant="outlined"
              leftIcon={
                <View style={styles.actionIcon}>
                  <UserRound size={21} color={colors.patient.primaryDark} />
                </View>
              }
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
                    icon={
                      <Phone size={18} color={colors.patient.primaryDark} />
                    }
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
                    icon={
                      <MapPin size={18} color={colors.patient.primaryDark} />
                    }
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
              <Button
                theme="patient"
                label="Edit profile"
                variant="outline"
                leftIcon={
                  <Pencil size={15} color={colors.patient.primaryDark} />
                }
                onPress={() => router.push("/(app)/edit-profile")}
                style={styles.editButton}
                labelStyle={styles.editLabel}
              />
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
                title="Transactions"
                icon={<Receipt size={21} color={colors.patient.primaryDark} />}
                onPress={() =>
                  showToast({
                    type: "info",
                    title: "Transactions unavailable",
                    message:
                      "Transaction history is not available yet. Payments are not connected.",
                  })
                }
              />
            </Card>
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
        importantForAccessibility={
          currentView === "settings" ? "auto" : "no-hide-descendants"
        }
        pointerEvents={currentView === "settings" ? "auto" : "none"}
        style={[
          StyleSheet.absoluteFill,
          styles.settingsOverlay,
          { opacity: currentView === "settings" ? 1 : 0 },
        ]}
      >
        <SettingsView onBack={() => setCurrentView("profile")} />
      </View>
    </View>
  );
}
