"use client";

import { useTransition } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import { useRouter } from "next/navigation";
import type { BedInventoryProjection } from "@startup/contracts";
import { saveBedInventory } from "../server/actions";

export function InitialBedCountsForm({ row }: { row: BedInventoryProjection }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("facilityId", row.facilityId);
    form.set("bedTypeId", row.bedTypeId);
    form.set("expectedRowVersion", "0");
    startTransition(async () => {
      try {
        const result = await saveBedInventory(form);
        if (result.error) toast.add({ title: "Could not save bed counts", description: result.error, type: "error" });
        else { toast.add({ title: "Bed counts saved", type: "success" }); router.refresh(); }
      } catch {
        toast.add({ title: "Could not save bed counts", description: "Check your connection and try again.", type: "error" });
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
  </form>;
}
