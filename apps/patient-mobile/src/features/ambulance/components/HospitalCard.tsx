import type { HospitalCardProps } from "../types/ambulance-booking-form";
import { s } from "./AmbulanceBookingForm.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { memo } from "react";
import { Pressable, View } from "react-native";
import { Check, MapPin } from "lucide-react-native";
import { colors } from "@startup/design-tokens";

export const HospitalCard = memo(function HospitalCard({
  hospital,
  selected,
  onPress,
}: HospitalCardProps) {
  const handlePress = () => onPress(hospital);
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={hospital.name}
      onPress={handlePress}
      style={({ pressed }) => [
        s.hospitalCard,
        selected && s.hospitalSelected,
        pressed && s.pressed,
      ]}
    >
      <View style={s.hospitalPin}>
        <MapPin color={colors.patient.primaryDark} size={20} />
      </View>
      <View style={s.hospitalCopy}>
        <Text variant="cardHeading" numberOfLines={1} style={s.hospitalName}>
          {hospital.name}
        </Text>
        <Text variant="body" numberOfLines={1} style={s.hospitalAddress}>
          {hospital.address}
        </Text>
        <View style={s.metaRow}>
          <MapPin color={colors.patient.primaryDark} size={12} />
          <Text variant="body" style={s.meta}>
            {hospital.distance_meters === null
              ? "Distance unavailable"
              : `${(hospital.distance_meters / 1000).toFixed(1)} km away`}
          </Text>
        </View>
        {"source" in hospital ? (
          <Text variant="body" style={s.googleAttribution}>
            Google Maps
          </Text>
        ) : null}
      </View>
      {selected ? <Check size={18} color={colors.patient.primaryDark} /> : null}
    </Pressable>
  );
});
