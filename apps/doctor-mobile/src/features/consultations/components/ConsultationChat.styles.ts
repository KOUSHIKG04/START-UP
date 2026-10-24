import { StyleSheet } from "react-native";
import { ui } from "../../../components/theme";

export const styles = StyleSheet.create({
  listContent: {
    padding: 16,
    gap: 16,
    flexGrow: 1,
  },
  headerLabel: {
    textAlign: "center",
    fontSize: 11,
    marginBottom: 8,
  },
  messageContainer: {
    maxWidth: "82%",
    padding: 12,
    borderRadius: 12,
    gap: 4,
  },
  sentContainer: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
    borderBottomLeftRadius: 12,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E5EFF0",
  },
  receivedContainer: {
    alignSelf: "flex-start",
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 4,
    backgroundColor: "#EAF8F7",
    borderWidth: 0,
  },
  messageText: {
    color: "#173B4A",
  },
  metaRow: {
    ...ui.row,
    justifyContent: "flex-end",
    gap: 3,
  },
  metaTime: {
    fontSize: 10,
  },
});
