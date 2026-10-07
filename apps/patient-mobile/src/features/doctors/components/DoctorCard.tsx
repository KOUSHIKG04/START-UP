import { useRef, type ReactNode } from "react";
import {
  type GestureResponderEvent,
  type StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from "react-native";
import { Briefcase, UserRound } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Card } from "@startup/mobile-ui";

export type DoctorCardProps = {
  name: string;
  qualification: string;
  specialty: string;
  experience: string;
  rating?: string;
  showRating?: boolean;
  fee?: string;
  distanceMeters?: number | null;
  hideFee?: boolean;
  hideExperience?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
  contextLabel?: string;
  variant?: "default" | "profile" | "detail";
  style?: StyleProp<ViewStyle>;
};

function splitQualification(q: string): {
  degree: string;
  department: string | null;
} {
  const match = q.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
  if (match) {
    return { degree: match[1].trim(), department: match[2].trim() };
  }
  return { degree: q.trim(), department: null };
}

export default function DoctorCard({
  name,
  qualification,
  specialty,
  experience,
  rating,
  showRating = false,
  fee = "",
  distanceMeters,
  hideFee = false,
  hideExperience = false,
  onPress,
  contextLabel,
  variant = "default",
  style,
}: DoctorCardProps) {
  const { degree, department } = splitQualification(qualification);

  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const isDragOrScroll = useRef(false);

  const handleTouchStart = (e: GestureResponderEvent) => {
    touchStartPos.current = {
      x: e.nativeEvent.pageX,
      y: e.nativeEvent.pageY,
    };
    isDragOrScroll.current = false;
  };

  const handleTouchMove = (e: GestureResponderEvent) => {
    if (!touchStartPos.current) return;
    const dx = Math.abs(e.nativeEvent.pageX - touchStartPos.current.x);
    const dy = Math.abs(e.nativeEvent.pageY - touchStartPos.current.y);
    if (dx > 7 || dy > 7) {
      isDragOrScroll.current = true;
    }
  };

  const handlePress = () => {
    if (isDragOrScroll.current) return;
    onPress?.();
  };

  if (variant === "profile") {
    return (
      <Card
        accessibilityLabel={`${name}, ${specialty}${hideFee || !fee ? "" : `, consultation fee ${fee}`}`}
        variant="outlined"
        backgroundColor="#E6F4F3"
        // borderColor="#E0E5EB"
        borderRadius={radius.md}
        // borderWidth={1}
        gap={13}
        onPress={onPress ? handlePress : undefined}
        onTouchStart={onPress ? handleTouchStart : undefined}
        onTouchMove={onPress ? handleTouchMove : undefined}
        pressRetentionOffset={8}
        padding={16}
        style={[styles.flatCard, style]}
      >
        <View style={styles.headerRow}>
          <View style={styles.avatarSquare}>
            <UserRound color={colors.white} size={25} strokeWidth={2} />
          </View>

          <View style={styles.doctorInfo}>
            <View style={styles.nameRow}>
              <Text numberOfLines={1} style={styles.profileName}>
                {name}
              </Text>
              {contextLabel ? (
                <View style={styles.contextBadge}>
                  <Text style={styles.contextBadgeText}>{contextLabel}</Text>
                </View>
              ) : null}
            </View>

            {degree ? <Text numberOfLines={1} style={styles.secondaryText}>{degree}</Text> : null}

            <Text numberOfLines={1} style={styles.specialtyText}>
              {specialty}
            </Text>
          </View>
        </View>

        {(!hideExperience && experience) || (showRating && rating) ? <View style={styles.profileGrid}>
          {!hideExperience && experience ? (
            <MetricCell
              icon={
                <Briefcase
                  color={colors.patient.primaryDark}
                  size={14}
                  strokeWidth={2}
                />
              }
              label="Experience"
              value={experience}
            />
          ) : null}
          {showRating && rating ? <MetricCell icon={<StarIcon />} label="Rating" value={rating} /> : null}
        </View> : null}
      </Card>
    );
  }

  return (
    <Card
      accessibilityLabel={`${name}, ${specialty}${showRating && rating ? `, rating ${rating}` : ""}${hideFee || !fee ? "" : `, consultation fee ${fee}`}${distanceMeters == null ? "" : `, ${(distanceMeters / 1000).toFixed(1)} km away`}`}
      variant="outlined"
      backgroundColor="#E6F4F3"
      borderColor="#E0E5EB"
      borderRadius={radius.lg}
      borderWidth={1}
      gap={10}
      onPress={onPress ? handlePress : undefined}
      onTouchStart={onPress ? handleTouchStart : undefined}
      onTouchMove={onPress ? handleTouchMove : undefined}
      pressRetentionOffset={8}
      padding={14}
      style={[styles.flatCard, style]}
    >
      <View style={[styles.headerRow, variant === "detail" && styles.detailHeaderRow]}>
        <View style={[styles.avatarSquare, variant === "detail" && styles.detailAvatar]}>
          <UserRound color={colors.white} size={26} strokeWidth={1.8} />
        </View>

        <View style={[styles.doctorInfo, variant === "detail" && styles.detailDoctorInfo]}>
          <Text numberOfLines={1} style={styles.nameLine}>
            <Text style={styles.nameText}>{name}</Text>
            {degree ? (
              <Text style={styles.degreeText}>{`  ${degree}`}</Text>
            ) : null}
          </Text>

          {department ? <Text numberOfLines={1} style={styles.departmentText}>{department}</Text> : null}

          <View style={styles.specialtyRatingRow}>
            <Text numberOfLines={1} style={[styles.specialtyText, styles.specialtyInRow]}>{specialty}</Text>
            {showRating && rating ? <Text numberOfLines={1} style={styles.ratingText}>{rating}</Text> : null}
          </View>
          {contextLabel || distanceMeters != null ? <View style={styles.contextDistanceRow}>
            {contextLabel ? <Text style={styles.contextInline}>{contextLabel}</Text> : null}
            {distanceMeters != null ? <Text style={styles.distanceText}>{(distanceMeters / 1000).toFixed(1)} km away</Text> : null}
          </View> : null}
        </View>
      </View>

      {(!hideExperience && experience) || (!hideFee && fee) ? (
        <View style={styles.pillRow}>
          {!hideExperience && experience ? (
            <Pill balanced={Boolean(fee && !hideFee)}>
              <Text style={styles.pillText}>{experience}</Text>
            </Pill>
          ) : null}
          {!hideFee && fee ? (
            <Pill balanced={Boolean(experience && !hideExperience)}>
              <Text style={styles.pillText}>{`Consultation Fee ${fee}`}</Text>
            </Pill>
          ) : null}
        </View>
      ) : null}
    </Card>
  );
}

