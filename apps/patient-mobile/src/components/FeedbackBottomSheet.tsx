import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import { router } from "expo-router";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, TextArea } from "@startup/mobile-ui";

type FeedbackBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmitSuccess?: () => void;
};

export default function FeedbackBottomSheet({
  visible,
  onClose,
  onSubmitSuccess,
}: FeedbackBottomSheetProps) {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      setSubmitted(false);
      setFeedback("");
    }
  }, [visible]);

  const submit = () => {
    setSubmitted(true);
    timerRef.current = setTimeout(() => {
      setSubmitted(false);
      setFeedback("");
      onClose();
      if (onSubmitSuccess) {
        onSubmitSuccess();
      } else {
        router.replace("/");
      }
    }, 3000);
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={submitted ? undefined : onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
        style={styles.modal}
      >
        <Pressable
          accessibilityLabel="Close feedback"
          accessibilityRole="button"
          disabled={submitted}
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          {submitted ? (
            <View style={styles.thankYouContainer}>
              <View style={styles.successHaloOuter}>
                <View style={styles.successHaloInner}>
                  <CheckCircle2 color={colors.white} size={44} strokeWidth={2.5} />
                </View>
              </View>
              <Text style={styles.thankYouTitle}>Thank you!</Text>
            </View>
          ) : (
            <>
              <View style={styles.handle} />
              <Text style={styles.title}>
                Tell us what went well and what we can improve.
              </Text>
              <TextArea
                accessibilityLabel="Detailed feedback"
                placeholder="Type your response here..."
                value={feedback}
                onChangeText={setFeedback}
                style={styles.textArea}
              />
              <Button
                disabled={!feedback.trim()}
                label="Submit"
                onPress={submit}
                style={styles.submitButton}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "rgba(5, 28, 31, 0.42)",
  },
  sheet: {
    gap: 12,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 28,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: "#E8F8F4",
  },
  handle: {
    width: 42,
    height: 4,
    alignSelf: "center",
    marginBottom: 4,
    borderRadius: 2,
    backgroundColor: "#A8CBC8",
  },
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.medium,
    fontSize: 16,
    fontWeight: "600",
  },
  description: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  textArea: {
    minHeight: 170,
    borderRadius: radius.md,
    backgroundColor: colors.white,
  },
  submitButton: { minHeight: 50, marginTop: 4 },
  thankYouContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 14,
  },
  successHaloOuter: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: "#D2F2EC",
    alignItems: "center",
    justifyContent: "center",
  },
  successHaloInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.patient.accent,
    alignItems: "center",
    justifyContent: "center",
  },
  thankYouTitle: {
    color: colors.patient.primaryDark,
    fontFamily: fontFamilies.bold,
    fontSize: 24,
    fontWeight: "700",
    textAlign: "center",
  },
});
