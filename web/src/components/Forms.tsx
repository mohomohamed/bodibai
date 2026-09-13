import { useState, type FormEvent } from "react";
import { Compass, MapPin } from "lucide-react";
import {
  MALDIVES_PRESETS,
  type Address,
  type AddressInput,
  type Driver,
  type DriverInput,
  type RecordInput,
  type RecordItem,
} from "../types";
import { MapModal, type MapModalTarget } from "./MapModal";

const input = (form: FormData, key: string) => String(form.get(key) || "").trim();

export function RecordForm({ record, drivers, groups = [], onSave, onCancel }: {
  record?: RecordItem;
  drivers: Driver[];
  groups?: string[];
  onSave: (value: RecordInput, addressLine1?: string) => Promise<void>;
  onCancel: () => void;
}) {
  const existingPrimary = record?.addresses.find((item) => item.isPrimary) || record?.addresses[0];
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addressLine, setAddressLine] = useState(existingPrimary?.addressLine1 || "");
  const [area, setArea] = useState(record?.area || existingPrimary?.islandCity || "Malé");
  const [mapTarget, setMapTarget] = useState<MapModalTarget | null>(null);

  const applyPreset = (prefix: string, island: string) => {
    setAddressLine((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return prefix;
      if (trimmed.startsWith(prefix.trim())) return trimmed;
      return `${prefix}${trimmed}`;
    });
    setArea(island);
  };

  const openMapSearch = () => {
    const query = addressLine.trim() || area.trim() || record?.name || "Malé";
    setMapTarget({
      title: record?.name || "New Household",
      address: query,
      area: area || "Malé",
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: record?.id || crypto.randomUUID(),
        name: input(data, "name"),
        phone: input(data, "phone"),
        email: input(data, "email"),
        category: input(data, "category"),
        groupName: input(data, "groupName"),
        area: area || input(data, "area"),
        portions: Math.max(1, Number(input(data, "portions")) || 1),
        deliveryStatus: input(data, "deliveryStatus") || "planned",
        driverId: input(data, "driverId"),
        status: input(data, "status") || "active",
        notes: input(data, "notes"),
      }, addressLine.trim());
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save record.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-stack">
      <div className="field">
        <label htmlFor="record-name">Name <span>*</span></label>
        <input id="record-name" name="name" defaultValue={record?.name} placeholder="e.g. Ahmed Naseer" required autoFocus />
      </div>

      <div className="address-quick-box card-subtle">
        <div className="address-quick-header">
          <label htmlFor="record-address">
            <MapPin size={15} /> Primary Address & Building
          </label>
          <button
            type="button"
            className="button secondary compact map-search-btn"
            onClick={openMapSearch}
            title="Preview location on Google Maps"
          >
            <Compass size={14} /> Preview on Maps
          </button>
        </div>

        <input
          id="record-address"
          name="addressLine1"
          value={addressLine}
          onChange={(e) => setAddressLine(e.target.value)}
          placeholder="e.g. H. Meenaaz / Hiyaa Flat H7 / Vinares V3"
        />

        <div className="preset-chips-container">
          <span className="preset-label">Quick Presets:</span>
          <div className="preset-chips">
            {MALDIVES_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="preset-chip"
                onClick={() => applyPreset(p.prefix, p.island)}
                title={`Add ${p.desc}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="record-phone">Phone</label>
          <input id="record-phone" name="phone" type="tel" placeholder="7xxxxxx / 9xxxxxx" defaultValue={record?.phone} />
        </div>
        <div className="field">
          <label htmlFor="record-area">Area / Island</label>
          <select id="record-area" name="area" value={area} onChange={(e) => setArea(e.target.value)}>
            <option value="Malé">Malé</option>
            <option value="Hulhumalé">Hulhumalé</option>
            <option value="Villimalé">Villimalé</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="record-group">Group / Family</label>
          <select id="record-group" name="groupName" defaultValue={record?.groupName || (groups.length ? groups[0] : "")}>
            <option value="">No Group (General)</option>
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
            {record?.groupName && !groups.includes(record.groupName) && (
              <option value={record.groupName}>{record.groupName} (Legacy)</option>
            )}
          </select>
        </div>
        <div className="field">
          <label htmlFor="record-portions">Portions</label>
          <input id="record-portions" name="portions" type="number" min="1" defaultValue={record?.portions || 1} />
        </div>
        <div className="field">
          <label htmlFor="record-delivery">Delivery Status</label>
          <select id="record-delivery" name="deliveryStatus" defaultValue={record?.deliveryStatus || "planned"}>
            <option value="planned">Planned</option>
            <option value="prepared">Prepared</option>
            <option value="out-for-delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
            <option value="paused">Paused</option>
          </select>
        </div>
        <div className="field">
          <label htmlFor="record-driver">Assigned Driver</label>
          <select id="record-driver" name="driverId" defaultValue={record?.driverId || ""}>
            <option value="">Unassigned</option>
            {drivers.filter((driver) => driver.active).map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.name}{driver.vehicle ? ` (${driver.vehicle})` : ""}{driver.area ? ` · ${driver.area}` : ""}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="record-category">Category</label>
          <input id="record-category" name="category" placeholder="Optional category" defaultValue={record?.category} />
        </div>
        <div className="field">
          <label htmlFor="record-status">Record Status</label>
          <select id="record-status" name="status" defaultValue={record?.status || "active"}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="paused">Paused</option>
          </select>
        </div>
      </div>

      <div className="field">
        <label htmlFor="record-notes">Notes</label>
        <textarea id="record-notes" name="notes" rows={3} placeholder="Special delivery instructions, gate code, floor number…" defaultValue={record?.notes} />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button className="button primary" disabled={saving}>
          {saving ? "Saving…" : record ? "Save changes" : "Add household record"}
        </button>
      </div>

      {mapTarget && (
        <MapModal
          target={mapTarget}
          onClose={() => setMapTarget(null)}
        />
      )}
    </form>
  );
}

export function AddressForm({ recordId, address, onSave, onCancel }: {
  recordId: string;
  address?: Address;
  onSave: (value: AddressInput) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [addressLine1, setAddressLine1] = useState(address?.addressLine1 || "");
  const [islandCity, setIslandCity] = useState(address?.islandCity || "Malé");
  const [mapTarget, setMapTarget] = useState<MapModalTarget | null>(null);

  const applyPreset = (prefix: string, island: string) => {
    setAddressLine1((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return prefix;
      if (trimmed.startsWith(prefix.trim())) return trimmed;
      return `${prefix}${trimmed}`;
    });
    setIslandCity(island);
  };

  const openMapSearch = () => {
    const query = addressLine1.trim() || islandCity.trim() || "Malé";
    setMapTarget({
      title: address?.label || "Address Preview",
      address: query,
      area: islandCity || "Malé",
    });
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: address?.id || crypto.randomUUID(),
        recordId,
        label: input(data, "label") || "Primary",
        addressLine1: addressLine1.trim(),
        addressLine2: input(data, "addressLine2"),
        islandCity: islandCity || input(data, "islandCity"),
        atollRegion: input(data, "atollRegion"),
        country: input(data, "country") || "Maldives",
        notes: input(data, "notes"),
        isPrimary: data.get("isPrimary") === "on",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save address.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-stack">
      <div className="address-quick-box card-subtle">
        <div className="address-quick-header">
          <label htmlFor="address-line-1">
            <MapPin size={15} /> Address / House / Flat <span>*</span>
          </label>
          <button
            type="button"
            className="button secondary compact map-search-btn"
            onClick={openMapSearch}
            title="Preview location on Google Maps"
          >
            <Compass size={14} /> Preview on Maps
          </button>
        </div>

        <input
          id="address-line-1"
          name="addressLine1"
          value={addressLine1}
          onChange={(e) => setAddressLine1(e.target.value)}
          placeholder="e.g. H. Meenaaz, Boduthakurufaanu Magu"
          required
          autoFocus
        />

        <div className="preset-chips-container">
          <span className="preset-label">Quick Presets:</span>
          <div className="preset-chips">
            {MALDIVES_PRESETS.map((p) => (
              <button
                key={p.label}
                type="button"
                className="preset-chip"
                onClick={() => applyPreset(p.prefix, p.island)}
                title={`Add ${p.desc}`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="form-grid">
        <div className="field">
          <label htmlFor="address-label">Label</label>
          <input id="address-label" name="label" placeholder="Home, Office, Shop…" defaultValue={address?.label || "Home"} />
        </div>
        <div className="field">
          <label htmlFor="address-city">Island / City</label>
          <select id="address-city" name="islandCity" value={islandCity} onChange={(e) => setIslandCity(e.target.value)}>
            <option value="Malé">Malé</option>
            <option value="Hulhumalé">Hulhumalé</option>
            <option value="Villimalé">Villimalé</option>
          </select>
        </div>
        <div className="field field-span">
          <label htmlFor="address-line-2">Floor / Apartment / Road</label>
          <input id="address-line-2" name="addressLine2" placeholder="e.g. 3rd Floor, Apt 302" defaultValue={address?.addressLine2} />
        </div>
        <div className="field checkbox-field field-span">
          <input id="address-primary" name="isPrimary" type="checkbox" defaultChecked={address?.isPrimary ?? true} />
          <label htmlFor="address-primary">Set as primary delivery address</label>
        </div>
      </div>

      <div className="field">
        <label htmlFor="address-notes">Delivery / Entry Instructions</label>
        <textarea id="address-notes" name="notes" rows={2} placeholder="e.g. Beside Olympus cinema, ring buzzer 4B" defaultValue={address?.notes} />
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button className="button primary" disabled={saving}>
          {saving ? "Saving…" : "Save address"}
        </button>
      </div>

      {mapTarget && (
        <MapModal
          target={mapTarget}
          onClose={() => setMapTarget(null)}
        />
      )}
    </form>
  );
}

export function DriverForm({ driver, onSave, onCancel }: { driver?: Driver; onSave: (value: DriverInput) => Promise<void>; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    setError("");
    try {
      await onSave({
        id: driver?.id || crypto.randomUUID(),
        name: input(data, "name"),
        phone: input(data, "phone"),
        vehicle: input(data, "vehicle"),
        area: input(data, "area"),
        notes: input(data, "notes"),
        active: data.get("active") === "on",
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save driver.");
    } finally {
      setSaving(false);
    }
  };
  return (
    <form onSubmit={submit} className="form-stack">
      <div className="field">
        <label htmlFor="driver-name">Name <span>*</span></label>
        <input id="driver-name" name="name" defaultValue={driver?.name} placeholder="e.g. Driver 1" required autoFocus />
      </div>
      <div className="form-grid">
        <div className="field">
          <label htmlFor="driver-phone">Phone</label>
          <input id="driver-phone" name="phone" placeholder="7xxxxxx" defaultValue={driver?.phone} />
        </div>
        <div className="field">
          <label htmlFor="driver-vehicle">Vehicle</label>
          <select id="driver-vehicle" name="vehicle" defaultValue={driver?.vehicle || "Motorcycle"}>
            <option value="Motorcycle">Motorcycle 🛵</option>
            <option value="Car">Car 🚗</option>
            <option value="Van">Van 🚐</option>
            <option value="Pickup">Pickup 🛻</option>
            <option value="Bicycle">Bicycle 🚲</option>
            <option value="Other">Other 📦</option>
          </select>
        </div>
        <div className="field field-span">
          <label htmlFor="driver-area">Zone Coverage</label>
          <select id="driver-area" name="area" defaultValue={driver?.area || "All Areas"}>
            <option value="All Areas">All Areas</option>
            <option value="Malé">Malé</option>
            <option value="Hulhumalé">Hulhumalé</option>
            <option value="Villimalé">Villimalé</option>
          </select>
        </div>
      </div>
      <div className="field">
        <label htmlFor="driver-notes">Notes</label>
        <textarea id="driver-notes" name="notes" rows={2} defaultValue={driver?.notes} />
      </div>
      <div className="field checkbox-field">
        <input id="driver-active" name="active" type="checkbox" defaultChecked={driver?.active ?? true} />
        <label htmlFor="driver-active">Available for dispatch assignment</label>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>Cancel</button>
        <button className="button primary" disabled={saving}>{saving ? "Saving…" : "Save driver"}</button>
      </div>
    </form>
  );
}

export function GroupForm({
  group,
  onSave,
  onCancel,
}: {
  group?: string;
  onSave: (name: string) => Promise<void>;
  onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = input(data, "name");
    if (!name) {
      setError("Please enter a group name.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onSave(name);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Could not save group.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="form-stack">
      <div className="field">
        <label htmlFor="group-name">
          Group / Family Name <span>*</span>
        </label>
        <input
          id="group-name"
          name="name"
          defaultValue={group}
          placeholder="e.g. Shaufa Family / Moho Friends"
          required
          autoFocus
        />
        <p className="field-hint">
          This group will be available for all household records and filterable in the directory.
        </p>
      </div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions">
        <button type="button" className="button secondary" onClick={onCancel}>
          Cancel
        </button>
        <button className="button primary" disabled={saving}>
          {saving ? "Saving…" : group ? "Update group" : "Create group"}
        </button>
      </div>
    </form>
  );
}


