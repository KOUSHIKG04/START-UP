"use client";
import type { ToggleSettingProps } from "../types/toggleSetting";

export function ToggleSetting({
  title,
  checked,
  disabled,
  onChange,
}: ToggleSettingProps) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-4 text-sm text-[#0f172a]">
      <span>{title}</span>
      <input
        type="checkbox"
        role="switch"
        aria-label={title}
        checked={checked}
        disabled={disabled}
        onChange={(event) => onChange(event.target.checked)}
        className="relative h-7 w-12 shrink-0 cursor-pointer appearance-none rounded-full bg-[#d1d5db] transition-colors after:absolute after:top-1 after:left-1 after:size-5 after:rounded-full after:bg-white after:shadow-sm after:transition-transform checked:bg-[#008577] checked:after:translate-x-5 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577] disabled:cursor-not-allowed disabled:opacity-50"
      />
    </label>
  );
}
