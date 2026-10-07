import { useEffect, useState } from "react";
import { getMyPatientVerificationPin } from "@startup/data-access";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ChevronDown, Lock } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { Button, Card, Input, Loader } from "@startup/mobile-ui";
import { supabase, useMobileSession } from "../../../services/supabase";

export function ProfilePinCard() {
  const { profile } = useMobileSession();
  const [showPin, setShowPin] = useState(false);
  const [pin, setPin] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const patientId = profile?.patient_id;

  useEffect(() => {
    const client = supabase;
    if (!showPin || !client || !patientId) {
      setPin(null);
      setLoading(false);
      setUnavailable(false);
      return;
    }
    let current = true;
    const load = async () => {
      if (current) setLoading(true);
      try {
        const value = await getMyPatientVerificationPin(client, patientId);
        if (current) {
          setPin(value);
          setUnavailable(false);
        }
      } catch {
        if (current) {
          setPin(null);
          setUnavailable(true);
        }
      } finally {
        if (current) setLoading(false);
      }
    };
    void load();
    const interval = setInterval(() => void load(), 15_000);
    return () => {
      current = false;
      clearInterval(interval);
    };
  }, [patientId, showPin]);

  const digits = Array.from({ length: 4 }, (_, index) => pin?.[index] ?? "");

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
        accessibilityLabel="Verification PIN"
        onPress={() => {
          setPin(null);
          setShowPin((value) => !value);
        }}
        style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
      >
        <View style={styles.iconCircle}>
          <Lock color={colors.patient.primaryDark} size={18} />
        </View>
        <View style={styles.copyCol}>
          <Text style={styles.rowTitle}>Verification PIN</Text>
          <Text style={styles.rowSubtitle}>
            Your 4-digit service completion passcode
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
            Share this PIN only when an active service is ready to be completed.
          </Text>
          <View style={styles.pinRow}>
            {digits.map((digit, index) => (
              <Input
                key={index}
                accessibilityLabel={`PIN digit ${index + 1}`}
                containerStyle={styles.pinContainer}
                editable={false}
                style={styles.pinInput}
                value={digit}
              />
            ))}
          </View>
          {loading ? (
            <Loader theme="patient" style={{ minHeight: 32 }} />
          ) : null}
          {unavailable ? (
            <Text style={styles.pinInstructions}>
              Your PIN is available during an active trip. Home-visit PIN
              display will be enabled when that workflow is connected.
            </Text>
          ) : null}
          <Button
            disabled={!pin}
            label="Done"
            onPress={() => setShowPin(false)}
            style={styles.savePinButton}
            labelStyle={styles.savePinLabel}
            variant="secondary"
          />
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
});