function Pill({ children, balanced }: { children: ReactNode; balanced: boolean }) {
  return <View style={[styles.pill, balanced && styles.balancedPill]}>{children}</View>;
}

function StarIcon() {
  return (
    <View style={styles.starWrap}>
      <Text style={styles.starEmoji}>★</Text>
    </View>
  );
}

function MetricCell({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.profileCell}>
      <View style={styles.profileIconSurface}>{icon}</View>
      <View style={styles.profileCellText}>
        <Text style={styles.profileCellLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.profileCellValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flatCard: {
    boxShadow: "none",
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  detailHeaderRow: { alignItems: "center" },
  detailAvatar: { marginTop: 0 },
  detailDoctorInfo: { minHeight: 55, justifyContent: "center", paddingTop: 0 },
  avatarSquare: {
    width: 55,
    height: 55,
    borderRadius: "50%",
    backgroundColor: colors.patient.accent,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 4,
  },
  doctorInfo: {
    flex: 1,
    minWidth: 0,
    gap: 2,
    paddingTop: 2,
  },
  nameLine: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  nameText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  degreeText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    fontWeight: "400",
    lineHeight: 20,
  },
  departmentText: {
    color: "#677e87",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
    lineHeight: 16,
  },
  specialtyRatingRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  specialtyInRow: { flexShrink: 1, minWidth: 0 },
  ratingText: {
    color: "#677e87",
    fontFamily: fontFamilies.medium,
    fontSize: 11,
    lineHeight: 16,
    flexShrink: 0,
  },
  specialtyText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 17,
  },
  distanceText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.medium,
    fontSize: 12,
    lineHeight: 16,
  },
  contextDistanceRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 8 },
  contextInline: {
    color: colors.patient.accent,
    fontFamily: fontFamilies.regular,
    fontSize: 10,
  },
  profileName: {
    flex: 1,
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 21,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  secondaryText: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 15,
  },
  pillRow: {
    flexDirection: "row",
    gap: 8,
    paddingTop: 2,
    alignItems: "stretch",
  },
  pill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#d9efee",
    backgroundColor: "#d9efee",
  },
  balancedPill: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  pillText: {
    color: colors.patient.primary,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    fontWeight: "500",
    lineHeight: 16,
    flexShrink: 1,
    textAlign: "center",
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
    fontSize: 9,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  profileCellValue: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 12,
    fontWeight: "700",
  },
  starWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  starEmoji: {
    color: colors.patient.primaryDark,
    fontSize: 13,
    lineHeight: 14,
  },
});
