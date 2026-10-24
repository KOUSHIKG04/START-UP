"use client";

import type { UnavailableDatePickerProps } from "../types/unavailableDatePicker";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export function UnavailableDatePicker({
  value,
  onChange,
  timeZone,
  disabled,
  minDate,
  label = "Select date",
}: UnavailableDatePickerProps) {
  const today = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const firstDay = minDate ?? today;
  const [month, setMonth] = useState(value.slice(0, 7) || today.slice(0, 7));
  const dateRow = useRef<HTMLDivElement>(null);
  function scrollDates(direction: number) {
    const row = dateRow.current;
    if (row)
      row.scrollBy({
        left: direction * Math.max(64, row.clientWidth - 64),
        behavior: "smooth",
      });
  }
  const [year, m] = today.split("-").map(Number);
  const options = Array.from({ length: 13 }, (_, i) => {
    const date = new Date(year, m - 1 + i, 1);
    return {
      value: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`,
      label: date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    };
  }).filter((option) => option.value >= firstDay.slice(0, 7));
  const [y, n] = month.split("-").map(Number);
  const max = new Date(`${today}T12:00:00Z`);
  max.setUTCFullYear(max.getUTCFullYear() + 1);
  return (
    <div className="w-full max-w-full min-w-0 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="text-[16px] font-medium">{label}</span>
        <select
          aria-label={`${label} month`}
          disabled={disabled}
          value={month}
          className="min-h-11 w-full max-w-full min-w-0 rounded-md border border-[#e2e8f0] bg-white px-3 text-sm focus-visible:outline-2 focus-visible:outline-[#008577] sm:w-48"
          onChange={(e) => {
            setMonth(e.target.value);
            onChange(
              e.target.value === firstDay.slice(0, 7)
                ? firstDay
                : `${e.target.value}-01`
            );
          }}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex min-w-0 items-center gap-1">
        <button
          type="button"
          aria-label="Previous dates"
          onClick={() => scrollDates(-1)}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-[#008577] hover:bg-slate-100 focus-visible:outline-2"
        >
          <ChevronLeft className="size-5" />
        </button>
        <div
          ref={dateRow}
          className="flex min-w-0 flex-1 gap-2 overflow-x-auto pb-2"
          role="group"
          aria-label={label}
        >
          {Array.from({ length: new Date(y, n, 0).getDate() }, (_, i) => {
            const date = `${month}-${String(i + 1).padStart(2, "0")}`;
            const closed =
              disabled ||
              date < firstDay ||
              date > max.toISOString().slice(0, 10);
            return (
              <button
                type="button"
                key={date}
                aria-label={date}
                aria-pressed={date === value}
                disabled={closed}
                onClick={() => onChange(date)}
                className={`flex h-16 w-14 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577] disabled:opacity-40 ${date === value ? "border-[#008577] bg-[#008577] text-white" : "border-[#e2e8f0] bg-white text-[#0f172a]"}`}
              >
                <span className="text-lg font-semibold">{i + 1}</span>
                <span className="text-xs">
                  {new Date(`${date}T12:00:00`).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          aria-label="Next dates"
          onClick={() => scrollDates(1)}
          className="flex size-9 shrink-0 items-center justify-center rounded-md text-[#008577] hover:bg-slate-100 focus-visible:outline-2"
        >
          <ChevronRight className="size-5" />
        </button>
      </div>
    </div>
  );
}
