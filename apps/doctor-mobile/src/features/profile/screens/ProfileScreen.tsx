import type { ReactNode } from "react";
import { StatusBar } from "expo-status-bar";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { fontFamilies } from "@startup/design-tokens";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Building,
  ChevronRight,
  DollarSign,
  User,
  Star,
  Mail,
  MapPin,
  Phone,
  Pencil,
  GraduationCap,
  BadgeCheck,
  Settings,
} from "lucide-react-native";
import {
  Accordion,
  Button,
  Card,
  Chip,
  FadedScrollView,
  Header,
  Skeleton,
  useToastFeedback,
} from "@startup/mobile-ui";
import { doctorLanguageName } from "@startup/contracts";
import { useQuery } from "@tanstack/react-query";
import { getMyDoctorPersonalAddress, getMyDoctorProfile } from "@startup/data-access";
import { palette, ui } from "../../../components/theme";
import { supabase, useMobileSession } from "../../../services/supabase";
const rows = [
  {
    title: "Edit profile",
    icon: User,
    color: "#087F78",
    background: "#EFFFF9",
  },
  {
    title: "My Ratings & Reviews",
    icon: Star,
    color: "#F59E0B",
    background: "#FFF8E5",
  },
  {
    title: "Earnings & Payouts",
    icon: DollarSign,
    color: "#FF7800",
    background: "#FFF3E2",
  },
  { title: "Settings", icon: Settings, color: "#008877", background: "#EFFFF9" },
  {
    title: "Hospital Settings",
    icon: Building,
    color: "#7565FF",
    background: "#F3F1FF",
  },

];
export function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, profile: sessionProfile } = useMobileSession();
  const profile = useQuery({
    queryKey: ["my-doctor-profile", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorProfile(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  const personalAddress = useQuery({
    queryKey: ["my-doctor-personal-address", sessionProfile?.doctor?.id],
    queryFn: () => getMyDoctorPersonalAddress(supabase!),
    enabled: Boolean(supabase && sessionProfile?.doctor?.id),
  });
  useToastFeedback({
    error: profile.isError
      ? "Could not load your doctor profile. Please try again."
      : "",
  });
  const profilePhotoUrl =
    profile.data?.profile_photo_path && supabase
      ? supabase.storage
          .from("provider-profile-photos")
          .getPublicUrl(profile.data.profile_photo_path).data.publicUrl
      : null;
  const name =
    profile.data?.full_name ?? sessionProfile?.display_name ?? "Doctor";
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <View style={styles.summary}>
        <SafeAreaView edges={["top"]}>
          <Header
            title="Profile"
            app="doctor"
            backgroundColor="transparent"
            safeAreaEdges={[]}
            onBackPress={() =>
              router.canGoBack() ? router.back() : router.navigate("/")
            }
          />
          <View style={styles.identitySection}>
            {profile.isLoading ? (
              <View style={styles.identity}>
                <Skeleton width={72} height={72} radius={36} />
                <View style={styles.identityCopy}>
                  <Skeleton width="80%" height={24} />
                  <Skeleton width="70%" height={18} />
                </View>
              </View>
            ) : (
              <>
                <View style={styles.identity}>
                  <View style={styles.avatarShadow}>
                    <View style={styles.avatar}>
                      {profilePhotoUrl ? (
                        <Image
                          source={{ uri: profilePhotoUrl }}
                          style={styles.photo}
                        />
                      ) : (
                        <Text style={styles.initials}>{initials}</Text>
                      )}
                    </View>
                  </View>
                  <View style={styles.identityCopy}>
                    <Text style={styles.name}>
                      {name}
                      {profile.data?.qualification || profile.data?.qualification_claim ? (
                        <Text style={styles.qualification}> {profile.data.qualification || profile.data.qualification_claim}</Text>
                      ) : null}
                    </Text>
                    <Text style={styles.specialty}>
                      {profile.data?.specialties
                        .map((item) => item.name)
                        .join(", ") || "Specialty awaiting review"}
                    </Text>
                    <Text style={styles.email} numberOfLines={1}>
                      {profile.data?.contact_email || session?.user.email || ""}
                    </Text>
                  </View>
                </View>
              </>
            )}
          </View>
        </SafeAreaView>
      </View>
      <FadedScrollView
        edgeColor={palette.white}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 125 + insets.bottom },
        ]}
      >
        <Accordion
          title="Personal details"
          defaultOpen={false}
          theme="doctor"
          variant="outlined"
          leftIcon={
            <View style={styles.actionIcon}>
              <User size={21} color={palette.primary} />
            </View>
          }
          style={styles.detailsAccordion}
          headerStyle={styles.detailsHeader}
          titleStyle={styles.accordionTitle}
          contentStyle={styles.detailsBody}
          separatorColor={palette.border}
        >
          {profile.isLoading ? (
            <View style={styles.details}>
              <Skeleton width="70%" height={18} />
              <Skeleton width="85%" height={18} />
              <Skeleton width="60%" height={18} />
            </View>
          ) : (
            <View style={styles.details}>
              <ProfileDetail
                icon={<Phone size={18} color={palette.primary} />}
                label="Phone number"
                value={
                  profile.data?.contact_phone ||
                  session?.user.phone ||
                  "Not linked"
                }
              />
              <ProfileDetail
                icon={<Mail size={18} color={palette.primary} />}
                label="Email"
                value={
                  profile.data?.contact_email ||
                  session?.user.email ||
                  "Not linked"
                }
              />
              <ProfileDetail
                icon={<MapPin size={18} color={palette.primary} />}
                label="Personal address"
                value={personalAddress.isError ? "Could not load address" : [personalAddress.data?.building, personalAddress.data?.street, personalAddress.data?.locality, personalAddress.data?.city, personalAddress.data?.state, personalAddress.data?.pincode].filter(Boolean).join(", ") || "Not added"}
              />
              <ProfileDetail
                icon={<GraduationCap size={18} color={palette.primary} />}
                label="Qualifications"
                value={
                  profile.data?.qualification ||
                  profile.data?.qualification_claim ||
                  "Not added"
                }
              />
              <ProfileDetail
                icon={<BadgeCheck size={18} color={palette.primary} />}
                label="Registration authority"
                value={
                  profile.data?.registration_authority || "Registration pending"
                }
              />
              <ProfileDetail
                icon={<BadgeCheck size={18} color={palette.primary} />}
                label="Registration No."
                value={profile.data?.registration_number || "—"}
              />
              <ProfileDetail
                icon={<Building size={18} color={palette.primary} />}
                label="Hospital / clinic"
                value={
                  profile.data?.facilities
                    .map((item) => item.facility_name)
                    .join(", ") || "No linked facility"
                }
              />
              <ProfileDetail
                icon={<MapPin size={18} color={palette.primary} />}
                label="Practice address"
                value={
                  profile.data?.facilities
                    .map((item) => item.address)
                    .join("; ") || "Not added"
                }
              />
              <ProfileDetail
                icon={<User size={18} color={palette.primary} />}
                label="About"
                value={profile.data?.bio || "Not added"}
              />
              <View style={styles.details}>
                <Text style={styles.contactLabel}>Languages</Text>
                {profile.data?.languages.length ? (
                  <View style={ui.wrap}>
                    {Array.from(
                      new Set(profile.data.languages.map(doctorLanguageName))
                    ).map((language) => (
                      <Chip key={language} label={language} theme="doctor" />
                    ))}
                  </View>
                ) : (
                  <Text style={styles.contactValue}>
                    No languages added yet.
                  </Text>
                )}
              </View>
              {profile.isError ? (
                <Button
                  theme="doctor"
                  label="Retry profile"
                  variant="outline"
                  loading={profile.isFetching}
                  onPress={() => void profile.refetch()}
                />
              ) : null}
            </View>
          )}
          <Button
            theme="doctor"
            label="Edit profile"
            variant="outline"
            leftIcon={<Pencil size={15} color={palette.primary} />}
            onPress={() => router.push("/edit-profile")}
            style={styles.editButton}
            labelStyle={styles.editLabel}
          />
        </Accordion>
        {rows
          .filter((item) => item.title !== "Edit profile")
          .map(({ title, icon: Icon }) => (
            <Card
              key={title}
              theme="doctor"
              variant="outlined"
              borderWidth={1}
              borderRadius={16}
              padding={0}
              gap={0}
              style={styles.flatCard}
            >
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={title}
                onPress={() =>
                  router.push(
                    title === "Settings" ? "/settings" : title === "Hospital Settings"
                      ? "/hospital-settings"
                      : {
                          pathname: "/profile-option",
                          params: { option: title },
                        }
                  )
                }
                style={({ pressed }) => [
                  styles.actionRow,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.actionIcon}>
                  <Icon size={21} color={palette.primary} />
                </View>
                <Text style={styles.actionTitle}>{title}</Text>
                <ChevronRight
                  size={19}
                  color={palette.primary}
                  style={styles.trailingIcon}
                />
              </Pressable>
            </Card>
          ))}
      </FadedScrollView>
    </View>
  );
}

