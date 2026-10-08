import { ModalSurface } from "@startup/mobile-ui";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { CheckCircle2 } from "lucide-react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, TextArea } from "@startup/mobile-ui";

type FeedbackBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (comment: string) => Promise<void>;
};

export default function FeedbackBottomSheet({
  visible,
  onClose,
  onSubmit,
}: FeedbackBottomSheetProps) {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleClose = () => {
    setSubmitted(false);
    setFeedback("");
    onClose();
  };

  const submit = async () => {
    if (submitting || !feedback.trim()) return;
    setSubmitting(true);
    try {
      await onSubmit(feedback.trim());
      setSubmitted(true);
    } catch {
      // Keep the form open so the patient can retry after the route's error toast.
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalSurface layout="custom"
      animationType="slide"
      onClose={submitted ? undefined : handleClose}
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
          onPress={handleClose}
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
              <Button label="Done" onPress={handleClose} style={styles.submitButton} />
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
              <Button loading={submitting}
                disabled={!feedback.trim() || submitting}
                label="Submit"
                onPress={() => void submit()}
                style={styles.submitButton}
              />
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </ModalSurface>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, justifyContent: "flex-end" },
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.ui.overlay,
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
