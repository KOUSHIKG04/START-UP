import type { NumberSettingProps } from "../types/number-setting";
import { useEffect, useState } from "react";
import { Pressable, View } from "react-native";
import { Input } from "@startup/mobile-ui";
import { Minus, Plus } from "lucide-react-native";
import { Label } from "../../../components/DoctorScreen";
import { palette, ui } from "../../../components/theme";

export function NumberSetting({
  title,
  value,
  min,
  max,
  suffix,
  onChange,
  stepper = false,
  disabled = false,
}: NumberSettingProps) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);
  const parsed = /^\d+$/.test(text) ? Number(text) : NaN;
  const current =
    Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : value;
  const commit = (next: number) => {
    const bounded = Math.max(min, Math.min(max, next));
    setText(String(bounded));
    onChange(bounded);
  };
  return (
    <View style={{ gap: 6 }}>
      <View style={ui.between}>
        <Label
          style={{ fontSize: 13, lineHeight: 20, includeFontPadding: false }}
        >
          {title}
        </Label>
        {!stepper ? (
          <Label muted style={{ fontSize: 12 }}>
            {min}–{max} {suffix}
          </Label>
        ) : null}
      </View>
      {stepper ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            borderWidth: 1,
            borderColor: palette.border,
            borderRadius: 10,
            overflow: "hidden",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Decrease ${title}`}
            accessibilityState={{ disabled: disabled || current <= min }}
            disabled={disabled || current <= min}
            onPress={() => commit(current - 1)}
            style={({ pressed }) => ({
              width: 44,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderRightWidth: 1,
              borderColor: palette.border,
              opacity: disabled || current <= min ? 0.3 : 1,
              backgroundColor: pressed ? palette.subtle : palette.surface,
            })}
          >
            <Minus size={20} color={palette.primary} />
          </Pressable>
          <Input
            variant="unstyled"
            accessibilityLabel={`${title} in ${suffix}`}
            value={text}
            disabled={disabled}
            style={{
              flex: 1,
              minWidth: 0,
              height: 46,
              paddingHorizontal: 0,
              paddingVertical: 0,
              textAlign: "center",
              textAlignVertical: "center",
              fontSize: 16,
              color: palette.header,
            }}
            onChangeText={(next) => {
              if (!/^\d{0,3}$/.test(next)) return;
              setText(next);
              const number = Number(next);
              if (next !== "" && number >= min && number <= max)
                onChange(number);
            }}
            onBlur={() => commit(Number.isFinite(parsed) ? parsed : value)}
            selectTextOnFocus
            keyboardType="number-pad"
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Increase ${title}`}
            accessibilityState={{ disabled: disabled || current >= max }}
            disabled={disabled || current >= max}
            onPress={() => commit(current + 1)}
            style={({ pressed }) => ({
              width: 44,
              height: 46,
              alignItems: "center",
              justifyContent: "center",
              borderLeftWidth: 1,
              borderColor: palette.border,
              opacity: disabled || current >= max ? 0.3 : 1,
              backgroundColor: pressed ? palette.subtle : palette.surface,
            })}
          >
            <Plus size={20} color={palette.primary} />
          </Pressable>
        </View>
      ) : (
        <Input
          accessibilityLabel={`${title} in ${suffix}`}
          value={text}
          onChangeText={(next) => {
            if (/^\d{0,3}$/.test(next)) {
              setText(next);
              if (next !== "") onChange(Number(next));
            }
          }}
          onBlur={() => setText(String(value))}
          selectTextOnFocus
          keyboardType="number-pad"
        />
      )}
    </View>
  );
}
