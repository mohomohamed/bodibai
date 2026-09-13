import {
  ArrowDownAZ, ChevronRight, CirclePlus, Compass, Edit3, Mail, MapPin, Phone, Search, SlidersHorizontal, Trash2, UserRound,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  type Address,
  type AddressInput,
  type Driver,
  type RecordInput,
  type RecordItem,
} from "../types";
import { AddressForm, RecordForm } from "./Forms";
import { MapModal, type MapModalTarget } from "./MapModal";
import { Modal } from "./Modal";

function relativeTime(timestamp: number): string {
  const seconds = Math.max(1, Math.round((Date.now() - timestamp) / 1000));
  if (seconds < 60) return "just now";
  const minutes = Math.round(seconds / 60); if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60); if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24); return days < 30 ? `${days}d ago` : new Date(timestamp).toLocaleDateString();
}

function addressText(address?: Address): string {
  if (!address) return "No address added";
  return [address.addressLine1, address.addressLine2, address.islandCity, address.atollRegion].filter(Boolean).join(", ") || "Address details not entered";
}

function hasRecordAddress(record: RecordItem): boolean {
  const primary = record.addresses.find((item) => item.isPrimary) || record.addresses[0];
  return Boolean(primary?.addressLine1?.trim());
}

interface Props {
  records: RecordItem[];
  drivers: Driver[];
  groups?: string[];
  saveRecord: (value: RecordInput, editing: boolean) => Promise<void>;
  deleteRecord: (id: string) => Promise<void>;
  saveAddress: (value: AddressInput, editing: boolean) => Promise<void>;
  deleteAddress: (id: string) => Promise<void>;
  notify: (message: string) => void;
}

