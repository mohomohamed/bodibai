"use client";

import { FileCheck2, FilePlus2, RefreshCw, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Recipient } from "@/lib/bondibai-data";

type CsvImportDialogProps = {
  rows: Recipient[] | null;
  currentCount: number;
  onClose: () => void;
  onConfirm: (mode: "append" | "replace") => void;
};

export function CsvImportDialog({ rows, currentCount, onClose, onConfirm }: CsvImportDialogProps) {
  if (!rows) return null;

  const portions = rows.reduce((total, row) => total + row.portions, 0);
  const withAddresses = rows.filter(row => row.address.trim()).length;
  const withDrivers = rows.filter(row => row.driver?.trim()).length;

  return (
    <Dialog open onOpenChange={open => !open && onClose()}>
      <DialogContent className="rounded-3xl sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-cyan-50 text-[#087e8b]">
              <FileCheck2 className="size-5" />
            </span>
            <div>
              <DialogTitle>Review CSV import</DialogTitle>
              <DialogDescription className="mt-1">
                The file is ready. Choose how it should be added to this device.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Import summary">
          {[
            ["Households", rows.length],
            ["Portions", portions],
            ["Addresses", withAddresses],
            ["Assigned", withDrivers],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
              <p className="mt-1 text-xl font-bold text-[#082f49]">{value}</p>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">
          <div className="flex gap-2">
            <TriangleAlert className="mt-0.5 size-4 shrink-0 text-amber-700" />
            <p>
              <strong>Replace current list</strong> removes the {currentCount} households currently stored in this browser. Export a backup first if needed.
            </p>
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onConfirm("replace")}
              className="border-amber-300 text-amber-900 hover:bg-amber-50"
            >
              <RefreshCw className="size-4" /> Replace current list
            </Button>
            <Button type="button" onClick={() => onConfirm("append")} className="bg-[#087e8b] hover:bg-[#076c77]">
              <FilePlus2 className="size-4" /> Add to current list
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
