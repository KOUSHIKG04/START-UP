"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@startup/web-ui/components/ui/dialog";
import { AddDoctorCard } from "./AddDoctorCard";

interface AddDoctorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddDoctorDialog({ open, onOpenChange }: AddDoctorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[520px] p-0 overflow-hidden border-none bg-transparent shadow-2xl">
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
