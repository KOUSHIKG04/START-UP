import { Image, StyleSheet, Text, View } from "react-native";
import { Info, UserRound } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button, Card } from "@startup/mobile-ui";

const queueSeatsImage = require("../../../assets/clinzo-symptom-icons/Queue-seates.png");

export function QueueStatus({ onComplete }: { onComplete: () => void }) {
  return (
    <>
      <Card
        variant="plain"
        borderRadius={radius.lg}
        borderWidth={0}
        borderColor="transparent"
        backgroundColor={colors.white}
        gap={16}
        padding={16}
        style={[styles.centeredCard, styles.flatCard, styles.noBorderCard]}
      >
        <View style={styles.queueHeading}>
          <Text style={styles.queueTitle}>You are in queue</Text>
          <View style={styles.liveBadge}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        </View>

        <View style={styles.peopleAheadSection}>
          <View style={styles.peopleAvatarsRow}>
            {[1, 2, 3, 4, 5].map((id) => (
              <View key={id} style={styles.avatarCircle}>
                <UserRound
                  color={colors.patient.accent}
                  fill={colors.patient.accent}
                  size={18}
                  strokeWidth={1.5}
                />
              </View>
            ))}
            <View style={styles.plusCircle}>
              <Text style={styles.plusCircleText}>+2</Text>
            </View>
          </View>
        </View>

        <View style={styles.queueStatsStack}>
          <View style={styles.queueStatCard}>
            <Text style={styles.queuePhraseText}>
              You are currently at{" "}
              <Text style={styles.queuePhraseHighlight}>7</Text> in the queue.
            </Text>
          </View>

          <View style={styles.queueStatCard}>
            <Text style={styles.queuePhraseText}>
              Estimated Wait Time ·{" "}
              <Text style={styles.queuePhraseHighlight}>37 min.</Text>
            </Text>
          </View>
        </View>

        <View style={styles.notifyBanner}>
          <Info color={colors.patient.accent} size={22} strokeWidth={2} />
          <Text style={styles.notifyBannerText}>
            We’ll notify you when it’s almost your turn.
          </Text>
        </View>
      </Card>

      <View style={styles.seatsImageContainer}>
        <Image
          source={queueSeatsImage}
          style={styles.seatsImage}
          resizeMode="cover"
        />
      </View>

      <Button
        label="Preview completed visit"
        onPress={onComplete}
        style={styles.fullWidthButton}
      />
    </>
  );
}

const styles = StyleSheet.create({
  flatCard: {
    elevation: 0,
    shadowOpacity: 0,
  },
  noBorderCard: {
    borderWidth: 0,
    borderColor: "transparent",
  },
  centeredCard: { alignItems: "center" },
  queueHeading: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  queueTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 17,
    fontWeight: "700",
  },
  liveBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: colors.patient.surface,
  },
  liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: "#20BE89" },
  liveText: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 11,
    fontWeight: "700",
  },
  queueStatsStack: {
    width: "100%",
    gap: 10,
  },
  queueStatCard: {
    width: "100%",
    backgroundColor: colors.patient.surface,
    borderWidth: 1,
    borderColor: "#D5EBE6",
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  queuePhraseText: {
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 14.5,
    lineHeight: 26,
    textAlign: "center",
  },
  queuePhraseHighlight: {
    color: colors.patient.accent,
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    fontWeight: "800",
  },
  peopleAheadSection: {
    width: "80%",
    gap: 12,
    marginTop: 1,
  },
  peopleAvatarsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingVertical: 2,
  },
  avatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E0F5F2",
    alignItems: "center",
    justifyContent: "center",
  },
  plusCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E0F5F2",
    alignItems: "center",
    justifyContent: "center",
  },
  plusCircleText: {
    color: colors.patient.accent,
    fontFamily: fontFamilies.bold,
    fontSize: 15,
    fontWeight: "700",
  },
  notifyBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#EBF7F6",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    width: "100%",
    marginTop: 4,
  },
  notifyBannerText: {
    flex: 1,
    color: "#4B5563",
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  seatsImageContainer: {
    width: "100%",
    height: 120,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: "#F0FAF9",
  },
  seatsImage: {
    width: "100%",
    height: "100%",
  },
  fullWidthButton: { width: "100%", minHeight: 48 },
});
