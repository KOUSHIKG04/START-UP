import { Pressable, StyleSheet, Text, View } from "react-native";
import { Activity, HeartPulse, Siren } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import type { AmbulanceType } from "../../utils/ambulanceConstants";

export function getAmbulanceIcon(id: AmbulanceType["id"]) {
  switch (id) {
    case "basic":
      return <Siren color="#008877" size={26} />;
    case "advanced":
      return <HeartPulse color="#008877" size={26} />;
    case "icu":
      return <Activity color="#008877" size={26} />;
    default:
      return <Siren color="#008877" size={26} />;
  }
}

export function AmbulanceOption({
  item,
  selected,
  onPress,
}: {
  item: AmbulanceType;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.ambulanceOption,
        selected && styles.ambulanceSelected,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.ambulanceIcon,
          selected && styles.ambulanceIconSelected,
        ]}
      >
        {getAmbulanceIcon(item.id)}
      </View>
      <View style={styles.ambulanceCopy}>
        <Text style={styles.ambulanceName}>{item.title}</Text>
        <Text numberOfLines={1} style={styles.ambulanceDescription}>
          {item.description.replace("and", "&")}
        </Text>
      </View>
      <View style={styles.priceBlock}>
        <Text style={[styles.price, selected && styles.selectedPrice]}>
          ₹{item.fare}
        </Text>
        <Text style={styles.eta}>ETA {item.eta}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  ambulanceOption: {
    height: 85,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  ambulanceSelected: {
    borderColor: "#E8F5F4",
    backgroundColor: "#E8F5F4",
  },
  ambulanceIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 10,
    backgroundColor: "#F0F9F8",
  },
  ambulanceIconSelected: { backgroundColor: "#C8EAE7" },
  ambulanceCopy: { flex: 1, minWidth: 0, gap: 3 },
  ambulanceName: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  ambulanceDescription: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  priceBlock: { alignItems: "flex-end", gap: 4 },
  price: { color: "#0C2434", fontFamily: fontFamilies.bold, fontSize: 15 },
  selectedPrice: { color: "#087F78" },
  eta: { color: "#71818F", fontFamily: fontFamilies.regular, fontSize: 10 },
});
