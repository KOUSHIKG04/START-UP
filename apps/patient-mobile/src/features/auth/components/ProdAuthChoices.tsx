import { Pressable, StyleSheet, Text, View } from "react-native";
import { Phone } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import Svg, { Path } from "react-native-svg";

function GoogleIcon({ size = 20 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.65v3.03h3.88c2.27-2.09 3.66-5.17 3.66-9.12z"
      />
      <Path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.03c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.13C3.26 21.36 7.36 24 12 24z"
      />
      <Path
        fill="#FBBC05"
        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
      />
      <Path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.36 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
      />
    </Svg>
  );
}

export function ProdAuthChoices({
  onContinueWithGoogle,
  onContinueWithPhone,
}: {
  onContinueWithGoogle: () => void;
  onContinueWithPhone: () => void;
}) {
  return (
    <View style={styles.choices}>
      {/* Continue with Google */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with google"
        onPress={onContinueWithGoogle}
        style={({ pressed }) => [
          styles.socialButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <GoogleIcon size={20} />
        <Text style={styles.socialButtonText}>Continue with google</Text>
      </Pressable>

      {/* Continue with Phone */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Continue with Phone"
        onPress={onContinueWithPhone}
        style={({ pressed }) => [
          styles.socialButton,
          pressed && styles.buttonPressed,
        ]}
      >
        <Phone
          size={19}
          color={colors.patient.primaryDark}
          strokeWidth={2.2}
        />
        <Text style={styles.socialButtonText}>Continue with Phone</Text>
      </Pressable>

    </View>
  );
}

const styles = StyleSheet.create({
  choices: {
    width: "100%",
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.white,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 12,
  },
  buttonPressed: {
    opacity: 0.85,
    backgroundColor: "#F9FAFB",
  },
  socialButtonText: {
    fontSize: 15,
    fontFamily: fontFamilies.medium,
    color: colors.patient.text,
  },
  error: {
    fontSize: 13,
    fontFamily: fontFamilies.regular,
    color: "#DC2626",
    textAlign: "center",
  },
});
