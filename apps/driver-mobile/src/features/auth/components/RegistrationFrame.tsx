import type { FrameProps } from "../types/frame";

import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "@startup/mobile-ui";
import { StatusBar } from "expo-status-bar";
import { ArrowLeft } from "lucide-react-native";
import { s } from "./Registration.styles";

function Header({ title, onBack }: { title: string; onBack?: () => void }) {
  return (
    <View style={s.header}>
      {onBack && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          hitSlop={12}
          onPress={onBack}
          style={s.back}
        >
          <ArrowLeft size={23} color="white" />
        </Pressable>
      )}
      <Text style={s.headerTitle}>{title}</Text>
    </View>
  );
}

export function Frame({ children, title, onBack }: FrameProps) {
  return (
    <SafeAreaView style={s.headerSafeArea} edges={["top"]}>
      <StatusBar style="dark" />
      <Header title={title} onBack={onBack} />
      <KeyboardAvoidingView
        style={s.screen}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <SafeAreaView style={s.screen} edges={["bottom"]}>
          {children}
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
