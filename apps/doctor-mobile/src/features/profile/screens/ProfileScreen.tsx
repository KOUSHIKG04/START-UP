import { ProfileDetail } from "../components/ProfileDetail";
import { styles } from "../components/ProfileScreen.styles";
import { useDoctorProfile } from "../hooks/useDoctorProfile";
import { rows } from "../utils/profileConstants";

import { StatusBar } from "expo-status-bar";
import { SafeAreaView } from "react-native-safe-area-context";

import { Image, Pressable, Text, View } from "react-native";
import { router } from "expo-router";
import {
  Building,
  ChevronRight,
  User,
  Mail,
  MapPin,
  Phone,
  Pencil,
  GraduationCap,
  BadgeCheck,
} from "lucide-react-native";
import {
  Accordion,
  Button,
  Card,
  Chip,
  FadedScrollView,
  Header,
  Skeleton,
} from "@startup/mobile-ui";
import { doctorLanguageName } from "@startup/contracts";

import { palette, ui } from "../../../components/theme";

export function ProfileScreen() {
  const {
    insets,
    session,
    profile,
    personalAddress,
    profilePhotoUrl,
    name,
    initials,
  } = useDoctorProfile();
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
                      {profile.data?.qualification ||
                      profile.data?.qualification_claim ? (
                        <Text style={styles.qualification}>
                          {" "}
                          {profile.data.qualification ||
                            profile.data.qualification_claim}
                        </Text>
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
                value={
                  personalAddress.isError
                    ? "Could not load address"
                    : [
                        personalAddress.data?.building,
                        personalAddress.data?.street,
                        personalAddress.data?.locality,
                        personalAddress.data?.city,
                        personalAddress.data?.state,
                        personalAddress.data?.pincode,
                      ]
                        .filter(Boolean)
                        .join(", ") || "Not added"
                }
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
                    title === "Settings"
                      ? "/settings"
                      : title === "Hospital Settings"
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
