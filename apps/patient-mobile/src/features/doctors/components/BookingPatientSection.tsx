import type { Props } from "../types/booking-patient-section";
export type { Props } from "../types/booking-patient-section";
import { AppText as Text } from "@startup/mobile-ui";
import { View } from "react-native";
import { Chip, FadedScrollView } from "@startup/mobile-ui";

import { styles } from "./BookSlots.styles";

export function BookingPatientSection({
  patientId,
  setPatientId,
  patientOptions,
}: Props) {
  return (
    <View style={styles.bookingSection}>
      <Text variant="sectionHeading" style={styles.sectionTitle}>
        For whom?
      </Text>
      <FadedScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.patientRow}
      >
        {patientOptions.map((option) => (
          <Chip
            key={option.id}
            variant="radio"
            selected={patientId === option.id}
            theme="patient"
            label={option.label}
            onPress={() => {
              if (option.verified) setPatientId(option.id);
            }}
          />
        ))}
      </FadedScrollView>
    </View>
  );
}
