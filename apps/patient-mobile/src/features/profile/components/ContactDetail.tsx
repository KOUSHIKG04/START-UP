import type { ContactDetailProps } from "../types/profile";
import { styles } from "./ProfileScreen.styles";

import { AppText as Text } from "@startup/mobile-ui";

import { View } from "react-native";

export function ContactDetail({ icon, label, value }: ContactDetailProps) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>{icon}</View>
      <View style={styles.copyCol}>
        <Text variant="label" style={styles.contactLabel}>
          {label}
        </Text>
        <Text variant="body" style={styles.contactValue} selectable>
          {value}
        </Text>
      </View>
    </View>
  );
}
