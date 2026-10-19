"use client";
import type { HelpDialogProps } from "../types/helpDialog";

import { Button } from "@startup/web-ui/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@startup/web-ui/components/ui/dialog";
export function HelpDialog({
  open,
  title,
  children,
  onClose,
}: HelpDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value: boolean) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="bg-white text-[#0f172a] sm:max-w-sm">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription asChild>
          <div className="space-y-3 text-sm text-[#475569]">{children}</div>
        </DialogDescription>
        <Button type="button" onClick={onClose}>
          Got it
        </Button>
      </DialogContent>
    </Dialog>
  );
}
