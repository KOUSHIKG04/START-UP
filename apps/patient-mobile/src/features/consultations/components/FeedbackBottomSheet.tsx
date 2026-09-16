import { useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, fontFamilies, radius, spacing } from "@startup/design-tokens";
import { Button, TextArea } from "@startup/mobile-ui";

type FeedbackBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
};

export default function FeedbackBottomSheet({
  visible,
  onClose,
}: FeedbackBottomSheetProps) {
  const [feedback, setFeedback] = useState("");

  const submit = () => {
    setFeedback("");
    onClose();
  };

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
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
          onPress={onClose}
          style={styles.backdrop}
        />
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.title}>Share Detailed Feedback</Text>
          <Text style={styles.description}>
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
    paddingHorizontal: spacing.lg,
    paddingTop: 10,
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
    fontFamily: fontFamilies.bold,
    fontSize: 19,
    fontWeight: "700",
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
});
