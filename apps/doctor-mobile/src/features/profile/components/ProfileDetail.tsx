import type { ProfileDetailProps } from "../types/profile-detail";
import { styles } from "./ProfileScreen.styles";

import { Text, View } from "react-native";

export function ProfileDetail({ icon, label, value }: ProfileDetailProps) {
  return (
    <View style={styles.contactRow}>
      <View style={styles.contactIcon}>{icon}</View>
      <View style={styles.contactCopy}>
        <Text style={styles.contactLabel}>{label}</Text>
        <Text selectable style={styles.contactValue}>
          {value}
        </Text>
      </View>
    </View>
  );
}
