"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type ListPaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
};

export function ListPagination({ page, pageSize, total, onPageChange, onPageSizeChange }: ListPaginationProps) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(page, pages);
  const first = total ? (safePage - 1) * pageSize + 1 : 0;
  const last = Math.min(safePage * pageSize, total);

  return (
    <div className="flex flex-col gap-2 border-t bg-slate-50/75 px-4 py-3 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
      <p aria-live="polite">Showing {first}–{last} of {total}</p>
      <div className="flex items-center justify-between gap-2 sm:justify-end">
        <Select value={String(pageSize)} onValueChange={value => onPageSizeChange(Number(value))}>
          <SelectTrigger className="h-9 w-[105px] rounded-xl bg-white text-xs" aria-label="Rows per page"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[25, 50, 100].map(size => <SelectItem key={size} value={String(size)}>{size} per page</SelectItem>)}
          </SelectContent>
        </Select>
        <span className="min-w-20 text-center text-xs font-medium">Page {safePage} of {pages}</span>
        <Button type="button" variant="outline" size="icon-sm" onClick={() => onPageChange(safePage - 1)} disabled={safePage === 1} aria-label="Previous page"><ChevronLeft /></Button>
        <Button type="button" variant="outline" size="icon-sm" onClick={() => onPageChange(safePage + 1)} disabled={safePage === pages} aria-label="Next page"><ChevronRight /></Button>
      </div>
    </div>
  );
}
