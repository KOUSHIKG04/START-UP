"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BedInventoryProjection } from "@startup/contracts";
import { saveBedInventory } from "../server/actions";

export function InitialBedCountsForm({ row }: { row: BedInventoryProjection }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("facilityId", row.facilityId);
    form.set("bedTypeId", row.bedTypeId);
    form.set("expectedRowVersion", "0");
    setError("");
    startTransition(async () => {
      try {
        const result = await saveBedInventory(form);
        if (result.error) setError(result.error);
        else router.refresh();
      } catch {
        setError("Could not save the counts. Refresh and try again.");
      }
    });
  }

  return <form onSubmit={submit} className="flex flex-wrap items-end gap-2 py-1 text-sm">
    {(["total", "occupied", "maintenance"] as const).map(name => <label key={name} className="flex flex-col gap-1 capitalize">
      {name}
      <input name={name} type="number" min={name === "total" ? 1 : 0} step={1} required
        className="w-20 rounded-md border border-[#cbd5e1] px-2 py-1 text-[#0f172a]" />
    </label>)}
    <button type="submit" disabled={pending} className="rounded-md bg-primary px-3 py-1.5 font-semibold text-primary-foreground disabled:opacity-50">
      {pending ? "Saving…" : "Set initial counts"}
    </button>
    {error && <span role="alert" className="text-red-600">{error}</span>}
  </form>;
}
