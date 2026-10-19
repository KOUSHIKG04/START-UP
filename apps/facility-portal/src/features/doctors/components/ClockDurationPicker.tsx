"use client";
import type { ClockDurationPickerProps } from "../types/clockDurationPicker";

import { useState } from "react";
import { Clock3 } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@startup/web-ui/components/ui/dialog";

const size = 260;
const center = size / 2;
const radius = center - 32;

export function ClockDurationPicker({
  label,
  value,
  min,
  max,
  disabled = false,
  onChange,
}: ClockDurationPickerProps) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState(value);
  const clamp = (minutes: number) => Math.max(min, Math.min(max, minutes));
  const angle = ((selected % max) / max) * Math.PI * 2;
  const tipX = center + Math.sin(angle) * radius;
  const tipY = center - Math.cos(angle) * radius;
  const choosePoint = (x: number, y: number) => {
    if (Math.hypot(x - center, y - center) < 24) return;
    const turn =
      (Math.atan2(x - center, center - y) + Math.PI * 2) % (Math.PI * 2);
    setSelected(clamp(Math.round((turn * max) / (Math.PI * 2)) || max));
  };
  const step = max > 60 ? 10 : 5;
  return (
    <div className="min-w-0 flex-1 space-y-2">
      <label className="block text-sm font-medium">{label}</label>
      <button
        type="button"
        disabled={disabled}
        aria-label={`${label}, ${value} minutes`}
        aria-haspopup="dialog"
        className="flex min-h-12 w-full items-center justify-between gap-2 rounded-xl border border-[#d2d2d2] bg-white px-3 text-left text-sm focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#008577] disabled:opacity-50"
        onClick={() => {
          setSelected(clamp(value));
          setOpen(true);
        }}
      >
        <span>{value} minutes</span>
        <Clock3 size={18} className="shrink-0 text-[#008577]" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto bg-white text-[#0f172a] sm:max-w-sm">
          <DialogTitle>{label}</DialogTitle>
          <DialogDescription className="sr-only">
            Choose {min} to {max} minutes on the clock.
          </DialogDescription>
          <p className="text-center text-3xl text-[#008577]">{selected} min</p>
          <div
            role="slider"
            tabIndex={0}
            aria-label={`${label} in minutes`}
            aria-valuemin={min}
            aria-valuemax={max}
            aria-valuenow={selected}
            aria-valuetext={`${selected} minutes`}
            className="relative mx-auto aspect-square w-[260px] max-w-full touch-none rounded-full bg-[#f1f6f5] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#008577]"
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              const rect = event.currentTarget.getBoundingClientRect();
              choosePoint(
                ((event.clientX - rect.left) * size) / rect.width,
                ((event.clientY - rect.top) * size) / rect.height
              );
            }}
            onPointerMove={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId))
                return;
              const rect = event.currentTarget.getBoundingClientRect();
              choosePoint(
                ((event.clientX - rect.left) * size) / rect.width,
                ((event.clientY - rect.top) * size) / rect.height
              );
            }}
            onPointerUp={(event) =>
              event.currentTarget.releasePointerCapture(event.pointerId)
            }
            onKeyDown={(event) => {
              if (
                ["ArrowUp", "ArrowRight", "ArrowDown", "ArrowLeft"].includes(
                  event.key
                )
              ) {
                event.preventDefault();
                setSelected((current) =>
                  clamp(
                    current +
                      (["ArrowUp", "ArrowRight"].includes(event.key) ? 5 : -5)
                  )
                );
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
              {Array.from({ length: Math.ceil(max / step) }, (_, index) => {
                const tick = index === 0 ? max : index * step;
                if (tick < min) return null;
                const tickAngle = (tick / max) * Math.PI * 2;
                const x = center + Math.sin(tickAngle) * radius;
                const y = center - Math.cos(tickAngle) * radius;
                if (Math.hypot(x - tipX, y - tipY) < 36) return null;
                return (
                  <text
                    key={index}
                    x={x}
                    y={y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize="16"
                    fill="#0f172a"
                  >
                    {tick}
                  </text>
                );
              })}
              <text
                x={tipX}
                y={tipY}
                textAnchor="middle"
                dominantBaseline="central"
                fontSize={selected >= 100 ? 14 : 17}
                fill="white"
              >
                {selected}
              </text>
            </svg>
          </div>
          <p className="text-center text-xs text-[#475569]">
            Choose {min}–{max} minutes on the clock
          </p>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={selected <= min}
              onClick={() => setSelected((current) => clamp(current - 5))}
            >
              −5 min
            </Button>
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={selected >= max}
              onClick={() => setSelected((current) => clamp(current + 5))}
            >
              +5 min
            </Button>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1"
              onClick={() => {
                onChange(selected);
                setOpen(false);
              }}
            >
              Set duration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
