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
};

export default function DoctorCard({
  name,
  qualification,
  specialty,
  experience,
  rating,
  fee,
  onPress,
}: DoctorCardProps) {
  return (
    <Card
      accessibilityLabel={`${name}, ${specialty}, consultation fee ${fee}`}
      backgroundColor="#EFF9F8"
      borderColor="#D9EFED"
      borderRadius={radius.lg}
      borderWidth={1}
      gap={12}
      onPress={onPress}
      padding={14}
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
        </CardContent>

        <CardAction style={styles.feeSection}>
          <Text style={styles.feeLabel}>Consultation</Text>
          <Text numberOfLines={1} style={styles.fee}>
            {fee}
          </Text>
          <View style={styles.chevron}>
            <ChevronRight color={colors.white} size={17} strokeWidth={2.4} />
          </View>
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
});
