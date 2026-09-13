import { StyleSheet, Text, View } from "react-native";
import {
  Accessibility,
  ChevronRight,
  Heart,
  Hospital,
  Pill,
  type LucideIcon,
} from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { IconLabel } from "@startup/mobile-ui";

export type PopularService = {
  key: string;
  label: string;
  icon: LucideIcon;
  iconColor: string;
  backgroundColor: string;
};

export type PopularServicesProps = {
  services?: readonly PopularService[];
  onSeeAllPress?: () => void;
  onServicePress?: (service: PopularService) => void;
};

const defaultServices: readonly PopularService[] = [
  {
    key: "hospital",
    label: "Hospital & Beds",
    icon: Hospital,
    iconColor: "#F04F5F",
    backgroundColor: "#FFE3E5",
  },
  {
    key: "medicines",
    label: "Medicines",
    icon: Pill,
    iconColor: "#F044A1",
    backgroundColor: "#FBE1F1",
  },
  {
    key: "equipment",
    label: "Rental equipment",
    icon: Accessibility,
    iconColor: "#F59E0B",
    backgroundColor: "#FFF0BC",
  },
  {
    key: "insurance",
    label: "Insurance",
    icon: Heart,
    iconColor: "#7C3AED",
    backgroundColor: "#ECE5FF",
  },
] as const;

export default function PopularServices({
  services = defaultServices,
  onSeeAllPress,
  onServicePress,
}: PopularServicesProps) {
  return (
    <View style={styles.section}>
      <View style={styles.headingRow}>
        <Text style={styles.title}>Popular Services</Text>

        <IconLabel
          accessibilityLabel="See all popular services"
          backgroundColor="transparent"
          gap={0}
          icon={({ color, size }) => (
            <ChevronRight color={color} size={size} strokeWidth={2.2} />
          )}
          iconColor={colors.patient.primaryDark}
          iconContainerStyle={styles.seeAllIcon}
          iconSize={17}
          label="See all"
          labelNumberOfLines={1}
          labelStyle={styles.seeAllLabel}
          labelWidth={42}
          onPress={onSeeAllPress}
          style={styles.seeAll}
          surfaceRadius={0}
          surfaceSize={20}
        />
      </View>

      <View style={styles.servicesRow}>
        {services.map((service) => (
          <IconLabel
            key={service.key}
            accessibilityLabel={service.label}
            backgroundColor={service.backgroundColor}
            gap={8}
            icon={({ size }) => {
              const ServiceIcon = service.icon;
              return (
                <ServiceIcon
                  color={service.iconColor}
                  size={size}
                  strokeWidth={2}
                />
              );
            }}
            iconSize={24}
            label={service.label}
            labelNumberOfLines={2}
            labelStyle={styles.serviceLabel}
            labelWidth={68}
            onPress={() => onServicePress?.(service)}
            style={styles.serviceCard}
            surfaceRadius={16}
            surfaceSize={52}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 10,
    marginTop: 4,
  },
  headingRow: {
    minHeight: 24,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 16,
    lineHeight: 22,
  },
  seeAll: {
    flexDirection: "row-reverse",
    alignItems: "center",
  },
  seeAllIcon: {
    borderWidth: 0,
    elevation: 0,
    shadowOpacity: 0,
  },
  seeAllLabel: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    lineHeight: 18,
    textAlign: "right",
  },
  servicesRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-around",
    gap: 8,
  },
  serviceCard: {
    minWidth: 0,
    flex: 1,
  },
  serviceLabel: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
});
