import { useState, type FormEvent } from "react";
import type { Address, AddressInput, Driver, DriverInput, RecordInput, RecordItem } from "../types";

const input = (form: FormData, key: string) => String(form.get(key) || "").trim();

export function RecordForm({ record, drivers, onSave, onCancel }: {
  record?: RecordItem; drivers: Driver[]; onSave: (value: RecordInput) => Promise<void>; onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true); setError("");
    try {
      await onSave({
        id: record?.id || crypto.randomUUID(), name: input(data, "name"), phone: input(data, "phone"),
        email: input(data, "email"), category: input(data, "category"), groupName: input(data, "groupName"),
        area: input(data, "area"), portions: Math.max(1, Number(input(data, "portions")) || 1),
        deliveryStatus: input(data, "deliveryStatus") || "planned", driverId: input(data, "driverId"),
        status: input(data, "status") || "active", notes: input(data, "notes"),
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save record."); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="form-stack">
      <div className="field"><label htmlFor="record-name">Name <span>*</span></label><input id="record-name" name="name" defaultValue={record?.name} required autoFocus /></div>
      <div className="form-grid">
        <div className="field"><label htmlFor="record-phone">Phone</label><input id="record-phone" name="phone" type="tel" defaultValue={record?.phone} /></div>
        <div className="field"><label htmlFor="record-email">Email</label><input id="record-email" name="email" type="email" defaultValue={record?.email} /></div>
        <div className="field"><label htmlFor="record-group">Group</label><input id="record-group" name="groupName" defaultValue={record?.groupName} /></div>
        <div className="field"><label htmlFor="record-area">Area</label><input id="record-area" name="area" defaultValue={record?.area} /></div>
        <div className="field"><label htmlFor="record-category">Category</label><input id="record-category" name="category" defaultValue={record?.category} /></div>
        <div className="field"><label htmlFor="record-portions">Portions</label><input id="record-portions" name="portions" type="number" min="1" defaultValue={record?.portions || 1} /></div>
        <div className="field"><label htmlFor="record-delivery">Delivery</label><select id="record-delivery" name="deliveryStatus" defaultValue={record?.deliveryStatus || "planned"}><option value="planned">Planned</option><option value="prepared">Prepared</option><option value="out-for-delivery">Out for delivery</option><option value="delivered">Delivered</option><option value="paused">Paused</option></select></div>
        <div className="field"><label htmlFor="record-status">Record status</label><select id="record-status" name="status" defaultValue={record?.status || "active"}><option value="active">Active</option><option value="inactive">Inactive</option><option value="paused">Paused</option></select></div>
        <div className="field field-span"><label htmlFor="record-driver">Driver</label><select id="record-driver" name="driverId" defaultValue={record?.driverId || ""}><option value="">Unassigned</option>{drivers.filter((driver) => driver.active).map((driver) => <option key={driver.id} value={driver.id}>{driver.name}{driver.area ? ` · ${driver.area}` : ""}</option>)}</select></div>
      </div>
      <div className="field"><label htmlFor="record-notes">Notes</label><textarea id="record-notes" name="notes" rows={4} defaultValue={record?.notes} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving…" : record ? "Save changes" : "Add record"}</button></div>
    </form>
  );
}

export function AddressForm({ recordId, address, onSave, onCancel }: {
  recordId: string; address?: Address; onSave: (value: AddressInput) => Promise<void>; onCancel: () => void;
}) {
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); setError("");
    try {
      await onSave({
        id: address?.id || crypto.randomUUID(), recordId, label: input(data, "label"), addressLine1: input(data, "addressLine1"),
        addressLine2: input(data, "addressLine2"), islandCity: input(data, "islandCity"), atollRegion: input(data, "atollRegion"),
        country: input(data, "country") || "Maldives", notes: input(data, "notes"), isPrimary: data.get("isPrimary") === "on",
      });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save address."); }
    finally { setSaving(false); }
  };
  return (
    <form onSubmit={submit} className="form-stack">
      <div className="form-grid">
        <div className="field"><label htmlFor="address-label">Label</label><input id="address-label" name="label" placeholder="Home, Office…" defaultValue={address?.label} autoFocus /></div>
        <div className="field checkbox-field"><input id="address-primary" name="isPrimary" type="checkbox" defaultChecked={address?.isPrimary} /><label htmlFor="address-primary">Primary address</label></div>
        <div className="field field-span"><label htmlFor="address-line-1">Address line 1</label><input id="address-line-1" name="addressLine1" defaultValue={address?.addressLine1} /></div>
        <div className="field field-span"><label htmlFor="address-line-2">Address line 2</label><input id="address-line-2" name="addressLine2" defaultValue={address?.addressLine2} /></div>
        <div className="field"><label htmlFor="address-city">Island / City</label><input id="address-city" name="islandCity" defaultValue={address?.islandCity} /></div>
        <div className="field"><label htmlFor="address-atoll">Atoll / Region</label><input id="address-atoll" name="atollRegion" defaultValue={address?.atollRegion} /></div>
        <div className="field field-span"><label htmlFor="address-country">Country</label><input id="address-country" name="country" defaultValue={address?.country || "Maldives"} /></div>
      </div>
      <div className="field"><label htmlFor="address-notes">Notes</label><textarea id="address-notes" name="notes" rows={3} defaultValue={address?.notes} /></div>
      {error && <p className="form-error" role="alert">{error}</p>}
      <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving…" : "Save address"}</button></div>
    </form>
  );
}

export function DriverForm({ driver, onSave, onCancel }: { driver?: Driver; onSave: (value: DriverInput) => Promise<void>; onCancel: () => void }) {
  const [saving, setSaving] = useState(false), [error, setError] = useState("");
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault(); const data = new FormData(event.currentTarget); setSaving(true); setError("");
    try {
      await onSave({ id: driver?.id || crypto.randomUUID(), name: input(data, "name"), phone: input(data, "phone"), vehicle: input(data, "vehicle"), area: input(data, "area"), notes: input(data, "notes"), active: data.get("active") === "on" });
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not save driver."); }
    finally { setSaving(false); }
  };
  return <form onSubmit={submit} className="form-stack">
    <div className="field"><label htmlFor="driver-name">Name <span>*</span></label><input id="driver-name" name="name" defaultValue={driver?.name} required autoFocus /></div>
    <div className="form-grid"><div className="field"><label htmlFor="driver-phone">Phone</label><input id="driver-phone" name="phone" defaultValue={driver?.phone} /></div><div className="field"><label htmlFor="driver-vehicle">Vehicle</label><input id="driver-vehicle" name="vehicle" defaultValue={driver?.vehicle} /></div><div className="field field-span"><label htmlFor="driver-area">Area</label><input id="driver-area" name="area" defaultValue={driver?.area} /></div></div>
    <div className="field"><label htmlFor="driver-notes">Notes</label><textarea id="driver-notes" name="notes" rows={3} defaultValue={driver?.notes} /></div>
    <div className="field checkbox-field"><input id="driver-active" name="active" type="checkbox" defaultChecked={driver?.active ?? true} /><label htmlFor="driver-active">Available for assignment</label></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="form-actions"><button type="button" className="button secondary" onClick={onCancel}>Cancel</button><button className="button primary" disabled={saving}>{saving ? "Saving…" : "Save driver"}</button></div>
  </form>;
}
