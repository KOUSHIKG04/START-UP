import type { ReactNode } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
  Pressable,
  type TextProps,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { palette, ui } from "./theme";

export function Copy({ style, ...props }: TextProps) {
  return <Text {...props} style={[ui.copy, style]} />;
}
export function Heading({ children }: { children: ReactNode }) {
  return (
    <Copy accessibilityRole="header" style={ui.heading}>
      {children}
    </Copy>
  );
}
export function Card({ children }: { children: ReactNode }) {
  return <View style={ui.card}>{children}</View>;
}
export function PageHeader({
  title,
  right,
  onBack,
}: {
  title: string;
  right?: ReactNode;
  onBack?: () => void;
}) {
  return (
    <SafeAreaView edges={["top"]} style={ui.header}>
      <View style={ui.headerRow}>
        {onBack && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={onBack}
            style={ui.iconButton}
          >
            <ChevronLeft color="white" />
          </Pressable>
        )}
        <View style={ui.grow}>
          <Copy style={ui.title}>{title}</Copy>
        </View>
        {right}
      </View>
    </SafeAreaView>
  );
}
export function Body({ children }: { children: ReactNode }) {
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={ui.body}
    >
      {children}
    </ScrollView>
  );
}
export function Metrics({ items }: { items: [string, string][] }) {
  return (
    <Card>
      <View style={ui.row}>
        {items.map(([value, label], i) => (
          <View key={label} style={[ui.metric, i > 0 && ui.metricBorder]}>
            <Copy style={ui.metricValue}>{value}</Copy>
            <Copy style={ui.caption}>{label}</Copy>
          </View>
        ))}
      </View>
    </Card>
  );
}
