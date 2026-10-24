"use client";

import type { Slot } from "../types/newAppointmentDialog";

export function slotLabel(slot: Slot) {
  const date = new Intl.DateTimeFormat("en-IN", {
    timeZone: slot.timezone,
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(slot.startsAt));
  return `${date} · ${slot.currency} ${(Number(slot.feeMinor) / 100).toFixed(2)}`;
}
