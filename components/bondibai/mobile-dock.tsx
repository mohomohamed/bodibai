"use client";

import { Car, ListFilter, Plus, Search } from "lucide-react";

type MobileDockProps = {
  onAdd: () => void;
  onDrivers: () => void;
  onSearch: () => void;
  onFilters: () => void;
};

export function MobileDock({ onAdd, onDrivers, onSearch, onFilters }: MobileDockProps) {
  const actions = [
    { label: "Search", icon: Search, onClick: onSearch },
    { label: "Filters", icon: ListFilter, onClick: onFilters },
    { label: "Drivers", icon: Car, onClick: onDrivers },
  ];

  return (
    <nav className="mobile-dock md:hidden" aria-label="Quick actions">
      {actions.slice(0, 2).map(action => (
        <button key={action.label} type="button" onClick={action.onClick} className="mobile-dock-action">
          <action.icon className="size-5" />
          <span>{action.label}</span>
        </button>
      ))}
      <button type="button" onClick={onAdd} className="mobile-dock-primary" aria-label="Add household">
        <Plus className="size-6" />
      </button>
      {actions.slice(2).map(action => (
        <button key={action.label} type="button" onClick={action.onClick} className="mobile-dock-action">
          <action.icon className="size-5" />
          <span>{action.label}</span>
        </button>
      ))}
    </nav>
  );
}
