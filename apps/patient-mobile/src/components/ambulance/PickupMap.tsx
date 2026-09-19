import {
  Image,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Search } from "lucide-react-native";
import { fontFamilies, shadows } from "@startup/design-tokens";
import { pickupMapImage } from "../../utils/ambulanceConstants";
import { ActionButton } from "./ActionButton";

export function PickupMap({
  destination,
  onConfirm,
}: {
  destination: string;
  onConfirm: () => void;
}) {
  return (
    <View style={styles.flex1}>
      <View style={styles.pickupMapFrame}>
        <Image
          source={pickupMapImage}
          resizeMode="stretch"
          style={styles.pickupMapImage}
        />
      </View>
      <View style={styles.pickupPanel}>
        <Text style={styles.pickupTitle}>Confirm your pickup</Text>
        <View style={styles.pickupSearch}>
          <Text numberOfLines={1} style={styles.pickupPlaceholder}>
            {destination || "Search hospital or clinic"}
          </Text>
          <Search color="#71818F" size={18} />
        </View>
        <TextInput
          placeholder="Add Building , gate /Floor (Optional)"
          placeholderTextColor="#71818F"
          style={styles.buildingInput}
        />
        <ActionButton
          label="Confirm Your Pick up"
          onPress={onConfirm}
          style={styles.confirmButton}
        />
        <Text style={styles.mapCaption}>
          Map shown for illustration; GPS permission required.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  pickupMapFrame: { width: "100%", height: 474, overflow: "hidden" },
  pickupMapImage: {
    position: "absolute",
    top: "-8%",
    left: 0,
    width: "100%",
    height: "159%",
  },
  pickupPanel: {
    flex: 1,
    minHeight: 310,
    marginTop: 8,
    paddingHorizontal: 20,
    paddingTop: 28,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: "#E8F8F4",
  },
  pickupTitle: {
    marginLeft: 7,
    marginBottom: 16,
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 18,
  },
  pickupSearch: {
    height: 60,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 21,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    ...shadows.card,
  },
  pickupPlaceholder: {
    flex: 1,
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
  },
  buildingInput: {
    height: 54,
    marginTop: 8,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    color: "#0C2434",
    fontFamily: fontFamilies.regular,
    fontSize: 16,
    ...shadows.card,
  },
  confirmButton: { marginTop: 18 },
  mapCaption: {
    marginTop: 13,
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 10,
    textAlign: "center",
  },
});
