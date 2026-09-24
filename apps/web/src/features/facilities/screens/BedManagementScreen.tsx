"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BedDouble, Check, Wrench } from "lucide-react";
import type { BedInventoryProjection, InventoryFacility } from "@startup/contracts";
import { Button } from "@startup/web-ui/components/ui/button";
import { Input } from "@startup/web-ui/components/ui/input";
import { saveBedInventory } from "../server/actions";

interface Props {
  facilities: InventoryFacility[];
  selectedFacilityId: string | null;
  inventory: BedInventoryProjection[];
  loadError?: string;
  signOutAction: () => Promise<void>;
}

export default function BedManagementScreen({ facilities, selectedFacilityId, inventory, loadError, signOutAction }: Props) {
  const router = useRouter();
  const selected = facilities.find((item) => item.facilityId === selectedFacilityId);
  const totals = inventory.reduce(
    (sum, row) => ({
      total: sum.total + row.total,
      available: sum.available + row.available,
      occupied: sum.occupied + row.occupied,
      maintenance: sum.maintenance + row.maintenance,
    }),
    { total: 0, available: 0, occupied: 0, maintenance: 0 }
  );

  return (
    <div className="flex flex-col gap-6 pb-12 text-foreground">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bed management</h1>
          <p className="mt-1 text-sm text-muted-foreground">Aggregate counts reported by each facility, by bed type.</p>
        </div>
        <form action={signOutAction}><Button type="submit" variant="outline">Sign out</Button></form>
      </header>

      {loadError ? (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-card p-5">
          <p className="font-semibold">Could not load inventory</p>
          <p className="mt-1 text-sm text-muted-foreground">{loadError}</p>
          <Button type="button" variant="outline" className="mt-4" onClick={() => router.refresh()}>Try again</Button>
        </div>
      ) : facilities.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-6">
          <h2 className="font-semibold">No facility access yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Your account needs an active hospital or clinic membership before inventory appears.</p>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <label className="flex min-w-64 flex-col gap-2 text-sm font-medium">
              Facility
              <select
                value={selectedFacilityId ?? ""}
                onChange={(event) => router.push(`/bed-management?facility=${encodeURIComponent(event.target.value)}`)}
                className="h-10 rounded-md border border-input bg-background px-3 text-foreground focus-visible:outline-2 focus-visible:outline-ring"
              >
                {facilities.map((facility) => <option key={facility.facilityId} value={facility.facilityId}>{facility.facilityName}</option>)}
              </select>
            </label>
            <p className="text-sm text-muted-foreground">{selected?.facilityKind === "clinic" ? "Clinic" : "Hospital"} · Availability = total − occupied − maintenance</p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Inventory summary">
            <Summary label="Total beds" value={totals.total} icon={<BedDouble className="size-5" />} />
            <Summary label="Available" value={totals.available} icon={<Check className="size-5" />} />
            <Summary label="Occupied" value={totals.occupied} icon={<BedDouble className="size-5" />} />
            <Summary label="Maintenance" value={totals.maintenance} icon={<Wrench className="size-5" />} />
          </div>

          <section aria-labelledby="inventory-heading" className="rounded-xl border border-border bg-card p-4 sm:p-6">
            <h2 id="inventory-heading" className="text-lg font-semibold">Bed availability by type</h2>
            <p className="mt-1 text-sm text-muted-foreground">Update counts for {selected?.facilityName}. Changes are saved to the shared database.</p>
            <div className="mt-5 grid gap-3">
              {inventory.length === 0 && <p className="py-4 text-sm text-muted-foreground">No bed types are available for this facility.</p>}
              {inventory.map((row) => <BedRow key={`${row.bedTypeId}:${row.rowVersion ?? "new"}`} row={row} />)}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function Summary({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  return <div className="flex items-center justify-between rounded-xl border border-border bg-card p-4">
    <div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString()}</p></div>
    <div className="text-primary" aria-hidden="true">{icon}</div>
  </div>;
}

function BedRow({ row }: { row: BedInventoryProjection }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const observed = row.observedAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(row.observedAt))
    : null;

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const data = new FormData(event.currentTarget);
    startTransition(async () => {
      try {
        const result = await saveBedInventory(data);
        if (result.error) setError(result.error);
        else { setSaved(true); router.refresh(); }
      } catch {
        setError("Could not reach the portal. Try again when the connection returns.");
      }
    });
  }

  return <form onSubmit={handleSubmit} className="rounded-lg border border-border bg-background p-4">
    <input type="hidden" name="facilityId" value={row.facilityId} />
    <input type="hidden" name="bedTypeId" value={row.bedTypeId} />
    <input type="hidden" name="expectedRowVersion" value={row.rowVersion ?? "0"} />
    <div className="flex flex-wrap items-start justify-between gap-2">
      <div>
        <h3 className="font-semibold">{row.bedTypeName}</h3>
        <p className="text-sm text-muted-foreground">{row.configured ? `Last updated ${observed}` : "Not configured yet"}</p>
      </div>
      <p className="text-sm font-medium tabular-nums text-primary">{row.available} available</p>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
      <BedInput label="Total" name="total" value={row.total} />
      <BedInput label="Occupied" name="occupied" value={row.occupied} />
      <BedInput label="Maintenance" name="maintenance" value={row.maintenance} />
      <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save counts"}</Button>
    </div>
    {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    {saved && <p role="status" className="mt-3 text-sm text-primary">Saved. Refreshing inventory…</p>}
  </form>;
}

function BedInput({ label, name, value }: { label: string; name: string; value: number }) {
  return <label className="flex flex-col gap-1.5 text-sm font-medium">{label}
    <Input name={name} type="number" min="0" max="2147483647" step="1" defaultValue={value} required className="tabular-nums" />
  </label>;
}
