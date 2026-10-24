"use client";

import type { AddDoctorDialogProps } from "../types/addDoctorDialog";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@startup/web-ui/components/ui/dialog";
import { AddDoctorCard } from "./AddDoctorCard";

export function AddDoctorDialog({ open, onOpenChange }: AddDoctorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] overflow-hidden border-none bg-transparent p-0 shadow-2xl">
        <DialogTitle className="sr-only">Add New Doctor</DialogTitle>
        <div className="flex justify-center p-2">
          <AddDoctorCard
            onSuccess={() => onOpenChange(false)}
            onViewAll={() => onOpenChange(false)}
            showOuterHeader={true}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
