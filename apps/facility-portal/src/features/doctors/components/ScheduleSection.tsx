"use client";
import type { ScheduleSectionProps } from "../types/scheduleSection";

import { card } from "../utils/facilityScheduleEditorConstants";
export function ScheduleSection({ title, children }: ScheduleSectionProps) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold text-[#0f172a]">{title}</h2>
      <div className={card}>{children}</div>
    </section>
  );
}
