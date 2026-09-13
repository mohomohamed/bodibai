"use client";

import { ListFilter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AREAS, STATUS_META, type RecipientStatus } from "@/lib/bondibai-data";

export type MobileFilterValues = {
  area: string;
  zone: string;
  group: string;
  driver: string;
  status: string;
  address: "all" | "has-address" | "missing-address";
};

type MobileFiltersDrawerProps = {
  open: boolean;
  values: MobileFilterValues;
  groups: string[];
  drivers: string[];
  zones: string[];
  resultCount: number;
  activeCount: number;
  onOpenChange: (open: boolean) => void;
  onChange: (field: keyof MobileFilterValues, value: string) => void;
  onReset: () => void;
};

function FilterField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><p className="mb-1.5 text-xs font-semibold text-slate-600">{label}</p>{children}</div>;
}

export function MobileFiltersDrawer({
  open,
  values,
  groups,
  drivers,
  zones,
  resultCount,
  activeCount,
  onOpenChange,
  onChange,
  onReset,
}: MobileFiltersDrawerProps) {
  const statuses = Object.keys(STATUS_META) as RecipientStatus[];

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[88vh] rounded-t-[28px]">
        <DrawerHeader className="border-b border-slate-100 text-left">
          <div className="flex items-center gap-2">
            <span className="grid size-9 place-items-center rounded-xl bg-cyan-50 text-[#087e8b]"><ListFilter className="size-4" /></span>
            <div>
              <DrawerTitle>Filter delivery list</DrawerTitle>
              <DrawerDescription>{resultCount} matching households · {activeCount} active filters</DrawerDescription>
            </div>
          </div>
        </DrawerHeader>

        <div className="grid gap-4 overflow-y-auto px-4 py-3">
          <div className="grid grid-cols-2 gap-3">
            <FilterField label="Island / area">
              <Select value={values.area} onValueChange={value => onChange("area", value)}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All areas">All areas</SelectItem>
                  {AREAS.map(area => <SelectItem key={area} value={area}>{area}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Sub-zone">
              <Select value={values.zone} onValueChange={value => onChange("zone", value)} disabled={!zones.length}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All zones">All zones</SelectItem>
                  {zones.map(zone => <SelectItem key={zone} value={zone}>{zone}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          <FilterField label="Recipient group">
            <Select value={values.group} onValueChange={value => onChange("group", value)}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="All groups">All groups</SelectItem>
                {groups.map(group => <SelectItem key={group} value={group}>{group}</SelectItem>)}
              </SelectContent>
            </Select>
          </FilterField>

          <div className="grid grid-cols-2 gap-3">
            <FilterField label="Driver">
              <Select value={values.driver} onValueChange={value => onChange("driver", value)}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All drivers">All drivers</SelectItem>
                  <SelectItem value="Unassigned">Unassigned</SelectItem>
                  {drivers.map(driver => <SelectItem key={driver} value={driver}>{driver}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
            <FilterField label="Delivery status">
              <Select value={values.status} onValueChange={value => onChange("status", value)}>
                <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="All statuses">All statuses</SelectItem>
                  {statuses.map(status => <SelectItem key={status} value={status}>{STATUS_META[status].label}</SelectItem>)}
                </SelectContent>
              </Select>
            </FilterField>
          </div>

          <FilterField label="Address readiness">
            <Select value={values.address} onValueChange={value => onChange("address", value)}>
              <SelectTrigger className="h-11 w-full rounded-xl"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All addresses</SelectItem>
                <SelectItem value="has-address">Has address</SelectItem>
                <SelectItem value="missing-address">Address needed</SelectItem>
              </SelectContent>
            </Select>
          </FilterField>
        </div>

        <DrawerFooter className="border-t border-slate-100 bg-white/95 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <DrawerClose asChild>
            <Button className="h-11 rounded-xl bg-[#087e8b] hover:bg-[#076c77]">Show {resultCount} households</Button>
          </DrawerClose>
          <Button type="button" variant="ghost" onClick={onReset} disabled={!activeCount} className="h-10 rounded-xl text-slate-600">
            <RotateCcw className="size-4" /> Reset filters
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
