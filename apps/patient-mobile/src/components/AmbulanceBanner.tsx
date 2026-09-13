import {
  Image,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { Button, StatusBadge } from "@startup/mobile-ui";

export type AmbulanceBannerProps = {
  onBookPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function AmbulanceBanner({
  onBookPress,
  style,
}: AmbulanceBannerProps) {
  return (
    <View style={[styles.banner, style]}>
      <View style={styles.content}>
        <StatusBadge
          status="Emergency Service"
          dotColor="#EF4444"
          backgroundColor="transparent"
          style={styles.emergencyBadge}
          textStyle={styles.emergencyText}
        />

        <Text style={styles.title}>Book Ambulance Now</Text>
        <Text numberOfLines={1} style={styles.description}>
          Real-time tracking • Nearest driver
        </Text>

        <Button
          label="Book Now"
          theme="patient"
          onPress={onBookPress}
          style={styles.button}
          labelStyle={styles.buttonLabel}
        />
      </View>

      <View style={styles.imageCard}>
        <Image
          accessibilityIgnoresInvertColors
          resizeMode="cover"
          source={require("../../assets/images/ambulance.png")}
          style={styles.image}
        />
      </View>
    </View>
  );
}

export default AmbulanceBanner;

const styles = StyleSheet.create({
  banner: {
    width: "98%",
    minHeight: 145,
    flexDirection: "row",
    alignItems: "center",
    padding:20,
    borderRadius: 16,
    backgroundColor: "#E6F7F6",
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  content: {
    minWidth: 0,
    flex: 1,
    alignItems: "flex-start",
  },
  emergencyBadge: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    marginLeft: 20,
    marginBottom: 6,
  },
  emergencyText: {
    color: "#EF4444",
    fontFamily: fontFamilies.semibold,
    fontSize: 12,
    lineHeight: 15,
  },
  title: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 20,
  },
  description: {
    marginTop: 1,
    color: "#6B7280",
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    fontWeight: "400",
    lineHeight: 13,
  },
  button: {
    width: 166,
    minHeight: 36,
    marginTop: 12,
    paddingVertical: 0,
    borderRadius: 12,
    backgroundColor: colors.patient.primaryDark,
  },
  buttonLabel: {
    fontFamily: fontFamilies.semibold,
    fontSize: 13,
    lineHeight: 16,
  },
  imageCard: {
    width: 134,
    height: 96,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
    borderRadius: 12,
  },
  image: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
 
});
