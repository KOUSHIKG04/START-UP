import { Button } from "@startup/mobile-ui";
import { useCallback } from "react";
import { setStatusBarStyle } from "expo-status-bar";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { Plus, UserRound, Users } from "lucide-react-native";
import { listMyFamilyProfiles } from "@startup/data-access";
import { colors, fontFamilies } from "@startup/design-tokens";
import {
  onboardingButtonStyles,
  OnboardingShell,
} from "../components/OnboardingShell";
import { supabase, useMobileSession } from "../../../services/supabase";

export default function AddFamilyScreen() {
  useFocusEffect(useCallback(() => {
    setStatusBarStyle("dark");
    return () => setStatusBarStyle("light");
  }, []));
  const { profile } = useMobileSession();

  const familyQuery = useQuery({
    queryKey: ["my-family-profiles", profile?.patient_id],
    queryFn: () => listMyFamilyProfiles(supabase!),
    enabled: Boolean(supabase && profile?.patient_id),
  });

  const familyMembers = familyQuery.data ?? [];

  return (
    <OnboardingShell
      onBack={() => router.replace("/(app)/(tabs)")}
      bottomArt={false}
      scroll
    >
      <View style={styles.body}>
        <View style={styles.topSection}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Text style={styles.title}>Add Family Members</Text>
              <View style={styles.iconWrap}>
                <Users
                  size={24}
                  color={colors.patient.primaryDark}
                  strokeWidth={2.2}
                />
              </View>
            </View>
          </View>

          {familyMembers.length > 0 ? (
            <View style={styles.membersList}>
              {familyMembers.map((member) => (
                <View key={member.id} style={styles.memberCard}>
                  <View style={styles.memberAvatar}>
                    <UserRound size={18} color={colors.white} strokeWidth={2} />
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{member.full_name}</Text>
                    <Text style={styles.memberMeta}>
                      {member.relation}
                      {member.age_years !== null
                        ? ` · ${member.age_years} yrs`
                        : ""}
                      {member.blood_group ? ` · ${member.blood_group}` : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add Family Member"
            onPress={() => router.push("/(app)/add-family-member")}
            style={({ pressed }) => [styles.addCard, pressed && styles.pressed]}
          >
            <UserRound
              size={22}
              color={colors.patient.primaryDark}
              strokeWidth={1.8}
            />
            <Text style={styles.addText}>Add Family Member</Text>
            <Plus
              size={22}
              color={colors.patient.primaryDark}
              strokeWidth={2}
            />
          </Pressable>
        </View>

        <View style={styles.bottomSection}>
          <Button
            theme="patient"
            style={onboardingButtonStyles.button}
            labelStyle={onboardingButtonStyles.label}
            rightIcon={<Text style={onboardingButtonStyles.label}>›</Text>}
            label={familyMembers.length > 0 ? "Continue" : "Skip and Continue"}
            onPress={() => router.replace("/(app)/(tabs)")}
          />
        </View>
      </View>
    </OnboardingShell>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    width: "100%",
    maxWidth: 340,
    alignSelf: "center",
    paddingTop: 36,
    paddingBottom: 24,
    justifyContent: "space-between",
    minHeight: 520,
  },
  topSection: {
    width: "100%",
  },
  header: {
    alignItems: "center",
    marginBottom: 36,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontFamily: fontFamilies.regular,
    fontSize: 22,
    color: colors.black,
    textAlign: "center",
  },
  iconWrap: {
    justifyContent: "center",
    alignItems: "center",
  },
  membersList: {
    gap: 12,
    marginBottom: 16,
  },
  memberCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.12)",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  memberAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.patient.primaryDark,
    alignItems: "center",
    justifyContent: "center",
  },
  memberInfo: {
    flex: 1,
    gap: 2,
  },
  memberName: {
    fontFamily: fontFamilies.medium,
    fontSize: 15,
    color: colors.black,
  },
  memberMeta: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    color: "#777",
  },
  addCard: {
    width: "100%",
    height: 54,
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.19)",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
  },
  addText: {
    fontFamily: fontFamilies.regular,
    fontSize: 17,
    color: "rgba(0, 0, 0, 0.5)",
    textAlign: "center",
    flex: 1,
  },
  pressed: {
    opacity: 0.75,
    backgroundColor: "#F9FBFB",
  },
  bottomSection: {
    width: "100%",
    marginTop: 40,
    marginBottom: 12,
  },
});
