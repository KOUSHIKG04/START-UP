import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { CheckCircle2, ChevronDown, Lock } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button, Card, Input } from "@startup/mobile-ui";

export function ProfilePinCard() {
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState(["", "", "", ""]);
  const [pinSaved, setPinSaved] = useState(false);

  const updatePin = (index: number, value: string) => {
    setPinSaved(false);
    setPin((current) =>
      current.map((digit, digitIndex) =>
        digitIndex === index ? value.replace(/\D/g, "").slice(-1) : digit
      )
    );
  };

  const handleSavePin = () => {
    if (pin.every((digit) => digit.length === 1)) {
      setPinSaved(true);
      setTimeout(() => {
        setShowPin(false);
        setPinSaved(false);
      }, 1400);
    }
  };

  return (
    <Card
      variant="outlined"
      borderRadius={radius.md}
      borderWidth={1}
      borderColor="#E0E5EB"
      backgroundColor={colors.white}
      padding={16}
      gap={showPin ? 14 : 0}
      style={styles.cardNoShadow}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Set Security PIN"
        onPress={() => setShowPin((value) => !value)}
        style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
      >
        <View style={styles.iconCircle}>
          <Lock color={colors.patient.primaryDark} size={18} />
        </View>
        <View style={styles.copyCol}>
          <Text style={styles.rowTitle}>Set Security PIN</Text>
          <Text style={styles.rowSubtitle}>
            Quick 4-digit verification passcode
          </Text>
        </View>
        <ChevronDown
          color="#8EA0B4"
          size={18}
          style={showPin ? styles.chevronRotated : undefined}
        />
      </Pressable>

      {showPin ? (
        <View style={styles.expandedSection}>
          <View style={styles.divider} />
          <Text style={styles.pinInstructions}>
            Enter a 4-digit security PIN for quick authorization and sensitive
            actions.
          </Text>
          <View style={styles.pinRow}>
            {pin.map((digit, index) => (
              <Input
                key={index}
                accessibilityLabel={`PIN digit ${index + 1}`}
                containerStyle={styles.pinContainer}
                keyboardType="number-pad"
                maxLength={1}
                onChangeText={(value) => updatePin(index, value)}
                secureTextEntry
                style={styles.pinInput}
                value={digit}
              />
            ))}
          </View>

          {pinSaved ? (
            <View style={styles.savedBanner}>
              <CheckCircle2 color="#059669" size={16} />
              <Text style={styles.savedText}>PIN Saved Successfully</Text>
            </View>
          ) : (
            <Button
              disabled={pin.some((digit) => !digit)}
              label="Save PIN"
              onPress={handleSavePin}
              style={styles.savePinButton}
              labelStyle={styles.savePinLabel}
              variant="secondary"
            />
          )}
        </View>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  cardNoShadow: {
    elevation: 0,
    shadowOpacity: 0,
  },
  actionRow: {
    minHeight: 46,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 18,
    backgroundColor: "#EDF9F7",
  },
  copyCol: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
  },
  rowSubtitle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 11,
  },
  chevronRotated: {
    transform: [{ rotate: "180deg" }],
  },
  pressed: {
    opacity: 0.72,
  },
  expandedSection: {
    gap: 12,
  },
  divider: {
    height: 1,
    backgroundColor: "#E0E5EB",
    marginVertical: 2,
  },
  pinInstructions: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  pinRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 12,
    paddingVertical: 6,
  },
  pinContainer: {
    width: 50,
  },
  pinInput: {
    minHeight: 46,
    paddingHorizontal: 0,
    paddingVertical: 8,
    textAlign: "center",
    fontSize: 18,
    fontFamily: fontFamilies.bold,
  },
  savePinButton: {
    width: "100%",
    minHeight: 44,
    borderRadius: radius.md,
  },
  savePinLabel: {
    fontSize: 13,
  },
  savedBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  savedText: {
    color: "#059669",
    fontFamily: fontFamilies.bold,
    fontSize: 12,
  },
});
