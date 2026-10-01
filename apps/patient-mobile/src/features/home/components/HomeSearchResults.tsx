import { Pressable, StyleSheet, Text, View } from "react-native";
import { Search } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

interface SearchResultItem {
  title: string;
  type: string;
}

export function HomeSearchResults({
  liveResults,
  searchQuery,
  onSelectItem,
}: {
  liveResults: SearchResultItem[];
  searchQuery: string;
  onSelectItem: (item: string) => void;
}) {
  return (
    <View style={styles.liveResultsContainer}>
      {liveResults.length > 0 ? (
        liveResults.map((item) => (
          <Pressable
            key={item.title}
            accessibilityLabel={`${item.title}, ${item.type}`}
            accessibilityRole="button"
            onPress={() => onSelectItem(item.title)}
            style={({ pressed }) => [
              styles.liveResultRow,
              pressed && styles.rowPressed,
            ]}
          >
            <Search
              color="#9ca3af"
              size={18}
              strokeWidth={1.8}
              style={styles.rowIcon}
            />
            <View style={styles.rowContent}>
              <Text style={styles.itemTitle}>{item.title}</Text>
              <Text style={styles.itemSubtitle}>{item.type}</Text>
            </View>
          </Pressable>
        ))
      ) : (
        <View style={styles.emptyResults}>
          <Text style={styles.emptyText}>
            No results found for &quot;{searchQuery}&quot;.
          </Text>
          <Pressable
            onPress={() => onSelectItem(searchQuery.trim())}
            style={styles.searchAnywayButton}
          >
            <Text style={styles.searchAnywayText}>
              Search for &quot;{searchQuery}&quot;
            </Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  liveResultsContainer: {
    backgroundColor: colors.white,
    borderRadius: 14,
    marginHorizontal: 16,
    overflow: "hidden",
    boxShadow: "0px 2px 8px rgba(0, 0, 0, 0.08)",
  },
  liveResultRow: {
    alignItems: "center",
    backgroundColor: colors.white,
    borderBottomColor: "#f3f4f6",
    borderBottomWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  rowPressed: {
    backgroundColor: "#f9fafb",
  },
  rowIcon: {
    marginRight: 12,
  },
  rowContent: {
    flex: 1,
  },
  itemTitle: {
    color: "#111827",
    fontFamily: fontFamilies.medium,
    fontSize: 14,
  },
  itemSubtitle: {
    color: "#6b7280",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    marginTop: 1,
  },
  emptyResults: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 28,
  },
  emptyText: {
    color: "#6b7280",
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    textAlign: "center",
  },
  searchAnywayButton: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  searchAnywayText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
  },
});
