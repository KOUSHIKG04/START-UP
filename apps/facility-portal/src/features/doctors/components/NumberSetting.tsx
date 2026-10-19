"use client";
import type { NumberSettingProps } from "../types/numberSetting";
import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { Input } from "@startup/web-ui/components/ui/input";
export function NumberSetting({
  title,
  value,
  min,
  max,
  suffix,
  disabled,
  onChange,
}: NumberSettingProps) {
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  const displayed = focused ? text : String(value);
  const parsed = /^\d+$/.test(displayed) ? Number(displayed) : NaN;
  const current =
    Number.isInteger(parsed) && parsed >= min && parsed <= max ? parsed : value;
  const commit = (next: number) => {
    const bounded = Math.max(min, Math.min(max, next));
    setText(String(bounded));
    onChange(bounded);
  };
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <label
        htmlFor={title.replaceAll(" ", "-")}
        className="block text-sm font-medium"
      >
        {title}
      </label>
      <div className="flex min-h-12 overflow-hidden rounded-xl border border-[#d2d2d2] bg-white">
        <button
          type="button"
          aria-label={`Decrease ${title}`}
          disabled={disabled || current <= min}
          onClick={() => commit(current - 1)}
          className="flex w-11 shrink-0 items-center justify-center border-r border-[#d2d2d2] text-[#008577] focus-visible:outline-2 focus-visible:outline-[#008577] disabled:opacity-30"
        >
          <Minus size={18} />
        </button>
        <Input
          id={title.replaceAll(" ", "-")}
          type="text"
          inputMode="numeric"
          aria-label={`${title} in ${suffix}`}
          value={displayed}
          disabled={disabled}
          onFocus={() => {
            setText(String(value));
            setFocused(true);
          }}
          onChange={(event) => {
            const next = event.target.value;
            if (!/^\d{0,3}$/.test(next)) return;
            setText(next);
            const number = Number(next);
            if (next !== "" && number >= min && number <= max) onChange(number);
          }}
          onBlur={() => {
            commit(Number.isFinite(parsed) ? parsed : value);
            setFocused(false);
          }}
          className="h-11 min-w-0 flex-1 rounded-none border-0 text-center text-base shadow-none focus-visible:ring-0"
        />
        <button
          type="button"
          aria-label={`Increase ${title}`}
          disabled={disabled || current >= max}
          onClick={() => commit(current + 1)}
          className="flex w-11 shrink-0 items-center justify-center border-l border-[#d2d2d2] text-[#008577] focus-visible:outline-2 focus-visible:outline-[#008577] disabled:opacity-30"
        >
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}
