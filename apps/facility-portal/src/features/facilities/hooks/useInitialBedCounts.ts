"use client";
import type { InitialBedCountsFormProps } from "../types/initialBedCountsForm";
import { useTransition } from "react";
import { toast } from "@startup/web-ui/components/ui/toast";
import {
  saveBedCounts,
  reloadBedCounts,
  BedSaveError,
} from "../client/bedInventory";
export function useInitialBedCounts({
  row,
  onSaved,
}: InitialBedCountsFormProps) {
  const [pending, startTransition] = useTransition();

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    form.set("facilityId", row.facilityId);
    form.set("bedTypeId", row.bedTypeId);
    form.set("expectedRowVersion", "0");
    startTransition(async () => {
      try {
        onSaved(await saveBedCounts(form));
        toast.add({ title: "Bed counts saved", type: "success" });
      } catch (error) {
        if (error instanceof BedSaveError && error.code === "PT409") {
          try {
            (await reloadBedCounts(row.facilityId)).forEach(onSaved);
          } catch {
            /* Keep last confirmed counts. */
          }
        }
        toast.add({
          title: "Could not save bed counts",
          description:
            error instanceof Error
              ? error.message
              : "Check your connection and try again.",
          type: "error",
        });
      }
    });
  }

  return { pending, submit };
}
