import { StyleSheet } from "react-native";
import type { ReactNode } from "react";
import { Dropdown } from "@startup/mobile-ui";
import { colors, fontFamilies } from "@startup/design-tokens";
import { profileFormStyles } from "./profileFormStyles";

export function SelectDropdown({
  label,
  value,
  options,
  onChange,
  leftIcon,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (val: string) => void;
  leftIcon?: ReactNode;
}) {
  return (
    <Dropdown
      accessibilityLabel={`${label}: ${value}`}
      options={options.map((item) => ({ label: item, value: item }))}
      value={value}
      onValueChange={onChange}
      triggerStyle={[profileFormStyles.control, styles.select]}
      leftIcon={leftIcon}
      valueStyle={styles.selectText}
      chevronColor={colors.patient.primaryDark}
      backdropColor="#00000066"
      selectedOptionBackgroundColor="#F3F4F6"
      menuStyle={{ backgroundColor: colors.white }}
    />
  );
}

const styles = StyleSheet.create({
  select: {
    minHeight: 54,
    paddingVertical: 0,
  },
  selectText: {
    fontSize: 16,
    fontFamily: fontFamilies.regular,
    color: colors.patient.text,
  },
});
