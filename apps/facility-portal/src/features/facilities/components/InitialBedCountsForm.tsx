"use client";

import { initialBedCountsFormOptions } from "../utils/initialBedCountsFormConstants";

import { useInitialBedCounts } from "../hooks/useInitialBedCounts";

import type { InitialBedCountsFormProps } from "../types/initialBedCountsForm";

export function InitialBedCountsForm({
  row,
  onSaved,
}: InitialBedCountsFormProps) {
  const { pending, submit } = useInitialBedCounts({ row, onSaved });
  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-2 py-1 text-sm"
    >
      {initialBedCountsFormOptions.map((name) => (
        <label key={name} className="flex flex-col gap-1 capitalize">
          {name}
          <input
            name={name}
            type="number"
            min={name === "total" ? 1 : 0}
            step={1}
            required
            className="w-20 rounded-md border border-[#cbd5e1] px-2 py-1 text-[#0f172a]"
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={pending}
        className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 font-semibold disabled:opacity-50"
      >
        {pending ? "Saving…" : "Set initial counts"}
      </button>
    </form>
  );
}