function ProfileDetail({
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
      <View style={styles.contactCopy}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text selectable style={styles.contactValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.white },
  summary: {
    backgroundColor: palette.primary,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    overflow: "hidden",
  },
  identitySection: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 20 },
  identity: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatarShadow: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: palette.white,
    elevation: 3,
    shadowColor: palette.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 0.25,
    borderColor: palette.border,
    backgroundColor: palette.surface,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  initials: {
    color: palette.primary,
    fontFamily: fontFamilies.bold,
    fontSize: 24,
  },
  photo: { width: "100%", height: "100%" },
  identityCopy: { flex: 1, minWidth: 0, gap: 2 },
  name: {
    marginLeft: 1.5,
    fontFamily: fontFamilies.semibold,
    fontSize: 17,
    lineHeight: 23,
    includeFontPadding: false,
    color: palette.white,
  },
  qualification: { fontFamily: fontFamilies.regular, fontSize: 12, color: "#FFFFFFE6" },
  specialty: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    color: "#FFFFFFE6",
  },
  email: {
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
    color: "#FFFFFFE6",
  },
  content: {
    width: "100%",
    maxWidth: 560,
    alignSelf: "center",
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 14,
  },
  detailsAccordion: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: palette.border,
    backgroundColor: palette.white,
    elevation: 0,
    shadowOpacity: 0,
    boxShadow: "none",
    overflow: "hidden",
  },
  detailsHeader: {
    borderRadius: 16,
    minHeight: 57,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: palette.white,
  },
  detailsBody: { padding: 18 },
  details: { gap: 18 },
  contactRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  contactIcon: { width: 24, paddingTop: 3, alignItems: "center" },
  contactCopy: { flex: 1, gap: 5 },
  contactLabel: {
    color: palette.muted,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 17,
  },
  contactValue: {
    color: palette.text,
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    lineHeight: 22,
  },
  editButton: {
    alignSelf: "flex-end",
    minHeight: 44,
    borderColor: palette.border,
    marginTop: 18,
  },
  editLabel: { fontFamily: fontFamilies.medium, fontSize: 16 },
  flatCard: {
    borderWidth: 1,
    borderColor: palette.border,
    boxShadow: "none",
    elevation: 0,
    shadowOpacity: 0,
    overflow: "hidden",
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
  actionIcon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  accordionTitle: {
    fontFamily: fontFamilies.medium,
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 21,
    color: palette.text,
    includeFontPadding: false,
  },
  actionTitle: {
    flex: 1,
    fontFamily: fontFamilies.medium,
    fontWeight: "500",
    fontSize: 16,
    lineHeight: 21,
    color: palette.text,
  },
  trailingIcon: { transform: [{ translateX: -1 }] },
  pressed: { backgroundColor: "#0C243408" },
});
