import { StyleSheet } from "react-native";
export const styles = StyleSheet.create({
  group: { gap: 10, marginTop: 8 },
  heading: { fontSize: 18, fontWeight: "600", marginTop: 12 },
  wrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  vitalRow: { flexDirection: "row", alignItems: "flex-end", gap: 8 },
  vitalInput: { flex: 1 },
  draft: {
    borderWidth: 1,
    borderColor: "#D8E4E8",
    borderRadius: 8,
    padding: 8,
    gap: 6,
  },
  error: { color: "#B42318" },
});
