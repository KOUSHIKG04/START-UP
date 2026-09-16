import { forwardRef, type ReactNode } from "react";
import {
  StyleSheet,
  TextInput,
  View,
  type StyleProp,
  type TextInputProps,
  type ViewStyle,
} from "react-native";
import { Search } from "lucide-react-native";
import { colors, fontFamilies } from "@startup/design-tokens";

export type SearchInputProps = Omit<TextInputProps, "style"> & {
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
  inputStyle?: TextInputProps["style"];
  iconColor?: string;
  iconSize?: number;
  showIcon?: boolean;
  rightAccessory?: ReactNode;
};

export const SearchInput = forwardRef<TextInput, SearchInputProps>(
  function SearchInput(
    {
      disabled = false,
      editable = true,
      containerStyle,
      inputStyle,
      iconColor = colors.textSecondary,
      iconSize = 20,
      showIcon = true,
      rightAccessory,
      placeholder = "Search",
      placeholderTextColor = colors.textSecondary,
      accessibilityLabel = "Search",
      accessibilityState,
      ...props
    },
    ref
  ) {
    return (
      <View
        style={[
          styles.container,
          disabled ? styles.disabled : undefined,
          containerStyle,
        ]}
      >
        {showIcon ? (
          <Search color={iconColor} size={iconSize} strokeWidth={2} />
        ) : null}
        <TextInput
          ref={ref}
          {...props}
          accessibilityLabel={accessibilityLabel}
          accessibilityState={{ ...accessibilityState, disabled }}
          editable={!disabled && editable}
          placeholder={placeholder}
          placeholderTextColor={placeholderTextColor}
          returnKeyType="search"
          style={[styles.input, inputStyle]}
        />
        {rightAccessory}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    width: "100%",
    maxWidth: 340,
    minHeight: 44,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: colors.borderDefault,
    borderRadius: 20,
    backgroundColor: colors.white,
  },
  input: {
    minWidth: 0,
    flex: 1,
    paddingVertical: 0,
    color: colors.textPrimary,
    fontFamily: fontFamilies.regular,
    fontSize: 14,
    lineHeight: 20,
  },
  disabled: {
    backgroundColor: colors.disabledBackground,
    opacity: 0.7,
  },
});
