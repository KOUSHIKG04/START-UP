import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Clock3, Heart, MapPin } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { hospitalSuggestions } from "../../utils/ambulanceConstants";

export function Suggestions({
  query,
  onSelect,
  onClose,
}: {
  query?: string;
  onSelect: (name: string) => void;
  onClose?: () => void;
}) {
  const [favorite, setFavorite] = useState<string>("Victoria Hospital");

  const filtered = hospitalSuggestions.filter(([name, address]) => {
    if (!query || !query.trim()) return true;
    const q = query.toLowerCase();
    return name.toLowerCase().includes(q) || address.toLowerCase().includes(q);
  });

  const list = filtered.length > 0 ? filtered : hospitalSuggestions;

  return (
    <View style={styles.suggestionsContainer}>
      <View style={styles.suggestionsHeader}>
        <Text style={styles.suggestionsHeaderTitle}>
          {query && query.trim()
            ? `Results for "${query}"`
            : "Nearby Hospitals & Clinics"}
        </Text>
        {onClose ? (
          <Pressable onPress={onClose} hitSlop={10}>
            <Text style={styles.suggestionsCloseBtn}>Done</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.suggestionsList}>
        {list.map(([name, address]) => {
          const isFav = favorite === name;
          return (
            <Pressable
              key={name}
              onPress={() => onSelect(name)}
              style={({ pressed }) => [
                styles.suggestionCard,
                pressed && styles.pressed,
              ]}
            >
              <View style={styles.suggestionPin}>
                <MapPin color="#087F78" size={20} />
              </View>
              <View style={styles.suggestionCopy}>
                <Text numberOfLines={1} style={styles.suggestionName}>
                  {name}
                </Text>
                <Text numberOfLines={1} style={styles.suggestionAddress}>
                  {address}
                </Text>
                <View style={styles.suggestionMetaRow}>
                  <Clock3 color="#087F78" size={12} />
                  <Text style={styles.suggestionMetaText}>
                    Open 24/7 • 4 min away
                  </Text>
                </View>
              </View>
              <Pressable
                hitSlop={10}
                onPress={() => setFavorite(isFav ? "" : name)}
                style={styles.suggestionHeart}
              >
                <Heart
                  color={isFav ? "#E11D48" : "#94A3B8"}
                  fill={isFav ? "#E11D48" : "transparent"}
                  size={19}
                />
              </Pressable>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.72 },
  suggestionsContainer: {
    paddingHorizontal: 16,
    marginTop: 18,
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  suggestionsHeaderTitle: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  suggestionsCloseBtn: {
    color: "#087F78",
    fontFamily: fontFamilies.semibold,
    fontSize: 14,
  },
  suggestionsList: {
    gap: 10,
  },
  suggestionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: colors.borderDefault,
  },
  suggestionPin: {
    width: 42,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#E8F5F4",
  },
  suggestionCopy: { flex: 1, gap: 3 },
  suggestionName: {
    color: "#0C2434",
    fontFamily: fontFamilies.semibold,
    fontSize: 15,
  },
  suggestionAddress: {
    color: "#71818F",
    fontFamily: fontFamilies.regular,
    fontSize: 12,
  },
  suggestionMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  suggestionMetaText: {
    color: "#087F78",
    fontFamily: fontFamilies.medium,
    fontSize: 11,
  },
  suggestionHeart: {
    padding: 6,
  },
});
