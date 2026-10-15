"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@startup/web-ui/components/ui/button";
import { AddDoctorDialog } from "./AddDoctorDialog";

export function AddDoctorAction() {
  const [isAddDoctorOpen, setIsAddDoctorOpen] = useState(false);
  return (
    <>
      <AddDoctorDialog
        open={isAddDoctorOpen}
        onOpenChange={setIsAddDoctorOpen}
      />
      <Button
        onClick={() => setIsAddDoctorOpen(true)}
        className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-[#07595d] px-4 py-2 text-[12px] font-bold text-white shadow-xs transition-colors hover:bg-[#064e52]"
      >
        <span>Add new Doctor</span>
        <Plus className="size-4 stroke-[2.5]" />
      </Button>
    </>
  );
}
