"use client";

import type { DecimalSettingProps } from "../types/decimalSetting";
import { useState } from "react";
import { Input } from "@startup/web-ui/components/ui/input";

export function DecimalSetting({
  id,
  label,
  value,
  max,
  nullable = false,
  disabled,
  onChange,
}: DecimalSettingProps) {
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const display = focused ? text : value === null ? "" : String(value);
  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      aria-label={label}
      value={display}
      disabled={disabled}
      onFocus={() => {
        setText(value === null ? "" : String(value));
        setFocused(true);
      }}
      onChange={(event) => {
        const next = event.target.value;
        if (!/^\d{0,6}(?:\.\d{0,2})?$/.test(next)) return;
        setText(next);
        if (next !== "" && next !== "." && Number(next) <= max)
          onChange(Number(next));
      }}
      onBlur={() => {
        const parsed = Number(text);
        if (text === "" && nullable) onChange(null);
        else if (text === "" || !Number.isFinite(parsed) || parsed > max)
          onChange(value ?? 0);
        else onChange(parsed);
        setFocused(false);
      }}
    />
  );
}
