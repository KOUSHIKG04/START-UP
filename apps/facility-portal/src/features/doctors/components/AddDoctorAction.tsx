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
        className="bg-[#07595d] hover:bg-[#064e52] text-white text-[12px] font-bold px-4 py-2 rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
      >
        <span>Add new Doctor</span>
        <Plus className="size-4 stroke-[2.5]" />
      </Button>
    </>
  );
}
