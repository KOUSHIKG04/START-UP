"use client";

import { useAddDoctorAction } from "../hooks/useAddDoctorAction";

import { Plus } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";
import { AddDoctorDialog } from "./AddDoctorDialog";

export function AddDoctorAction() {
  const { isAddDoctorOpen, setIsAddDoctorOpen } = useAddDoctorAction();
  return (
    <>
      <AddDoctorDialog
        open={isAddDoctorOpen}
        onOpenChange={setIsAddDoctorOpen}
      />
      <Button
        onClick={() => setIsAddDoctorOpen(true)}
        className="bg-primary text-primary-foreground hover:bg-primary/90 flex cursor-pointer items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-bold shadow-xs transition-colors"
      >
        <span>Add new Doctor</span>
        <Plus className="size-4 stroke-2" />
      </Button>
    </>
  );
}
