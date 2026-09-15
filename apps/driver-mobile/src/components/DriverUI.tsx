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
export const palette = {
  primary: colors.driver.primary,
  ink: colors.driver.text,
  muted: colors.driver.textSecondary,
  soft: colors.driver.surface,
  border: colors.borderDefault,
  green: colors.driver.statusReady,
};
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
  subtitle,
  right,
  onBack,
}: {
  title: string;
  subtitle?: string;
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
          {subtitle && <Copy style={ui.subtitle}>{subtitle}</Copy>}
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
export const ui = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "white" },
  copy: {
    fontFamily: fontFamilies.regular,
    fontSize: 13,
    lineHeight: 19,
    color: palette.ink,
  },
  heading: { fontFamily: fontFamilies.semibold, fontSize: 15, lineHeight: 21 },
  title: {
    fontFamily: fontFamilies.bold,
    fontSize: 22,
    lineHeight: 28,
    color: "white",
  },
  subtitle: { color: "white", fontSize: 13, lineHeight: 18 },
  header: { backgroundColor: palette.primary },
  headerRow: {
    minHeight: 96,
    paddingHorizontal: 24,
    paddingVertical: 20,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  grow: { flex: 1 },
  body: { padding: 16, gap: 16, paddingBottom: 118, flexGrow: 1 },
  card: {
    padding: 16,
    borderWidth: 1,
    borderColor: palette.border,
    borderRadius: 16,
    backgroundColor: "white",
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  between: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  metric: { flex: 1, alignItems: "center", gap: 2 },
  metricBorder: { borderLeftWidth: 1, borderLeftColor: palette.border },
  metricValue: {
    fontFamily: fontFamilies.bold,
    color: palette.primary,
    fontSize: 18,
    lineHeight: 24,
  },
  caption: { fontSize: 11, lineHeight: 16, color: palette.muted },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    backgroundColor: palette.soft,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    color: palette.primary,
    fontSize: 11,
    fontFamily: fontFamilies.semibold,
  },
  divider: { height: 1, backgroundColor: palette.border },
  center: { alignItems: "center", gap: 8 },
  button: { minHeight: 52 },
});
