import { Pressable, StyleSheet, View } from "react-native";
import { useState, type ReactNode } from "react";
import { ChevronDown, IndianRupee } from "lucide-react-native";
import {
  colors,
  typography,
  type MobileThemeName,
} from "@startup/design-tokens";
import { useMobileTheme } from "../theme/MobileThemeProvider";
import { AppText } from "../primitives/AppText";
import { Card } from "../primitives/Card";
import type { PaymentSummaryProps } from "../types/paymentSummary";

export function PaymentSummary({
  title,
  amount,
  amountLabel,
  status,
  theme,
  testMode,
  children,
  footer,
}: PaymentSummaryProps) {
  const palette = useMobileTheme(theme);
  return (
    <Card theme={theme} padding={0} gap={0}>
      <View style={[styles.summary, { backgroundColor: palette.soft }]}>
        <View style={styles.heading}>
          <IndianRupee size={20} color={palette.primaryText} />
          <AppText
            accessibilityRole="header"
            variant="inherit"
            style={[
              typography.subheading,
              styles.title,
              { color: palette.text },
            ]}
          >
            {title}
          </AppText>
        </View>
        {testMode ? (
          <AppText
            variant="inherit"
            style={[typography.caption, { color: palette.text }]}
          >
            Test mode · No real money
          </AppText>
        ) : null}
        {amount ? (
          <View style={styles.amountRow}>
            <AppText
              variant="inherit"
              style={[
                typography.bodySmall,
                styles.amountLabel,
                { color: palette.text },
              ]}
            >
              {amountLabel}
            </AppText>
            <AppText
              variant="inherit"
              style={[
                typography.heading,
                styles.amount,
                { color: palette.text },
              ]}
            >
              {amount}
            </AppText>
          </View>
        ) : null}
        {status ? (
          <AppText
            variant="inherit"
            style={[typography.bodySmall, { color: palette.primaryText }]}
          >
            {status}
          </AppText>
        ) : null}
      </View>
      {children ? <View style={styles.body}>{children}</View> : null}
      {footer ? (
        <View style={[styles.footer, { borderColor: palette.border }]}>
          {footer}
        </View>
      ) : null}
    </Card>
  );
}

export function PaymentRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.row}>
      <AppText variant="inherit" style={[typography.bodySmall, styles.label]}>
        {label}
      </AppText>
      <AppText
        variant="inherit"
        selectable
        style={[
          emphasis ? typography.button : typography.bodySmall,
          styles.value,
        ]}
      >
        {value}
      </AppText>
    </View>
  );
}

export function PaymentDivider() {
  return <View style={styles.divider} />;
}

export function PaymentDisclosure({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded }}
        onPress={() => setExpanded((value) => !value)}
        style={styles.disclosure}
      >
        <AppText
          variant="inherit"
          style={[
            typography.bodySmall,
            styles.title,
            { color: colors.textPrimary },
          ]}
        >
          {title}
        </AppText>
        <ChevronDown
          size={18}
          color={colors.textPrimary}
          style={{ transform: [{ rotate: expanded ? "180deg" : "0deg" }] }}
        />
      </Pressable>
      {expanded ? (
        <View style={{ gap: 12, paddingBottom: 8 }}>{children}</View>
      ) : null}
    </View>
  );
}

export function PaymentReference({
  label = "Payment reference",
  value,
}: {
  label?: string;
  value: string;
}) {
  return (
    <View style={styles.reference}>
      <AppText
        variant="inherit"
        style={[typography.caption, { color: colors.textSecondary }]}
      >
        {label}
      </AppText>
      <AppText
        selectable
        variant="inherit"
        style={[typography.caption, styles.referenceValue]}
      >
        {value}
      </AppText>
    </View>
  );
}

export function PaymentStatus({
  label,
  theme,
}: {
  label: string;
  theme?: MobileThemeName;
}) {
  const palette = useMobileTheme(theme);
  return (
    <View style={[styles.status, { backgroundColor: palette.soft }]}>
      <AppText
        variant="inherit"
        style={[typography.bodySmall, { color: palette.primaryText }]}
      >
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: {
    padding: 16,
    gap: 10,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  heading: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { flex: 1 },
  amountRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "baseline",
    justifyContent: "space-between",
    gap: 8,
  },
  amountLabel: { flexGrow: 1 },
  amount: { fontVariant: ["tabular-nums"] },
  body: { padding: 16, gap: 12 },
  footer: { padding: 16, gap: 12, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flexDirection: "row", alignItems: "flex-start", gap: 16 },
  label: { flex: 1, color: colors.textSecondary },
  value: {
    flex: 1,
    color: colors.textPrimary,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.borderDefault,
    marginVertical: 4,
  },
  reference: { gap: 4 },
  referenceValue: { color: colors.textPrimary },
  status: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: "100%",
  },
  disclosure: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
  },
});
