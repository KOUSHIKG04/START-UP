import { useRef, useState } from "react";
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
import { colors } from "@startup/design-tokens";
import {
  appThemeColors,
  type AppTheme,
} from "../utils/appTheme";

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
  theme?: AppTheme;
  disabled?: boolean;
  error?: string;
  maxVisibleOptions?: number;
  containerStyle?: StyleProp<ViewStyle>;
  triggerStyle?: StyleProp<ViewStyle>;
  valueStyle?: StyleProp<TextStyle>;
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
  theme = "patient",
  disabled = false,
  error,
  maxVisibleOptions = 5,
  containerStyle,
  triggerStyle,
  valueStyle,
}: DropdownProps) {
  const triggerRef = useRef<View>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [triggerPosition, setTriggerPosition] = useState<TriggerPosition>();
  const { height: windowHeight } = useWindowDimensions();
  const themeColors = appThemeColors[theme];
  const selectedOption = options.find((option) => option.value === value);
  const menuHeight = Math.min(options.length, maxVisibleOptions) * OPTION_HEIGHT + 8;

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

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={styles.label}>{label}</Text> : null}

      <Pressable
        ref={triggerRef}
        accessibilityLabel={label ?? placeholder}
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
        <Text
          numberOfLines={1}
          style={[
            styles.value,
            !selectedOption ? styles.placeholder : undefined,
            disabled ? styles.disabledText : undefined,
            valueStyle,
          ]}
        >
          {selectedOption?.label ?? placeholder}
        </Text>
        <ChevronDown
          color={disabled ? colors.disabledText : colors.textSecondary}
          size={20}
          strokeWidth={2}
          style={isOpen ? styles.chevronOpen : undefined}
        />
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
            style={StyleSheet.absoluteFill}
          />

          {triggerPosition ? (
            <View
              style={[
                styles.menu,
                {
                  top: menuTop,
                  left: triggerPosition.x,
                  width: triggerPosition.width,
                  maxHeight: menuHeight,
                },
              ]}
            >
              <ScrollView
                bounces={false}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
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
                        isSelected
                          ? { backgroundColor: themeColors.soft }
                          : undefined,
                        pressed && !option.disabled
                          ? styles.optionPressed
                          : undefined,
                        option.disabled ? styles.optionDisabled : undefined,
                      ]}
                    >
                      <Text
                        numberOfLines={1}
                        style={[
                          styles.optionLabel,
                          isSelected
                            ? { color: themeColors.primaryText }
                            : undefined,
                          option.disabled ? styles.disabledText : undefined,
                        ]}
                      >
                        {option.label}
                      </Text>

                      {isSelected ? (
                        <Check
                          color={themeColors.primary}
                          size={18}
                          strokeWidth={2.25}
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
  container: {
    width: "100%",
    maxWidth: 340,
  },
  label: {
    marginBottom: 4,
    color: colors.textPrimary,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 10,
    backgroundColor: colors.white,
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
    flex: 1,
    color: colors.textPrimary,
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
    fontSize: 12,
    lineHeight: 16,
  },
  modal: {
    flex: 1,
  },
  menu: {
    position: "absolute",
    paddingVertical: 4,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 10,
    backgroundColor: colors.white,
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  option: {
    minHeight: OPTION_HEIGHT,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    paddingHorizontal: 16,
  },
  optionPressed: {
    opacity: 0.7,
  },
  optionDisabled: {
    opacity: 0.5,
  },
  optionLabel: {
    minWidth: 0,
    flex: 1,
    color: colors.textPrimary,
    fontSize: 14,
    lineHeight: 20,
  },
});
