"use client";
import { useEffect, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "@startup/web-ui/components/ui/toast";

export function BedCountStepper({
  label,
  value,
  max,
  disabled,
  onCommit,
}: {
  label: string;
  value: number;
  max: number;
  disabled: boolean;
  onCommit: (value: number) => void;
}) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => {
    if (!disabled) setDraft(String(value));
  }, [value, disabled]);
  const parsed = /^\d+$/.test(draft) ? Number(draft) : NaN;
  function commit(next = parsed) {
    if (!Number.isSafeInteger(next) || next < 0 || next > max) {
      toast.add({
        title: "Invalid bed count",
        description: `Enter a whole number from 0 to ${max}.`,
        type: "error",
      });
      setDraft(String(value));
      return;
    }
    setDraft(String(next));
    onCommit(next);
  }
  return (
    <div
      className="inline-flex items-center overflow-hidden rounded-md border border-[#cbd5e1] bg-white shadow-2xs"
      aria-busy={disabled}
    >
      <button
        type="button"
        aria-label={`Decrease ${label}`}
        disabled={disabled || (Number.isFinite(parsed) ? parsed : value) <= 0}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => commit((Number.isFinite(parsed) ? parsed : value) - 1)}
        className="border-r border-[#cbd5e1] px-2 py-1 text-[#64748b] transition-colors hover:bg-slate-100 hover:text-[#0f172a] disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronDown className="size-3.5" />
      </button>
      <input
        type="number"
        inputMode="numeric"
        aria-label={label}
        min={0}
        max={max}
        step={1}
        value={draft}
        disabled={disabled}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            commit();
          }
          if (event.key === "Escape") setDraft(String(value));
        }}
        className="focus-visible:ring-primary w-14 appearance-none bg-transparent py-1 text-center text-[13px] font-semibold text-[#0f172a] outline-none focus-visible:ring-2 focus-visible:ring-inset disabled:opacity-60 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        aria-label={`Increase ${label}`}
        disabled={disabled || (Number.isFinite(parsed) ? parsed : value) >= max}
        onPointerDown={(event) => event.preventDefault()}
        onClick={() => commit((Number.isFinite(parsed) ? parsed : value) + 1)}
        className="border-l border-[#cbd5e1] px-2 py-1 text-[#64748b] transition-colors hover:bg-slate-100 hover:text-[#0f172a] disabled:pointer-events-none disabled:opacity-30"
      >
        <ChevronUp className="size-3.5" />
      </button>
    </div>
  );
}
