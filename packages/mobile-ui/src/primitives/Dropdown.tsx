import { useRef, useState, type ReactNode } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";
import { Check, ChevronDown } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";
import { appThemeColors, type AppTheme } from "../utils/appTheme";

export type DropdownOption = {
  label: string;
  value: string;
  disabled?: boolean;
};

export type DropdownProps = {
  options: readonly DropdownOption[];
  value?: string;
  onValueChange: (value: string) => void;
  label?: string;
  placeholder?: string;
  triggerLabel?: string;
  prefix?: string;
  theme?: AppTheme;
  disabled?: boolean;
  error?: string;
  maxVisibleOptions?: number;
  containerStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
  accessibilityLabel?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  chevronSize?: number;
  chevronColor?: string;
  menuWidth?: number;
  menuStyle?: StyleProp<ViewStyle>;
};

type TriggerPosition = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const OPTION_HEIGHT = 44;
const MENU_GAP = 4;

export function Dropdown({
  options,
  value,
  onValueChange,
  label,
  placeholder = "Select an option",
  triggerLabel,
  prefix,
  theme = "patient",
  disabled = false,
  error,
  maxVisibleOptions = 5,
  containerStyle,
  triggerStyle,
  valueStyle,
  accessibilityLabel,
  leftIcon,
  rightIcon,
  chevronSize = 14,
  chevronColor,
  menuWidth,
  menuStyle,
}: DropdownProps) {
  const triggerRef = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [triggerPosition, setTriggerPosition] = useState<TriggerPosition>();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const themeColors = appThemeColors[theme];
  const selectedOption = options.find((option) => option.value === value);
  const menuHeight =
    Math.min(options.length, maxVisibleOptions) * OPTION_HEIGHT + 12;

  const openMenu = () => {
    if (disabled) return;

    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setTriggerPosition({ x, y, width, height });
      setIsOpen(true);
    });
  };

  const closeMenu = () => setIsOpen(false);

  const selectOption = (option: DropdownOption) => {
    if (option.disabled) return;
    onValueChange(option.value);
    closeMenu();
  };

  const shouldOpenAbove = triggerPosition
    ? triggerPosition.y + triggerPosition.height + MENU_GAP + menuHeight >
      windowHeight
    : false;

  const menuTop = triggerPosition
    ? shouldOpenAbove
      ? Math.max(MENU_GAP, triggerPosition.y - menuHeight - MENU_GAP)
      : triggerPosition.y + triggerPosition.height + MENU_GAP
    : 0;

  const targetWidth = menuWidth ?? Math.max(triggerPosition?.width ?? 160, 160);
  const idealLeft = triggerPosition
    ? triggerPosition.x + triggerPosition.width / 2 > windowWidth / 2
      ? triggerPosition.x + triggerPosition.width - targetWidth
      : triggerPosition.x
    : 0;
  const maxLeft = Math.max(12, windowWidth - targetWidth - 12);
  const menuLeft = Math.max(12, Math.min(idealLeft, maxLeft));

  const displayValue =
    triggerLabel ??
    (prefix
      ? `${prefix}${selectedOption?.label ?? placeholder}`
      : (selectedOption?.label ?? placeholder));

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        ref={triggerRef}
        accessibilityLabel={accessibilityLabel ?? label ?? placeholder}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: isOpen }}
        disabled={disabled}
        onPress={openMenu}
        style={({ pressed }) => [
          styles.trigger,
          isOpen ? { borderColor: themeColors.primary } : undefined,
          error ? styles.triggerError : undefined,
          disabled ? styles.triggerDisabled : undefined,
          pressed && !disabled ? styles.triggerPressed : undefined,
          triggerStyle,
        ]}
      >
        {leftIcon ? <View style={styles.leftIcon}>{leftIcon}</View> : null}
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            !selectedOption && !triggerLabel ? styles.placeholder : undefined,
            disabled ? styles.disabledText : undefined,
            valueStyle,
          ]}
        >
          {displayValue}
        </Text>
        {rightIcon ?? (
          <ChevronDown
            color={
              chevronColor ??
              (disabled
                ? colors.disabledText
                : isOpen
                  ? themeColors.primary
                  : colors.textSecondary)
            }
            size={chevronSize}
            strokeWidth={2.2}
            style={isOpen ? styles.chevronOpen : undefined}
          />
        )}
      </Pressable>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Modal
        animationType="fade"
        onRequestClose={closeMenu}
        statusBarTranslucent
        transparent
        visible={isOpen && Boolean(triggerPosition)}
      >
        <View style={styles.modal}>
          <Pressable
            accessibilityLabel="Close options"
            onPress={closeMenu}
            style={styles.backdrop}
          />

          {triggerPosition ? (
            <View
              style={[
                styles.menu,
                {
                  top: menuTop,
                  left: menuLeft,
                  width: targetWidth,
                  maxHeight: menuHeight,
                },
                menuStyle,
              ]}
            >
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.menuContent}
              >
                {options.map((option) => {
                  const isSelected = option.value === value;

                  return (
                    <Pressable
                      key={option.value}
                      accessibilityLabel={option.label}
                      accessibilityRole="radio"
                      accessibilityState={{
                        selected: isSelected,
                        disabled: option.disabled === true,
                      }}
                      disabled={option.disabled}
                      onPress={() => selectOption(option)}
                      style={({ pressed }) => [
                        styles.option,
                        isSelected && { backgroundColor: themeColors.soft },
                        pressed && !option.disabled && styles.optionPressed,
                        option.disabled && styles.optionDisabled,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.optionLabel,
                          isSelected && [
                            styles.optionLabelSelected,
                            { color: themeColors.primaryText },
                          ],
                          option.disabled && styles.disabledText,
                        ]}
                      >
                        {option.label}
                      </Text>

                      {isSelected ? (
                        <Check
                          color={themeColors.primary}
                          size={16}
                          strokeWidth={2.4}
                        />
                      ) : null}
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {},
  label: {
    marginBottom: 4,
    color: colors.textPrimary,
    fontFamily: fontFamilies.semibold,
    fontSize: 11,
    fontWeight: "600",
    lineHeight: 14,
  },
  trigger: {
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 12,
    backgroundColor: colors.white,
  },
  leftIcon: {
    alignItems: "center",
    justifyContent: "center",
  },
  triggerError: {
    borderColor: colors.danger,
  },
  triggerDisabled: {
    backgroundColor: colors.disabledBackground,
  },
  triggerPressed: {
    opacity: 0.82,
  },
  value: {
    minWidth: 0,
    flexShrink: 1,
    color: colors.textPrimary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  placeholder: {
    color: colors.textSecondary,
  },
  disabledText: {
    color: colors.disabledText,
  },
  chevronOpen: {
    transform: [{ rotate: "180deg" }],
  },
  error: {
    marginTop: 6,
    color: colors.danger,
    fontFamily: fontFamilies.regular,
    fontSize: 12,
    lineHeight: 16,
  },
  modal: {
    flex: 1,
  },
  backdrop: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: "rgba(12, 36, 52, 0.12)",
  },
  menu: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 14,
    backgroundColor: colors.white,
    shadowColor: "#055B56",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  menuContent: {
    paddingVertical: 6,
    paddingHorizontal: 6,
    gap: 2,
  },
  option: {
    minHeight: 38,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  optionPressed: {
    opacity: 0.7,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
  },
  optionDisabled: {
    opacity: 0.45,
  },
  optionLabel: {
    minWidth: 0,
    flex: 1,
    color: colors.textPrimary,
    fontFamily: fontFamilies.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  optionLabelSelected: {
    fontFamily: fontFamilies.semibold,
    fontWeight: "600",
  },
});
