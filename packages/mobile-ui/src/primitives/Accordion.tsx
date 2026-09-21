import { useMobileTheme } from "../theme/MobileThemeProvider";
import { useState, type ReactNode } from "react";
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { ChevronDown } from "lucide-react-native";
import { colors, fontFamilies, radius } from "@startup/design-tokens";
import { type AppTheme } from "../utils/appTheme";

export type AccordionVariant = "elevated" | "outlined" | "surface" | "plain";

export type AccordionProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  badge?: ReactNode;
  children: ReactNode;
  isOpen?: boolean;
  defaultOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  variant?: AccordionVariant;
  theme?: AppTheme;
  disabled?: boolean;
  separator?: boolean;
  separatorColor?: string;
  chevronColor?: string;
  chevronSize?: number;
  style?: StyleProp<ViewStyle>;
  headerStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
  closedPlaceholder?: ReactNode;
  titleStyle?: StyleProp<TextStyle>;
  subtitleStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
};

export function Accordion({
  title,
  subtitle,
  leftIcon,
  rightIcon,
  badge,
  children,
  isOpen: controlledIsOpen,
  defaultOpen = false,
  onToggle,
  variant = "outlined",
  theme,
  disabled = false,
  separator = true,
  separatorColor,
  chevronColor,
  chevronSize = 18,
  style,
  headerStyle,
  contentStyle,
  closedPlaceholder,
  titleStyle,
  subtitleStyle,
  accessibilityLabel,
}: AccordionProps) {
  const [internalOpen, setInternalOpen] = useState(defaultOpen);
  const isControlled = controlledIsOpen !== undefined;
  const open = isControlled ? controlledIsOpen : internalOpen;
  const themeColors = useMobileTheme(theme);

  const handleToggle = () => {
    if (disabled) return;
    const nextOpen = !open;
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onToggle?.(nextOpen);
  };

  const resolvedChevronColor =
    chevronColor ??
    (variant === "plain"
      ? colors.patient.textSecondary
      : themeColors.primaryText);

  return (
    <View
      style={[styles.container, getVariantStyle(variant, themeColors), style]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open, disabled }}
        accessibilityLabel={
          accessibilityLabel ??
          (typeof title === "string" ? title : "Accordion header")
        }
        disabled={disabled}
        onPress={handleToggle}
        style={({ pressed }) => [
          styles.header,
          pressed && !disabled ? styles.headerPressed : undefined,
          open && variant !== "plain" ? styles.headerOpen : undefined,
          headerStyle,
        ]}
      >
        <View style={styles.headerLeft}>
          {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
          <View style={styles.titleContainer}>
            {typeof title === "string" ? (
              <Text
                style={[
                  styles.title,
                  variant === "surface"
                    ? { color: themeColors.primaryText }
                    : undefined,
                  titleStyle,
                ]}
              >
                {title}
              </Text>
            ) : (
              title
            )}
            {subtitle ? (
              typeof subtitle === "string" ? (
                <Text style={[styles.subtitle, subtitleStyle]}>{subtitle}</Text>
              ) : (
                subtitle
              )
            ) : null}
          </View>
          {badge ? <View style={styles.badge}>{badge}</View> : null}
        </View>

        <View style={styles.headerRight}>
          {rightIcon ?? (
            <View
              style={[
                styles.chevron,
                open ? styles.chevronOpen : styles.chevronClosed,
              ]}
            >
              <ChevronDown
                size={chevronSize}
                color={resolvedChevronColor}
                strokeWidth={2.2}
              />
            </View>
          )}
        </View>
      </Pressable>

      {open ? (
        <View style={styles.bodyWrapper}>
          {separator ? (
            <View
              style={[
                styles.separator,
                separatorColor
                  ? { backgroundColor: separatorColor }
                  : undefined,
              ]}
            />
          ) : null}
          <View style={[styles.content, contentStyle]}>{children}</View>
        </View>
      ) : closedPlaceholder ? (
        <View style={styles.bodyWrapper}>
          {separator ? (
            <View
              style={[
                styles.separator,
                separatorColor
                  ? { backgroundColor: separatorColor }
                  : undefined,
              ]}
            />
          ) : null}
          {closedPlaceholder}
        </View>
      ) : null}
    </View>
  );
}

function getVariantStyle(
  variant: AccordionVariant,
  theme: ReturnType<typeof useMobileTheme>
): ViewStyle {
  switch (variant) {
    case "elevated":
      return {
        backgroundColor: theme.surface,
        borderRadius: radius.md,
        shadowColor: colors.ui.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
        borderWidth: 0,
      };
    case "surface":
      return {
        backgroundColor: theme.soft,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: colors.patient.surfaceBorder,
      };
    case "plain":
      return {
        backgroundColor: "transparent",
        borderRadius: 0,
        borderWidth: 0,
      };
    case "outlined":
    default:
      return {
        backgroundColor: theme.surface,
        borderRadius: radius.md,
        borderWidth: 1,
        borderColor: theme.border,
      };
  }
}

const styles = StyleSheet.create({
  container: {
    overflow: "hidden",
  },
  header: {
    minHeight: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerPressed: {
    opacity: 0.76,
  },
  headerOpen: {
    borderBottomColor: "transparent",
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  leftIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  titleContainer: {
    flex: 1,
    gap: 2,
  },
  title: {
    color: colors.patient.text,
    fontFamily: fontFamilies.bold,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
  },
  subtitle: {
    color: colors.patient.textSecondary,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  badge: {
    marginLeft: 4,
  },
  headerRight: {
    alignItems: "center",
    justifyContent: "center",
  },
  chevron: {
    alignItems: "center",
    justifyContent: "center",
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
  chevronClosed: {
    transform: [{ rotate: "0deg" }],
  },
  bodyWrapper: {
    width: "100%",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.ui.separator,
    marginHorizontal: 16,
  },
  content: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
});
