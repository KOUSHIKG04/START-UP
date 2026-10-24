import { styles } from "./BookingStatus.styles";

import { AppText as Text } from "@startup/mobile-ui";
import { useState } from "react";
import { View } from "react-native";
import { Clock3, CreditCard } from "lucide-react-native";
import { colors, radius } from "@startup/design-tokens";
import { Button, Card } from "@startup/mobile-ui";

export function PaymentOptions() {
  const [payment, setPayment] = useState<"now" | "later">("later");

  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      gap={10}
      padding={14}
      style={styles.cardSurface}
    >
      <Text variant="cardHeading" style={styles.paymentTitle}>
        Payment
      </Text>
      <View style={styles.paymentRow}>
        <Button
          label="Pay Now"
          theme="patient"
          leftIcon={
            <CreditCard
              color={
                payment === "now" ? colors.white : colors.patient.primaryDark
              }
              size={16}
            />
          }
          onPress={() => setPayment("now")}
          variant={payment === "now" ? "primary" : "outline"}
          style={styles.paymentButton}
          labelStyle={styles.paymentLabel}
        />
        <Button
          label="Pay Later"
          theme="patient"
          leftIcon={
            <Clock3
              color={
                payment === "later" ? colors.white : colors.patient.primaryDark
              }
              size={16}
            />
          }
          onPress={() => setPayment("later")}
          variant={payment === "later" ? "primary" : "outline"}
          style={styles.paymentButton}
          labelStyle={styles.paymentLabel}
        />
      </View>
    </Card>
  );
}
