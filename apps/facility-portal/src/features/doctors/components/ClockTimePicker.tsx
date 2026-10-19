"use client";
import { clockTimePickerOptions } from "../utils/clockTimePickerConstants";

import type { ClockTimePickerProps } from "../types/clockTimePicker";

import { useId, useState } from "react";
import { Clock3 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@startup/web-ui/components/ui/dialog";
import { Button } from "@startup/web-ui/components/ui/button";

const center = 130;
const radius = 98;
const pad = (n: number) => String(n).padStart(2, "0");
function display(value: string) {
  if (!value) return "Select time";
  if (value === "24:00") return "12:00 AM";
  const [h, m] = value.split(":").map(Number);
  return `${h % 12 || 12}:${pad(m)} ${h >= 12 ? "PM" : "AM"}`;
}
export function ClockTimePicker({
  label,
  value,
  onChange,
  disabled = false,
  endOfDay = false,
}: ClockTimePickerProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [hour, setHour] = useState(9);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState<"AM" | "PM">("AM");
  const [part, setPart] = useState<"hour" | "minute">("hour");
  const selected = part === "hour" ? hour % 12 : minute / 5;
  const angle = (selected * Math.PI) / 6;
  const tipX = center + Math.sin(angle) * radius;
  const tipY = center - Math.cos(angle) * radius;
  const choosePoint = (x: number, y: number) => {
    if (Math.hypot(x - center, y - center) < 24) return;
    const turn =
      (Math.atan2(x - center, center - y) + Math.PI * 2) % (Math.PI * 2);
    if (part === "hour")
      setHour(Math.round((turn * 12) / (Math.PI * 2)) % 12 || 12);
    else setMinute(Math.round((turn * 60) / (Math.PI * 2)) % 60);
  };
  const adjust = (delta: number) => {
    if (part === "hour")
      setHour((current) => ((current - 1 + delta + 12) % 12) + 1);
    else setMinute((current) => (current + delta + 60) % 60);
  };
  const choice =
    "min-h-11 rounded-lg px-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577]";
  return (
    <div className="w-full min-w-0 space-y-2">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <button
        id={id}
        type="button"
        disabled={disabled}
        aria-label={`${label}, ${display(value)}`}
        aria-haspopup="dialog"
        className="flex min-h-12 w-full items-center justify-between gap-2 rounded-lg border border-[#e2e8f0] bg-white px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577] disabled:opacity-50"
        onClick={() => {
          const [h, m] = (value || "09:00").split(":").map(Number);
          setHour(h % 12 || 12);
          setMinute(m);
          setPeriod(h >= 12 && h < 24 ? "PM" : "AM");
          setPart("hour");
          setOpen(true);
        }}
      >
        <span className="min-w-0 truncate">{display(value)}</span>
        <Clock3 size={18} className="shrink-0 text-[#008577]" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white text-[#0f172a] sm:max-w-sm">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription>
            Choose an hour, then a minute on the clock.
          </DialogDescription>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              aria-label="Select hour"
              aria-pressed={part === "hour"}
              onClick={() => setPart("hour")}
              className={`${choice} min-w-16 py-2 text-4xl font-normal ${part === "hour" ? "bg-[#e6f5f4] text-[#008577]" : "text-[#0f172a]"}`}
            >
              {pad(hour)}
            </button>
            <span className="text-4xl">:</span>
            <button
              type="button"
              aria-label="Select minute"
              aria-pressed={part === "minute"}
              onClick={() => setPart("minute")}
              className={`${choice} min-w-16 py-2 text-4xl font-normal ${part === "minute" ? "bg-[#e6f5f4] text-[#008577]" : "text-[#0f172a]"}`}
            >
              {pad(minute)}
            </button>
            <div className="grid gap-1">
              {clockTimePickerOptions.map((item) => (
                <button
                  type="button"
                  key={item}
                  aria-pressed={period === item}
                  onClick={() => setPeriod(item)}
                  className={`${choice} border ${period === item ? "border-[#008577] bg-[#008577] text-white" : "border-[#e2e8f0] bg-white"}`}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div
            role="slider"
            tabIndex={0}
            aria-label={`Select ${part}`}
            aria-valuemin={part === "hour" ? 1 : 0}
            aria-valuemax={part === "hour" ? 12 : 59}
            aria-valuenow={part === "hour" ? hour : minute}
            aria-valuetext={
              part === "hour" ? `${hour} ${period}` : `${minute} minutes`
            }
            className="relative mx-auto aspect-square w-[260px] max-w-full touch-none rounded-full bg-[#f1f6f5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#008577]"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              const rect = event.currentTarget.getBoundingClientRect();
              choosePoint(
                ((event.clientX - rect.left) * 260) / rect.width,
                ((event.clientY - rect.top) * 260) / rect.height
              );
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId))
                return;
              const rect = event.currentTarget.getBoundingClientRect();
              choosePoint(
                ((event.clientX - rect.left) * 260) / rect.width,
                ((event.clientY - rect.top) * 260) / rect.height
              );
            }}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              if (part === "hour") setPart("minute");
            }}
            onKeyDown={(event) => {
              if (
                ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(
                  event.key
                )
              ) {
                event.preventDefault();
                adjust(["ArrowUp", "ArrowRight"].includes(event.key) ? 1 : -1);
              }
              if (event.key === "Enter") {
                event.preventDefault();
                setPart(part === "hour" ? "minute" : "hour");
              }
            }}
          >
            <svg
              viewBox="0 0 260 260"
              className="pointer-events-none absolute inset-0 h-full w-full"
              aria-hidden="true"
            >
              <line
                x1={center}
                y1={center}
                x2={tipX}
                y2={tipY}
                stroke="#008577"
                strokeWidth="2"
              />
              <circle cx={center} cy={center} r="4" fill="#008577" />
              <circle cx={tipX} cy={tipY} r="22" fill="#008577" />
              {Array.from({ length: 12 }, (_, i) => {
                const a = (i * Math.PI) / 6;
                if (
                  Math.hypot(
                    center + Math.sin(a) * radius - tipX,
                    center - Math.cos(a) * radius - tipY
                  ) < 36
                )
                  return null;
                return (
                  <text
                    key={i}
                    x={center + Math.sin(a) * radius}
                    y={center - Math.cos(a) * radius}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="17"
                    fill="#0f172a"
                  >
                    {part === "hour" ? i || 12 : pad(i * 5)}
                  </text>
                );
              })}
              <text
                x={tipX}
                y={tipY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize="17"
                fill="#ffffff"
              >
                {part === "hour" ? hour : pad(minute)}
              </text>
            </svg>
          </div>
          <p className="text-center text-xs text-[#475569]">
            Drag the clock hand or use the arrow keys for precise minutes.
          </p>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => {
                const time = `${pad((hour % 12) + (period === "PM" ? 12 : 0))}:${pad(minute)}`;
                onChange(endOfDay && time === "00:00" ? "24:00" : time);
                setOpen(false);
              }}
            >
              Set time
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
