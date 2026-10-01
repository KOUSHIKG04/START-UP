import { useMobileTheme } from "../theme/MobileThemeProvider";
import { memo, useCallback, useRef, useState, type ReactNode } from "react";
import {
  FlatList,
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
import { type AppTheme } from "../utils/appTheme";

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

function calculateMenuPosition({
  triggerPosition,
  menuHeight,
  menuWidth,
  windowWidth,
  windowHeight,
}: {
  triggerPosition?: TriggerPosition;
  menuHeight: number;
  menuWidth?: number;
  windowWidth: number;
  windowHeight: number;
}) {
  if (!triggerPosition) return { menuTop: 0, menuLeft: 12, targetWidth: 160 };

  const shouldOpenAbove =
    triggerPosition.y + triggerPosition.height + MENU_GAP + menuHeight > windowHeight;
  const menuTop = shouldOpenAbove
    ? Math.max(MENU_GAP, triggerPosition.y - menuHeight - MENU_GAP)
    : triggerPosition.y + triggerPosition.height + MENU_GAP;
  const targetWidth = menuWidth ?? Math.max(triggerPosition.width, 160);
  const idealLeft =
    triggerPosition.x + triggerPosition.width / 2 > windowWidth / 2
      ? triggerPosition.x + triggerPosition.width - targetWidth
      : triggerPosition.x;
  const maxLeft = Math.max(12, windowWidth - targetWidth - 12);
  const menuLeft = Math.max(12, Math.min(idealLeft, maxLeft));

  return { menuTop, menuLeft, targetWidth };
}

const DropdownOptionRow = memo(function DropdownOptionRow({
  option,
  isSelected,
  softColor,
  textColor,
  primaryTextColor,
  primaryColor,
  onSelect,
}: {
  option: DropdownOption;
  isSelected: boolean;
  softColor: string;
  textColor: string;
  primaryTextColor: string;
  primaryColor: string;
  onSelect: (option: DropdownOption) => void;
}) {
  const handlePress = () => onSelect(option);
  return (
    <Pressable
      accessibilityLabel={option.label}
      accessibilityRole="radio"
      accessibilityState={{
        selected: isSelected,
        disabled: option.disabled === true,
      }}
      disabled={option.disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.option,
        isSelected && { backgroundColor: softColor },
        pressed && !option.disabled && styles.optionPressed,
        option.disabled && styles.optionDisabled,
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          styles.optionLabel,
          { color: textColor },
          isSelected && [
            styles.optionLabelSelected,
            { color: primaryTextColor },
          ],
          option.disabled && styles.disabledText,
        ]}
      >
        {option.label}
      </Text>
      {isSelected ? (
        <Check
          color={primaryColor}
          size={16}
          strokeWidth={2.4}
        />
      ) : null}
    </Pressable>
  );
});

export function Dropdown({
  options,
  value,
  onValueChange,
  label,
  placeholder = "Select an option",
  triggerLabel,
  prefix,
  theme,
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
  const themeColors = useMobileTheme(theme);
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

  const selectOption = useCallback(
    (option: DropdownOption) => {
      if (option.disabled) return;
      onValueChange(option.value);
      closeMenu();
    },
    [onValueChange],
  );

  const { menuTop, menuLeft, targetWidth } = calculateMenuPosition({
    triggerPosition,
    menuHeight,
    menuWidth,
    windowWidth,
    windowHeight,
  });

  const renderOption = useCallback(
    ({ item }: { item: DropdownOption }) => (
      <DropdownOptionRow
        option={item}
        isSelected={item.value === value}
        softColor={themeColors.soft}
        textColor={themeColors.text}
        primaryTextColor={themeColors.primaryText}
        primaryColor={themeColors.primary}
        onSelect={selectOption}
      />
    ),
    [
      value,
      themeColors.soft,
      themeColors.text,
      themeColors.primaryText,
      themeColors.primary,
      selectOption,
    ],
  );

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
          {
            backgroundColor: themeColors.surface,
            borderColor: themeColors.border,
          },
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
            { color: themeColors.text },
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
                { backgroundColor: themeColors.surface },
                {
                  top: menuTop,
                  left: menuLeft,
                  width: targetWidth,
                  maxHeight: menuHeight,
                },
                menuStyle,
              ]}
            >
              <FlatList
                data={options as DropdownOption[]}
                keyExtractor={(item) => item.value}
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.menuContent}
                renderItem={renderOption}
              />
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
    backgroundColor: colors.ui.overlay,
  },
  menu: {
    position: "absolute",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.ui.menuBorder,
    borderRadius: 14,
    backgroundColor: colors.white,
    boxShadow: "0px 6px 16px rgba(5, 91, 86, 0.12)",
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
    backgroundColor: colors.ui.pressedOverlay,
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
