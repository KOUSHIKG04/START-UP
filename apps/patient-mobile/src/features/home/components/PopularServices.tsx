import { StyleSheet, View } from "react-native";
import {
  Accessibility,
  Heart,
  Hospital,
  Pill,
  type LucideIcon,
} from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { IconLabel } from "@startup/mobile-ui";
import SectionHeader from "@/components/SectionHeader";
import { router } from "expo-router";

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
  onSeeAllPress = () => router.push("/appointments"),
  onServicePress,
}: PopularServicesProps) {
  return (
    <View style={styles.section}>
      <SectionHeader
        title="Popular Services"
        seeAllText="View all"
        onSeeAllPress={onSeeAllPress}
      />

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
            iconContainerStyle={styles.serviceIconContainer}
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
  serviceIconContainer: {
    elevation: 0,
    shadowOpacity: 0,
  },
  serviceLabel: {
    color: colors.patient.text,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
    lineHeight: 14,
  },
});
