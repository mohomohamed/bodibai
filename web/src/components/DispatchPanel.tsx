import {
  Bike,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Edit3,
  ExternalLink,
  Eye,
  KeyRound,
  MapPin,
  MessageSquare,
  PackageCheck,
  Phone,
  Plus,
  Send,
  Trash2,
  Truck,
  UserCheck,
  Users,
  UserX,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  type Address,
  type Driver,
  type DriverInput,
  type RecordInput,
  type RecordItem,
} from "../types";
import { DriverForm } from "./Forms";
import { MapModal, type MapModalTarget } from "./MapModal";
import { Modal } from "./Modal";

function addressText(address?: Address): string {
  if (!address) return "No address added";
  return [address.addressLine1, address.addressLine2, address.islandCity].filter(Boolean).join(", ") || "No address";
}

function cleanMaldivesPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("960")) return digits;
  if (digits.length === 7) return `960${digits}`;
  return digits;
}

export function DispatchPanel({
  records,
  drivers,
  appPassword,
  saveRecord,
  saveDriver,
  deleteDriver,
  onPreviewDriver,
  notify,
}: {
  records: RecordItem[];
  drivers: Driver[];
  appPassword?: string;
  saveRecord: (value: RecordInput, editing: boolean) => Promise<void>;
  saveDriver: (value: DriverInput, editing: boolean) => Promise<void>;
  deleteDriver: (id: string) => Promise<void>;
  onPreviewDriver?: (driver: Driver) => void;
  notify: (message: string) => void;
}) {
  const [editingDriver, setEditingDriver] = useState<Driver | "new" | null>(null);
  const [selectedDriverId, setSelectedDriverId] = useState<string | "all" | "unassigned">("all");
  const [mapTarget, setMapTarget] = useState<MapModalTarget | null>(null);

  // Metrics
  const totalPortions = records.reduce((sum, r) => sum + (r.portions || 1), 0);
  const deliveredPortions = records
    .filter((r) => r.deliveryStatus === "delivered")
    .reduce((sum, r) => sum + (r.portions || 1), 0);
  const pendingPortions = totalPortions - deliveredPortions;
  const progressPercent = totalPortions > 0 ? Math.round((deliveredPortions / totalPortions) * 100) : 0;

  // Group records by driver
  const recordsByDriver = useMemo(() => {
    const map = new Map<string, RecordItem[]>();
    for (const d of drivers) map.set(d.id, []);
    const unassigned: RecordItem[] = [];

    for (const r of records) {
      if (r.driverId && map.has(r.driverId)) {
        map.get(r.driverId)!.push(r);
      } else {
        unassigned.push(r);
      }
    }
    return { assigned: map, unassigned };
  }, [drivers, records]);

  // Quick driver assignment
  const handleAssignDriver = async (record: RecordItem, driverId: string) => {
    await saveRecord({
      id: record.id,
      name: record.name,
      phone: record.phone,
      email: record.email,
      category: record.category,
      groupName: record.groupName,
      area: record.area,
      portions: record.portions,
      deliveryStatus: record.deliveryStatus,
      driverId,
      status: record.status,
      notes: record.notes,
    }, true);
    notify(driverId ? "Driver assigned" : "Household unassigned");
  };

  // Quick status update
  const handleUpdateStatus = async (record: RecordItem, newStatus: string) => {
    await saveRecord({
      id: record.id,
      name: record.name,
      phone: record.phone,
      email: record.email,
      category: record.category,
      groupName: record.groupName,
      area: record.area,
      portions: record.portions,
      deliveryStatus: newStatus,
      driverId: record.driverId,
      status: record.status,
      notes: record.notes,
    }, true);
    notify(`Status updated to ${newStatus}`);
  };

  // Build WhatsApp Dispatch Route text
  const sendWhatsAppRoute = (driver: Driver, driverRecords: RecordItem[]) => {
    if (!driverRecords.length) {
      notify("No households assigned to this driver yet.");
      return;
    }
    const driverPortions = driverRecords.reduce((sum, r) => sum + (r.portions || 1), 0);
    const stopsText = driverRecords
      .map((r, i) => {
        const addr = r.addresses.find((a) => a.isPrimary) || r.addresses[0];
        const statusEmoji = r.deliveryStatus === "delivered" ? "✅" : "⏳";
        return `${i + 1}. *${r.name}* (${r.portions} portion${r.portions === 1 ? "" : "s"}) ${statusEmoji}\n   📍 ${addressText(addr)}\n   📞 ${r.phone || "No phone"}${r.notes ? `\n   📝 ${r.notes}` : ""}`;
      })
      .join("\n\n");

    const message = `🛵 *BONDIBAI DELIVERY ROUTE*\n👤 *Driver:* ${driver.name}\n📦 *Total Stops:* ${driverRecords.length} | *Portions:* ${driverPortions}\n\n${stopsText}\n\n✨ _Bondibai App_`;

    const cleanPhone = cleanMaldivesPhone(driver.phone);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
  };

  // Send Driver Portal Login Credentials via WhatsApp
  const sendWhatsAppCredentials = (driver: Driver) => {
    const password = appPassword || "";
    const message = `Assalaamu Alaikum ${driver.name}! 🛵\n\nHere are your login credentials for *Bondibai App*:\n\n🌐 *App Link:* https://bodibai.vercel.app\n👤 *Username:* ${driver.name}\n🔑 *Password:* ${password || "[Password]"}\n\nOpen the link on your mobile phone to view your assigned delivery route, customer addresses, and Google Maps navigation.\n\n✨ _Bondibai App_`;

    const cleanPhone = cleanMaldivesPhone(driver.phone);
    const waUrl = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
      : `https://wa.me/?text=${encodeURIComponent(message)}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    notify(`Opening WhatsApp credentials for ${driver.name}`);
  };

  const removeDriver = async (driver: Driver) => {
    if (!window.confirm(`Delete driver ${driver.name}? All assigned households will become unassigned.`)) return;
    await deleteDriver(driver.id);
    notify("Driver deleted");
  };

  return (
    <div className="dispatch-panel">
      {/* Header */}
      <div className="page-heading records-heading">
        <div>
          <p className="eyebrow">Fleet & Routing</p>
          <h1>Delivery Dispatch</h1>
          <p>
            {deliveredPortions} of {totalPortions} portions delivered ({progressPercent}%) · {drivers.length} drivers
          </p>
        </div>
        <button className="button primary desktop-add" onClick={() => setEditingDriver("new")}>
          <Plus size={18} /> Add driver
        </button>
      </div>

      {/* KPI Stats Bar */}
      <section className="dispatch-kpis card">
        <div className="kpi-item">
          <span className="kpi-label">Total Portions</span>
          <span className="kpi-val">{totalPortions}</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Delivered</span>
          <span className="kpi-val kpi-success">{deliveredPortions}</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Pending</span>
          <span className="kpi-val kpi-pending">{pendingPortions}</span>
        </div>
        <div className="kpi-item">
          <span className="kpi-label">Active Drivers</span>
          <span className="kpi-val">{drivers.filter((d) => d.active).length}</span>
        </div>
      </section>

      {/* Driver Filter Tabs */}
      <div className="driver-filter-tabs">
        <button
          type="button"
          className={`driver-tab ${selectedDriverId === "all" ? "active" : ""}`}
          onClick={() => setSelectedDriverId("all")}
        >
          All Fleet ({drivers.length})
        </button>
        {drivers.map((d) => {
          const count = recordsByDriver.assigned.get(d.id)?.length || 0;
          return (
            <button
              key={d.id}
              type="button"
              className={`driver-tab ${selectedDriverId === d.id ? "active" : ""}`}
              onClick={() => setSelectedDriverId(d.id)}
            >
              {d.name} ({count})
            </button>
          );
        })}
        {recordsByDriver.unassigned.length > 0 && (
          <button
            type="button"
            className={`driver-tab unassigned-tab ${selectedDriverId === "unassigned" ? "active" : ""}`}
            onClick={() => setSelectedDriverId("unassigned")}
          >
            ⚠️ Unassigned ({recordsByDriver.unassigned.length})
          </button>
        )}
      </div>

      {/* Driver Cards Grid */}
      <section className="driver-routes-grid">
        {drivers
          .filter((d) => selectedDriverId === "all" || selectedDriverId === d.id)
          .map((driver) => {
            const assignedList = recordsByDriver.assigned.get(driver.id) || [];
            const driverPortions = assignedList.reduce((sum, r) => sum + (r.portions || 1), 0);
            const driverDelivered = assignedList
              .filter((r) => r.deliveryStatus === "delivered")
              .reduce((sum, r) => sum + (r.portions || 1), 0);
            const driverPercent = driverPortions > 0 ? Math.round((driverDelivered / driverPortions) * 100) : 0;

            return (
              <article className="card driver-card" key={driver.id}>
                <div className="driver-card-header">
                  <div className="driver-avatar-circle">
                    {driver.vehicle === "Car" || driver.vehicle === "Van" ? <Car size={20} /> : <Bike size={20} />}
                  </div>
                  <div className="driver-info-main">
                    <div className="driver-title-row">
                      <h2>{driver.name}</h2>
                      <span className="vehicle-badge">{driver.vehicle || "Motorcycle"}</span>
                      {driver.area && <span className="zone-badge">{driver.area}</span>}
                    </div>
                    <p className="driver-meta">
                      {driver.phone ? `📞 ${driver.phone}` : "No phone saved"} · {assignedList.length} households · {driverPortions} portions
                    </p>
                  </div>

                  <div className="driver-card-actions">
                    {onPreviewDriver && (
                      <button
                        type="button"
                        className="button compact secondary driver-portal-preview-btn"
                        onClick={() => onPreviewDriver(driver)}
                        title="Preview this driver's mobile portal"
                      >
                        <Eye size={14} /> Portal
                      </button>
                    )}
                    <button
                      type="button"
                      className="button compact secondary send-creds-btn"
                      onClick={() => sendWhatsAppCredentials(driver)}
                      title="Send login username & password to driver via WhatsApp"
                    >
                      <KeyRound size={14} /> WhatsApp Login
                    </button>
                    <button
                      type="button"
                      className="button compact whatsapp-route-btn"
                      onClick={() => sendWhatsAppRoute(driver, assignedList)}
                      title="Send route stop list to driver WhatsApp"
                    >
                      <Send size={14} /> Route
                    </button>
                    <button
                      type="button"
                      className="icon-button"
                      aria-label="Edit driver"
                      onClick={() => setEditingDriver(driver)}
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label="Delete driver"
                      onClick={() => void removeDriver(driver)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>


                {/* Progress bar */}
                <div className="driver-progress-box">
                  <div className="progress-labels">
                    <span>Progress: {driverDelivered} / {driverPortions} portions</span>
                    <span className="percent-num">{driverPercent}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ width: `${driverPercent}%` }} />
                  </div>
                </div>

                {/* Stop list */}
                <div className="driver-stop-list">
                  {assignedList.map((record, index) => {
                    const primary = record.addresses.find((a) => a.isPrimary) || record.addresses[0];
                    const isDone = record.deliveryStatus === "delivered";

                    return (
                      <div className={`stop-item ${isDone ? "stop-done" : ""}`} key={record.id}>
                        <div className="stop-index">{index + 1}</div>
                        <div className="stop-info">
                          <div className="stop-name-row">
                            <strong>{record.name}</strong>
                            <span className="stop-portion-tag">{record.portions} portion{record.portions === 1 ? "" : "s"}</span>
                            {record.area && <span className="stop-area-tag">{record.area}</span>}
                          </div>
                          <p className="stop-address">
                            <MapPin size={12} /> {addressText(primary)}
                          </p>
                          {record.notes && <small className="stop-notes">📝 {record.notes}</small>}
                        </div>

                        <div className="stop-actions">
                          {record.phone && (
                            <a
                              href={`tel:${record.phone}`}
                              className="icon-action-btn phone-btn"
                              title={`Call ${record.name}`}
                            >
                              <Phone size={13} />
                            </a>
                          )}
                          {primary?.addressLine1 && (
                            <button
                              type="button"
                              className="icon-action-btn map-btn"
                              title="Preview location on map"
                              onClick={() => setMapTarget({
                                title: record.name,
                                address: addressText(primary),
                                area: record.area,
                                phone: record.phone,
                                portions: record.portions,
                                status: record.deliveryStatus,
                                notes: record.notes,
                              })}
                            >
                              <Compass size={13} />
                            </button>
                          )}
                          <select
                            value={record.deliveryStatus}
                            onChange={(e) => void handleUpdateStatus(record, e.target.value)}
                            className={`stop-status-select status-${record.deliveryStatus}`}
                            aria-label="Delivery status"
                          >
                            <option value="planned">Planned ⏳</option>
                            <option value="prepared">Prepared 📦</option>
                            <option value="out-for-delivery">Out 🛵</option>
                            <option value="delivered">Delivered ✅</option>
                            <option value="paused">Hold ⏸️</option>
                          </select>
                        </div>
                      </div>
                    );
                  })}
                  {!assignedList.length && (
                    <p className="subtle-empty">No households assigned to this driver yet.</p>
                  )}
                </div>
              </article>
            );
          })}
      </section>

      {/* Unassigned Households Panel */}
      {(selectedDriverId === "all" || selectedDriverId === "unassigned") && recordsByDriver.unassigned.length > 0 && (
        <section className="card unassigned-section">
          <div className="section-title">
            <div>
              <h2>⚠️ Unassigned Households ({recordsByDriver.unassigned.length})</h2>
              <p>Assign drivers to these households for distribution.</p>
            </div>
          </div>
          <div className="unassigned-grid">
            {recordsByDriver.unassigned.map((record) => {
              const primary = record.addresses.find((a) => a.isPrimary) || record.addresses[0];
              return (
                <article className="unassigned-card" key={record.id}>
                  <div className="unassigned-main">
                    <div className="unassigned-title-row">
                      <strong>{record.name}</strong>
                      <span className="stop-portion-tag">{record.portions} portion{record.portions === 1 ? "" : "s"}</span>
                      {record.area && <span className="stop-area-tag">{record.area}</span>}
                    </div>
                    <p className="unassigned-address">
                      <MapPin size={12} /> {addressText(primary)}
                    </p>
                  </div>
                  <div className="assign-select-wrapper">
                    <select
                      value=""
                      onChange={(e) => void handleAssignDriver(record, e.target.value)}
                      className="assign-select"
                      aria-label="Assign driver"
                    >
                      <option value="" disabled>
                        + Assign Driver…
                      </option>
                      {drivers
                        .filter((d) => d.active)
                        .map((d) => (
                          <option key={d.id} value={d.id}>
                            {d.name} ({d.vehicle || "Motorcycle"})
                          </option>
                        ))}
                    </select>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      {/* Driver Form Modal */}
      {editingDriver && (
        <Modal
          title={editingDriver === "new" ? "Add fleet driver" : "Edit fleet driver"}
          onClose={() => setEditingDriver(null)}
        >
          <DriverForm
            driver={editingDriver === "new" ? undefined : editingDriver}
            onCancel={() => setEditingDriver(null)}
            onSave={async (value) => {
              await saveDriver(value, editingDriver !== "new");
              setEditingDriver(null);
              notify(editingDriver === "new" ? "Driver added" : "Driver updated");
            }}
          />
        </Modal>
      )}

      {/* In-App Relative Size Map Modal */}
      {mapTarget && (
        <MapModal
          target={mapTarget}
          onClose={() => setMapTarget(null)}
        />
      )}
    </div>
  );
}