export function RecordsPanel({ records, drivers, groups = [], saveRecord, deleteRecord, saveAddress, deleteAddress, notify }: Props) {
  const [query, setQuery] = useState(""), [area, setArea] = useState("all"), [status, setStatus] = useState("all"), [groupFilter, setGroupFilter] = useState("all");
  const [addressFilter, setAddressFilter] = useState<"all" | "missing" | "assigned">("all");
  const [sort, setSort] = useState<"updated" | "name">("updated"), [filtersOpen, setFiltersOpen] = useState(false);
  const [editing, setEditing] = useState<RecordItem | "new" | null>(null), [selectedId, setSelectedId] = useState<string | null>(null);
  const [addressEdit, setAddressEdit] = useState<{ recordId: string; address?: Address } | null>(null);
  const [mapTarget, setMapTarget] = useState<MapModalTarget | null>(null);

  const selected = records.find((record) => record.id === selectedId);

  const openMapModal = (target: MapModalTarget, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setMapTarget(target);
  };

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return records.filter((record) => {
      const searchable = [record.name, record.phone, record.email, record.category, record.groupName, record.area, record.notes,
        ...record.addresses.flatMap((address) => [address.addressLine1, address.addressLine2, address.islandCity, address.atollRegion, address.notes])].join(" ").toLowerCase();
      const matchesQuery = !normalized || searchable.includes(normalized);
      const matchesArea = area === "all" || record.area === area;
      const matchesStatus = status === "all" || record.deliveryStatus === status;
      const matchesGroup = groupFilter === "all" || (record.groupName && record.groupName.trim() === groupFilter);
      const matchesAddress =
        addressFilter === "all" ||
        (addressFilter === "missing" && !hasRecordAddress(record)) ||
        (addressFilter === "assigned" && hasRecordAddress(record));
      return matchesQuery && matchesArea && matchesStatus && matchesGroup && matchesAddress;
    }).sort((left, right) => sort === "name" ? left.name.localeCompare(right.name) : right.updatedAt - left.updatedAt);
  }, [addressFilter, area, groupFilter, query, records, sort, status]);

  const removeRecord = async (record: RecordItem) => {
    if (!window.confirm(`Delete ${record.name}? This can be recovered from the D1 database if needed.`)) return;
    await deleteRecord(record.id); setSelectedId(null); notify("Record deleted");
  };
  const removeAddress = async (address: Address) => {
    if (!window.confirm(`Remove ${address.label || "this address"}?`)) return;
    await deleteAddress(address.id); notify("Address removed");
  };

  const handleSaveRecord = async (recordValue: RecordInput, addressLine1?: string) => {
    const isNew = editing === "new";
    const currentEditing = editing && typeof editing === "object" ? editing : undefined;
    await saveRecord(recordValue, !isNew);
    if (addressLine1 && addressLine1.trim()) {
      const existingPrimary = currentEditing
        ? currentEditing.addresses.find((a) => a.isPrimary) || currentEditing.addresses[0]
        : undefined;
      if (existingPrimary) {
        if (existingPrimary.addressLine1 !== addressLine1) {
          await saveAddress({ ...existingPrimary, addressLine1, islandCity: recordValue.area || existingPrimary.islandCity }, true);
        }
      } else {
        await saveAddress({
          id: crypto.randomUUID(),
          recordId: recordValue.id,
          label: "Primary",
          addressLine1: addressLine1.trim(),
          addressLine2: "",
          islandCity: recordValue.area || "Malé",
          atollRegion: "",
          country: "Maldives",
          notes: "",
          isPrimary: true,
        }, false);
      }
    }
    setEditing(null);
    notify(isNew ? "Record added" : "Changes saved");
  };

  const noAddressCount = useMemo(() => records.filter((r) => !hasRecordAddress(r)).length, [records]);
  const hasAddressCount = records.length - noAddressCount;

  return <>
    <div className="page-heading records-heading">
      <div><p className="eyebrow">Shared directory</p><h1>Records</h1><p>{records.length} record{records.length === 1 ? "" : "s"} · {records.reduce((sum, item) => sum + item.portions, 0)} portions</p></div>
      <button className="button primary desktop-add" onClick={() => setEditing("new")}><CirclePlus size={18} />Add record</button>
    </div>
    {/* Island Area Quick Filter Pills */}
    <div className="island-pill-bar">
      <button
        type="button"
        className={`island-pill ${area === "all" && addressFilter === "all" ? "active" : ""}`}
        onClick={() => { setArea("all"); setAddressFilter("all"); }}
      >
        <span>All</span>
        <span className="pill-count">{records.length}</span>
      </button>
      <button
        type="button"
        className={`island-pill pill-male ${area === "Malé" ? "active" : ""}`}
        onClick={() => setArea(area === "Malé" ? "all" : "Malé")}
      >
        <span className="pill-dot red-dot" />
        <span>Malé</span>
        <span className="pill-count">{records.filter((r) => r.area === "Malé").length}</span>
      </button>
      <button
        type="button"
        className={`island-pill pill-hulh ${area === "Hulhumalé" ? "active" : ""}`}
        onClick={() => setArea(area === "Hulhumalé" ? "all" : "Hulhumalé")}
      >
        <span className="pill-dot cyan-dot" />
        <span>Hulhumalé</span>
        <span className="pill-count">{records.filter((r) => r.area === "Hulhumalé").length}</span>
      </button>
      <button
        type="button"
        className={`island-pill pill-villi ${area === "Villimalé" ? "active" : ""}`}
        onClick={() => setArea(area === "Villimalé" ? "all" : "Villimalé")}
      >
        <span className="pill-dot green-dot" />
        <span>Villimalé</span>
        <span className="pill-count">{records.filter((r) => r.area === "Villimalé").length}</span>
      </button>
      <button
        type="button"
        className={`island-pill pill-missing-address ${addressFilter === "missing" ? "active" : ""}`}
        onClick={() => setAddressFilter(addressFilter === "missing" ? "all" : "missing")}
        title="Filter households with no address assigned"
      >
        <span className="pill-dot warning-dot" />
        <span>No Address</span>
        <span className="pill-count">{noAddressCount}</span>
      </button>
    </div>

    <section className="toolbar card">
      <label className="search-box">
        <Search size={18} />
        <span className="sr-only">Search records</span>
        <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search names, phone, address, group…" />
      </label>
      <button className={`button filter-button ${filtersOpen ? "active" : ""}`} onClick={() => setFiltersOpen(!filtersOpen)}>
        <SlidersHorizontal size={17} />Filters{(status !== "all" || groupFilter !== "all" || addressFilter !== "all") && <span className="filter-dot" />}
      </button>
      <button className="button filter-button" onClick={() => setSort(sort === "updated" ? "name" : "updated")}>
        <ArrowDownAZ size={17} />{sort === "updated" ? "Recent" : "Name"}
      </button>
      {filtersOpen && <div className="filter-row">
        <label>Address Status
          <select value={addressFilter} onChange={(event) => setAddressFilter(event.target.value as "all" | "missing" | "assigned")}>
            <option value="all">All records ({records.length})</option>
            <option value="missing">⚠️ No address assigned ({noAddressCount})</option>
            <option value="assigned">✅ Has address ({hasAddressCount})</option>
          </select>
        </label>
        <label>Delivery Status
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="all">All statuses</option>
            <option value="planned">Planned</option>
            <option value="prepared">Prepared</option>
            <option value="out-for-delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
            <option value="paused">Paused</option>
          </select>
        </label>
        <label>Group / Family
          <select value={groupFilter} onChange={(event) => setGroupFilter(event.target.value)}>
            <option value="all">All groups ({records.length})</option>
            {groups.map((g) => {
              const count = records.filter((r) => (r.groupName || "").trim() === g).length;
              return <option key={g} value={g}>{g} ({count})</option>;
            })}
          </select>
        </label>
        <button className="text-button" onClick={() => { setArea("all"); setStatus("all"); setGroupFilter("all"); setAddressFilter("all"); }}>Clear filters</button>
      </div>}
    </section>

    <div className="list-meta">
      <span>{filtered.length} shown ({filtered.reduce((sum, item) => sum + item.portions, 0)} portions)</span>
      {(query || area !== "all" || status !== "all" || groupFilter !== "all" || addressFilter !== "all") && (
        <button className="text-button" onClick={() => { setQuery(""); setArea("all"); setStatus("all"); setGroupFilter("all"); setAddressFilter("all"); }}>
          Reset filters
        </button>
      )}
    </div>

    {filtered.length ? <section className="record-list" aria-label="Record list">
      {filtered.map((record) => {
        const primary = record.addresses.find((item) => item.isPrimary) || record.addresses[0];
        const driver = drivers.find((item) => item.id === record.driverId);
        const hasAddress = Boolean(primary?.addressLine1);
        const cleanPhone = record.phone ? record.phone.replace(/\D/g, "") : "";
        const waPhone = cleanPhone.startsWith("960") ? cleanPhone : cleanPhone.length === 7 ? `960${cleanPhone}` : cleanPhone;
        const isDelivered = record.deliveryStatus === "delivered";

        return (
          <article className="record-card" key={record.id} tabIndex={0} onClick={() => setSelectedId(record.id)} onKeyDown={(event) => { if (event.key === "Enter") setSelectedId(record.id); }}>
            <div className={`avatar ${record.area === "Malé" ? "avatar-male" : record.area === "Villimalé" ? "avatar-villi" : "avatar-hulh"}`}>
              {record.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="record-main">
              <div className="record-title-row">
                <h2>{record.name}</h2>
                <div className="status-badge-container" onClick={(e) => e.stopPropagation()}>
                  <select
                    value={record.deliveryStatus}
                    onChange={(e) => {
                      void saveRecord({
                        id: record.id,
                        name: record.name,
                        phone: record.phone,
                        email: record.email,
                        category: record.category,
                        groupName: record.groupName,
                        area: record.area,
                        portions: record.portions,
                        deliveryStatus: e.target.value,
                        driverId: record.driverId,
                        status: record.status,
                        notes: record.notes,
                      }, true);
                      notify(`Status updated to ${e.target.value}`);
                    }}
                    className={`card-status-select status-${record.deliveryStatus}`}
                    aria-label="Change status"
                  >
                    <option value="planned">Planned ⏳</option>
                    <option value="prepared">Prepared 📦</option>
                    <option value="out-for-delivery">Out 🛵</option>
                    <option value="delivered">Delivered ✅</option>
                    <option value="paused">Hold ⏸️</option>
                  </select>
                </div>
              </div>

              <div className="record-contact">
                <span className="address-line-wrapper">
                  <MapPin size={14} />{addressText(primary)}
                  {hasAddress && (
                    <button
                      type="button"
                      className="map-quick-link"
                      title={`Preview map for ${record.name}`}
                      onClick={(e) => openMapModal({
                        title: record.name,
                        address: addressText(primary),
                        area: record.area,
                        phone: record.phone,
                        portions: record.portions,
                        status: record.deliveryStatus,
                        notes: record.notes,
                      }, e)}
                    >
                      <Compass size={13} /> Map
                    </button>
                  )}
                </span>
              </div>

              {/* Card 1-Tap Quick Action Row */}
              <div className="card-quick-actions" onClick={(e) => e.stopPropagation()}>
                {record.phone && (
                  <>
                    <a
                      href={`tel:${record.phone}`}
                      className="card-action-chip phone-action"
                      title={`Call ${record.phone}`}
                    >
                      <Phone size={13} /> Call
                    </a>
                    <a
                      href={`https://wa.me/${waPhone}?text=${encodeURIComponent(`Assalaamu Alaikum! Bondibai delivery for ${record.name}. I am approaching your address at ${addressText(primary)}.\n\n✨ _Bondibai App_`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="card-action-chip wa-action"
                      title="Open WhatsApp chat"
                    >
                      WhatsApp
                    </a>
                  </>
                )}
                <button
                  type="button"
                  className={`card-action-chip ${isDelivered ? "delivered-action active" : "delivered-action"}`}
                  onClick={() => {
                    const next = isDelivered ? "planned" : "delivered";
                    void saveRecord({
                      id: record.id,
                      name: record.name,
                      phone: record.phone,
                      email: record.email,
                      category: record.category,
                      groupName: record.groupName,
                      area: record.area,
                      portions: record.portions,
                      deliveryStatus: next,
                      driverId: record.driverId,
                      status: record.status,
                      notes: record.notes,
                    }, true);
                    notify(isDelivered ? "Marked as Planned" : "Marked as Delivered ✅");
                  }}
                >
                  {isDelivered ? "✅ Delivered" : "Mark Delivered"}
                </button>
              </div>

              <div className="record-footer">
                <span className="portion-count-badge">{record.portions} portion{record.portions === 1 ? "" : "s"}</span>
                {record.area && <span className={`area-tag tag-${record.area}`}>{record.area}</span>}
                {driver && <span className="driver-assigned-tag">🛵 {driver.name}</span>}
                <span className="updated">Updated {relativeTime(record.updatedAt)}{record.updatedBy ? ` by ${record.updatedBy}` : ""}</span>
              </div>
            </div>
            <ChevronRight className="record-chevron" size={20} />
          </article>
        );
      })}
    </section> : <section className="empty-state card"><div className="empty-icon"><UserRound /></div><h2>No matching records</h2><p>{records.length ? "Try a different search or clear the filters." : "Add the first household to get started."}</p>{!records.length && <button className="button primary" onClick={() => setEditing("new")}><CirclePlus size={18} />Add record</button>}</section>}

    <button className="fab" aria-label="Add record" onClick={() => setEditing("new")}><CirclePlus /></button>

    {editing && <Modal title={editing === "new" ? "Add household record" : "Edit household record"} onClose={() => setEditing(null)} wide>
      <RecordForm
        record={editing === "new" ? undefined : editing}
        drivers={drivers}
        groups={groups}
        onCancel={() => setEditing(null)}
        onSave={handleSaveRecord}
      />
    </Modal>}

    {selected && <Modal title="Record details" onClose={() => setSelectedId(null)} wide>
      <div className="detail-hero">
        <div className="avatar large">{selected.name.slice(0, 1).toUpperCase()}</div>
        <div>
          <h2>{selected.name}</h2>
          <p>{selected.groupName || selected.category || "Household"}{selected.area ? ` · ${selected.area}` : ""}</p>
        </div>
        <span className={`status-chip status-${selected.deliveryStatus}`}>{selected.deliveryStatus.replaceAll("-", " ")}</span>
      </div>
      <div className="detail-actions">
        <button className="button secondary" onClick={() => { setSelectedId(null); setEditing(selected); }}><Edit3 size={16} />Edit</button>
        <button className="button danger-ghost" onClick={() => void removeRecord(selected)}><Trash2 size={16} />Delete</button>
      </div>
      <dl className="detail-grid">
        <div><dt>Phone</dt><dd>{selected.phone || "—"}</dd></div>
        <div><dt>Email</dt><dd>{selected.email || "—"}</dd></div>
        <div><dt>Portions</dt><dd>{selected.portions}</dd></div>
        <div><dt>Assigned Driver</dt><dd>{drivers.find((item) => item.id === selected.driverId)?.name || "Unassigned"}</dd></div>
        <div><dt>Group</dt><dd>{selected.groupName || "—"}</dd></div>
        <div><dt>Area</dt><dd>{selected.area || "—"}</dd></div>
      </dl>
      {selected.notes && <div className="detail-notes"><h3>Delivery Notes</h3><p>{selected.notes}</p></div>}
      
      <div className="section-title">
        <div>
          <h3>Addresses & Locations</h3>
          <p>{selected.addresses.length} saved</p>
        </div>
        <button className="button secondary compact" onClick={() => setAddressEdit({ recordId: selected.id })}>
          <CirclePlus size={16} />Add address
        </button>
      </div>

      <div className="address-list">
        {selected.addresses.map((address) => {
          const query = addressText(address);
          return (
            <article className="address-card" key={address.id}>
              <MapPin size={18} />
              <div className="address-card-content">
                <div className="address-title">
                  <h4>{address.label || "Address"}</h4>
                  {address.isPrimary && <span className="primary-badge">Primary</span>}
                </div>
                <p>{query}</p>
                {address.notes && <small>{address.notes}</small>}
                <div className="address-map-bar">
                  <div className="address-map-bar">
                    <button
                      type="button"
                      className="button secondary compact map-action-chip"
                      onClick={() => openMapModal({
                        title: selected.name,
                        address: query,
                        area: address.islandCity || selected.area,
                        phone: selected.phone,
                        portions: selected.portions,
                        status: selected.deliveryStatus,
                        notes: address.notes || selected.notes,
                      })}
                      title="Open in-app Google Maps preview"
                    >
                      <Compass size={13} /> Preview on Maps
                    </button>
                  </div>
                </div>
              </div>
              <div className="inline-actions">
                <button className="icon-button" aria-label="Edit address" onClick={() => setAddressEdit({ recordId: selected.id, address })}>
                  <Edit3 size={16} />
                </button>
                <button className="icon-button danger" aria-label="Delete address" onClick={() => void removeAddress(address)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </article>
          );
        })}
        {!selected.addresses.length && <p className="subtle-empty">No address has been added for this household yet.</p>}
      </div>

      <p className="audit-line">Last updated {relativeTime(selected.updatedAt)}{selected.updatedBy ? ` by ${selected.updatedBy}` : ""} · Version {selected.version}</p>
      {(selected.phone || selected.email) && <div className="mobile-contact-actions">{selected.phone && <a className="button secondary" href={`tel:${selected.phone}`}><Phone size={16} />Call</a>}{selected.email && <a className="button secondary" href={`mailto:${selected.email}`}><Mail size={16} />Email</a>}</div>}
    </Modal>}

    {addressEdit && <Modal title={addressEdit.address ? "Edit address" : "Add address"} onClose={() => setAddressEdit(null)}>
      <AddressForm
        recordId={addressEdit.recordId}
        address={addressEdit.address}
        onCancel={() => setAddressEdit(null)}
        onSave={async (value) => {
          await saveAddress(value, Boolean(addressEdit.address));
          setAddressEdit(null);
          notify(addressEdit.address ? "Address updated" : "Address added");
        }}
      />
    </Modal>}

    {/* In-App Relative Size Map Modal */}
    {mapTarget && (
      <MapModal
        target={mapTarget}
        onClose={() => setMapTarget(null)}
      />
    )}
  </>;
}

