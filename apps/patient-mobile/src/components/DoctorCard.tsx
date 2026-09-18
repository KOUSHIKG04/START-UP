import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import {
  Briefcase,
  ChevronRight,
  Star,
  UserRound,
} from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import {
  Card,
  CardAction,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@startup/mobile-ui";

export type DoctorCardProps = {
  name: string;
  qualification: string;
  specialty: string;
  experience: string;
  rating: string;
  fee: string;
  onPress?: () => void;
  showChevron?: boolean;
  contextLabel?: string;
  variant?: "default" | "profile";
};

export default function DoctorCard({
  name,
  qualification,
  specialty,
  experience,
  rating,
  fee,
  onPress,
  showChevron = Boolean(onPress),
  contextLabel,
  variant = "default",
}: DoctorCardProps) {
  if (variant === "profile") {
    return (
      <Card
        accessibilityLabel={`${name}, ${specialty}, consultation fee ${fee}`}
        variant="outlined"
        backgroundColor="#EFF9F8"
        borderColor="#E0E5EB"
        borderRadius={radius.md}
        borderWidth={1}
        gap={13}
        onPress={onPress}
        padding={16}
        style={styles.profileCard}
      >
        <View style={styles.doctorHeaderRow}>
          <View style={styles.profileAvatar}>
            <UserRound color={colors.white} size={25} strokeWidth={2} />
          </View>

          <View style={styles.doctorInfo}>
            <View style={styles.doctorNameRow}>
              <Text numberOfLines={1} style={styles.doctorName}>
                {name}
              </Text>
              {contextLabel ? (
                <View style={styles.contextBadge}>
                  <Text numberOfLines={1} style={styles.contextBadgeText}>
                    {contextLabel}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text numberOfLines={1} style={styles.doctorQualification}>
              {qualification}
              {specialty ? ` • ${specialty}` : ""}
            </Text>
          </View>
        </View>

        <View style={styles.profileGrid}>
          <View style={styles.profileCell}>
            <View style={styles.profileIconSurface}>
              <Briefcase color={colors.patient.primaryDark} size={15} strokeWidth={2} />
            </View>
            <View style={styles.profileCellText}>
              <Text style={styles.profileCellLabel}>Experience</Text>
              <Text numberOfLines={1} style={styles.profileCellValue}>
                {experience}
              </Text>
            </View>
          </View>

          <View style={styles.profileCell}>
            <View style={styles.profileIconSurface}>
              <Star color={colors.patient.primaryDark} size={15} fill={colors.patient.primaryDark} strokeWidth={1.5} />
            </View>
            <View style={styles.profileCellText}>
              <Text style={styles.profileCellLabel}>Rating</Text>
              <Text numberOfLines={1} style={styles.profileCellValue}>
                {rating}
              </Text>
            </View>
          </View>
        </View>
      </Card>
    );
  }

  return (
    <Card
      accessibilityLabel={`${name}, ${specialty}, consultation fee ${fee}`}
      variant="outlined"
      backgroundColor="#EFF9F8"
      borderColor="#E0E5EB"
      borderRadius={radius.lg}
      borderWidth={1}
      gap={12}
      onPress={onPress}
      padding={14}
      style={styles.flatCard}
    >
      <CardHeader gap={11}>
        <View style={styles.avatar}>
          <UserRound color={colors.white} size={27} strokeWidth={1.8} />
        </View>

        <CardContent gap={2} style={styles.identity}>
          <CardTitle numberOfLines={1} style={styles.name}>
            {name}
          </CardTitle>
          <Text numberOfLines={2} style={styles.qualification}>
            {qualification}
          </Text>
          <Text numberOfLines={1} style={styles.specialty}>
            {specialty}
          </Text>
          {contextLabel ? (
            <Text numberOfLines={1} style={styles.contextLabel}>
              ({contextLabel})
            </Text>
          ) : null}
        </CardContent>

        <CardAction style={styles.feeSection}>
          <Text style={styles.feeLabel}>Consultation</Text>
          <Text numberOfLines={1} style={styles.fee}>
            {fee}
          </Text>
          {showChevron ? (
            <View style={styles.chevron}>
              <ChevronRight color={colors.white} size={17} strokeWidth={2.4} />
            </View>
          ) : null}
        </CardAction>
      </CardHeader>

      <CardFooter gap={8} style={styles.metaRow}>
        <DoctorMeta
          icon={<Briefcase color={colors.patient.primaryDark} size={16} />}
          label={experience}
        />
        <DoctorMeta
          icon={<Star color={colors.patient.primaryDark} size={16} />}
          label={rating}
        />
      </CardFooter>
    </Card>
  );
}

type DoctorMetaProps = {
  icon: ReactNode;
  label: string;
};

function DoctorMeta({ icon, label }: DoctorMetaProps) {
  return (
    <View style={styles.meta}>
      {icon}
      <Text numberOfLines={1} style={styles.metaLabel}>
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    width: 56,
    height: 56,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 28,
    backgroundColor: colors.patient.accent,
  },
  identity: {
    flex: 1,
    minWidth: 0,
  },
  name: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 19,
  },
  qualification: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
  specialty: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    fontWeight: "500",
    lineHeight: 14,
  },
  contextLabel: {
    color: colors.patient.accent,
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
    fontWeight: "600",
    lineHeight: 13,
  },
  feeSection: {
    width: 78,
    minHeight: 60,
    alignItems: "flex-start",
    justifyContent: "center",
    paddingLeft: 10,
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: colors.patient.surfaceBorder,
  },
  feeLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 9,
    lineHeight: 12,
  },
  fee: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 20,
  },
  chevron: {
    width: 25,
    height: 25,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
    borderRadius: 13,
    backgroundColor: colors.patient.accent,
  },
  metaRow: {
    paddingLeft: 67,
  },
  meta: {
    minWidth: 0,
    flexShrink: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: radius.md,
    backgroundColor: "#DFF3F1",
  },
  metaLabel: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    fontWeight: "500",
    lineHeight: 13,
  },
  flatCard: {
    elevation: 0,
    shadowOpacity: 0,
  },
  profileCard: {
    elevation: 0,
    shadowOpacity: 0,
  },
  doctorHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  profileAvatar: {
    width: 50,
    height: 50,
    borderRadius: 14,
    backgroundColor: colors.patient.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  doctorInfo: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  doctorNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  doctorName: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 21,
  },
  contextBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: "#C8E8E7",
  },
  contextBadgeText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 10,
    fontWeight: "600",
  },
  doctorQualification: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  profileGrid: {
    flexDirection: "row",
    gap: 10,
  },
  profileCell: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: colors.white,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "#E2EEEC",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  profileIconSurface: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.patient.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  profileCellText: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  profileCellLabel: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 10,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  profileCellValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    fontWeight: "700",
  },
});
