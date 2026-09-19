import {
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { MapPin, Search, X } from "lucide-react-native";
import { fontFamilies, shadows } from "@startup/design-tokens";

export function LocationFields({
  destination,
  onChange,
  onFocus,
  onCurrentLocationPress,
}: {
  destination: string;
  onChange: (value: string) => void;
  onFocus: () => void;
  onCurrentLocationPress: () => void;
}) {
  return (
    <View style={styles.locations}>
      <Pressable
        onPress={onCurrentLocationPress}
        style={({ pressed }) => [styles.locationCard, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Current location, tap to set pickup on map"
      >
        <View style={styles.pickupDot} />
        <Text style={styles.locationText}>Current Location</Text>
        <MapPin color="#008877" size={19} />
      </Pressable>

      <View style={styles.locationCard}>
        <View style={styles.dropDot} />
        <TextInput
          value={destination}
          onChangeText={onChange}
          onFocus={onFocus}
          placeholder="Search hospital or clinic"
          placeholderTextColor="#71818F"
          style={styles.destinationInput}
        />
        {destination ? (
          <Pressable hitSlop={10} onPress={() => onChange("")}>
            <X color="#71818F" size={18} />
          </Pressable>
        ) : (
          <Search color="#71818F" size={18} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  locations: {
    paddingHorizontal: 16,
    marginTop: -25,
    zIndex: 2,
    position: "relative",
    gap: 12,
  },
  locationCard: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    gap: 15,
    paddingHorizontal: 19,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  pickupDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#008877",
  },
  dropDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5C5C",
  },
  locationText: {
    flex: 1,
    color: "#0C2434",
    fontFamily: fontFamilies.medium,
    fontSize: 16,
  },
  destinationInput: {
    flex: 1,
    padding: 0,
    color: "#0C2434",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
  },
});
