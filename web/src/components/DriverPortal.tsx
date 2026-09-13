import {
  ArrowDown,
  ArrowUp,
  Bike,
  Car,
  Check,
  CheckCircle2,
  ChevronRight,
  Compass,
  Copy,
  ExternalLink,
  LogOut,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  PhoneOff,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Truck,
  UserCheck,
  UserMinus,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  type Address,
  type Driver,
  type RecordInput,
  type RecordItem,
  type SyncStatus,
  getGoogleMapsDirectionsUrl,
  getGoogleMapsMultiRouteUrl,
} from "../types";
import { MapModal, type MapModalTarget } from "./MapModal";
import { SyncBadge } from "./SyncBadge";

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

interface Props {
  driver: Driver;
  records: RecordItem[];
  allDrivers?: Driver[];
  status: SyncStatus;
  pendingCount: number;
  syncError?: string;
  isAdminPreview?: boolean;
  onExitPreview?: () => void;
  onSync: () => Promise<void>;
  onLogout: () => Promise<void>;
  saveRecord: (value: RecordInput, editing: boolean) => Promise<void>;
  notify: (message: string) => void;
}

export function DriverPortal({
  driver,
  records,
  status,
  pendingCount,
  isAdminPreview = false,
  onExitPreview,
  onSync,
  onLogout,
  saveRecord,
  notify,
}: Props) {
  const [filter, setFilter] = useState<"pending" | "delivered" | "all" | "claim">("pending");
  const [claimArea, setClaimArea] = useState<"all" | "Malé" | "Hulhumalé" | "Villimalé">("all");
  const [claimSearch, setClaimSearch] = useState("");
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [mapTarget, setMapTarget] = useState<MapModalTarget | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [customOrder, setCustomOrder] = useState<string[]>([]);

  // Available unassigned and undelivered records for drivers to self-assign
  const availableUnassigned = useMemo(() => {
    return records.filter(
      (r) => (!r.driverId || r.driverId === "") && r.deliveryStatus !== "delivered"
    );
  }, [records]);

  const filteredUnassigned = useMemo(() => {
    const query = claimSearch.trim().toLowerCase();
    return availableUnassigned.filter((r) => {
      const matchesArea = claimArea === "all" || r.area === claimArea;
      if (!matchesArea) return false;
      if (!query) return true;
      const searchSpace = [
        r.name,
        r.phone,
        r.groupName,
        r.area,
        r.notes,
        ...r.addresses.flatMap((a) => [a.addressLine1, a.addressLine2, a.islandCity, a.notes]),
      ].join(" ").toLowerCase();
      return searchSpace.includes(query);
    });
  }, [availableUnassigned, claimArea, claimSearch]);

  // Filter records assigned to this driver
  const assignedRecords = useMemo(() => {
    return records.filter((r) => r.driverId === driver.id);
  }, [records, driver.id]);

  // Order assigned records according to custom order or default sequence
  const orderedRecords = useMemo(() => {
    if (!customOrder.length) return [...assignedRecords];
    const map = new Map(assignedRecords.map((r) => [r.id, r]));
    const result: RecordItem[] = [];
    // First add items from custom order that still exist
    for (const id of customOrder) {
      const item = map.get(id);
      if (item) {
        result.push(item);
        map.delete(id);
      }
    }
    // Then append any newly assigned items
    for (const item of map.values()) {
      result.push(item);
    }
    return result;
  }, [assignedRecords, customOrder]);

  // Metrics
  const totalStops = orderedRecords.length;
  const deliveredStops = orderedRecords.filter((r) => r.deliveryStatus === "delivered").length;
  const pendingStops = totalStops - deliveredStops;
  const totalPortions = orderedRecords.reduce((sum, r) => sum + (r.portions || 1), 0);
  const deliveredPortions = orderedRecords
    .filter((r) => r.deliveryStatus === "delivered")
    .reduce((sum, r) => sum + (r.portions || 1), 0);
  const remainingPortions = totalPortions - deliveredPortions;
  const progressPercent = totalStops > 0 ? Math.round((deliveredStops / totalStops) * 100) : 0;

  // Filtered stops for current view
  const visibleStops = useMemo(() => {
    if (filter === "pending") return orderedRecords.filter((r) => r.deliveryStatus !== "delivered");
    if (filter === "delivered") return orderedRecords.filter((r) => r.deliveryStatus === "delivered");
    return orderedRecords;
  }, [orderedRecords, filter]);

  // Pending stops list for multi-stop route planning in Google Maps
  const pendingStopsForRoute = useMemo(() => {
    return orderedRecords
      .filter((r) => r.deliveryStatus !== "delivered")
      .map((r) => {
        const addr = r.addresses.find((a) => a.isPrimary) || r.addresses[0];
        return {
          address: addr ? addressText(addr) : "",
          area: r.area,
          title: r.name,
        };
      });
  }, [orderedRecords]);

  const handleToggleDelivered = async (record: RecordItem) => {
    const nextStatus = record.deliveryStatus === "delivered" ? "planned" : "delivered";
    await saveRecord(
      {
        id: record.id,
        name: record.name,
        phone: record.phone,
        email: record.email,
        category: record.category,
        groupName: record.groupName,
        area: record.area,
        portions: record.portions,
        deliveryStatus: nextStatus,
        driverId: record.driverId,
        status: record.status,
        notes: record.notes,
      },
      true,
    );
    notify(nextStatus === "delivered" ? `✅ Delivered to ${record.name}!` : `Marked ${record.name} as pending`);
  };

  const handleToggleNotPickingUp = async (record: RecordItem) => {
    const nextStatus = record.deliveryStatus === "not-picking-up" ? "planned" : "not-picking-up";
    await saveRecord(
      {
        id: record.id,
        name: record.name,
        phone: record.phone,
        email: record.email,
        category: record.category,
        groupName: record.groupName,
        area: record.area,
        portions: record.portions,
        deliveryStatus: nextStatus,
        driverId: record.driverId,
        status: record.status,
        notes: record.notes,
      },
      true,
    );
    notify(
      nextStatus === "not-picking-up"
        ? `📵 Marked ${record.name} as Not Picking Up`
        : `Reset status for ${record.name} to Pending`
    );
  };

  const handleClaimRecord = async (record: RecordItem) => {
    try {
      setClaimingId(record.id);
      await saveRecord(
        {
          id: record.id,
          name: record.name,
          phone: record.phone,
          email: record.email,
          category: record.category,
          groupName: record.groupName,
          area: record.area,
          portions: record.portions,
          deliveryStatus: record.deliveryStatus || "planned",
          driverId: driver.id,
          status: record.status,
          notes: record.notes,
        },
        true,
      );
      notify(`🛵 Assigned ${record.name} to your route!`);
    } catch {
      notify("Failed to claim stop");
    } finally {
      setClaimingId(null);
    }
  };

  const handleReleaseRecord = async (record: RecordItem) => {
    try {
      await saveRecord(
        {
          id: record.id,
          name: record.name,
          phone: record.phone,
          email: record.email,
          category: record.category,
          groupName: record.groupName,
          area: record.area,
          portions: record.portions,
          deliveryStatus: record.deliveryStatus,
          driverId: "",
          status: record.status,
          notes: record.notes,
        },
        true,
      );
      notify(`Released ${record.name} to available stops`);
    } catch {
      notify("Failed to release stop");
    }
  };

  const handleCopy = async (id: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
      notify("Address copied to clipboard");
    } catch {
      // ignore
    }
  };

  const moveStop = (index: number, direction: "up" | "down") => {
    const list = [...orderedRecords];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= list.length) return;
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;
    setCustomOrder(list.map((r) => r.id));
  };

  const autoSortByZone = () => {
    const zoneWeight = (area?: string) => {
      if (area === "Malé") return 1;
      if (area === "Hulhumalé") return 2;
      if (area === "Villimalé") return 3;
      return 4;
    };
    const sorted = [...orderedRecords].sort((a, b) => {
      const wA = zoneWeight(a.area);
      const wB = zoneWeight(b.area);
      if (wA !== wB) return wA - wB;
      const addrA = a.addresses[0]?.addressLine1 || "";
      const addrB = b.addresses[0]?.addressLine1 || "";
      return addrA.localeCompare(addrB);
    });
    setCustomOrder(sorted.map((r) => r.id));
    notify("Stops ordered by island & zone");
  };

  const launchGoogleMapsMultiRoute = () => {
    if (!pendingStopsForRoute.length) {
      notify("All stops are already delivered!");
      return;
    }
    const url = getGoogleMapsMultiRouteUrl(pendingStopsForRoute);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const launchSingleStopNav = (record: RecordItem, addr?: Address) => {
    const fullAddr = addr ? addressText(addr) : record.name;
    const url = getGoogleMapsDirectionsUrl(fullAddr);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="driver-portal">
      {/* Admin Preview Header Banner */}
      {isAdminPreview && (
        <aside className="admin-preview-banner" aria-label="Admin preview banner">
          <div className="admin-preview-content">
            <span className="admin-badge">Admin Mode</span>
            <span>Previewing <strong>{driver.name}</strong>'s Driver Portal</span>
          </div>
          {onExitPreview && (
            <button type="button" className="button compact secondary" onClick={onExitPreview}>
              Exit Preview
            </button>
          )}
        </aside>
      )}

      {/* Driver Portal Topbar */}
      <header className="driver-topbar">
        <div className="driver-identity">
          <div className="driver-avatar-badge">
            {driver.vehicle === "Car" || driver.vehicle === "Van" ? <Car size={22} /> : <Bike size={22} />}
          </div>
          <div>
            <div className="driver-name-row">
              <h1>{driver.name}</h1>
              <span className="driver-role-chip">Driver</span>
            </div>
            <p className="driver-sub-meta">
              {driver.vehicle || "Motorcycle"}{driver.area ? ` · ${driver.area}` : ""} · {driver.phone || "No phone"}
            </p>
          </div>
        </div>

        <div className="driver-top-actions">
          <button
            type="button"
            className="top-sync icon-button"
            onClick={() => void onSync()}
            title="Sync delivery records"
            aria-label="Sync"
          >
            <SyncBadge status={status} pending={pendingCount} />
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => void onLogout()}
            title="Sign out"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* Route KPI Progress Card */}
      <section className="driver-summary-card card">
        <div className="route-kpi-row">
          <div className="route-kpi">
            <span className="kpi-num">{deliveredStops}/{totalStops}</span>
            <span className="kpi-lbl">Stops Done</span>
          </div>
          <div className="route-kpi highlight">
            <span className="kpi-num">{remainingPortions}</span>
            <span className="kpi-lbl">Portions Left</span>
          </div>
          <div className="route-kpi">
            <span className="kpi-num">{totalPortions}</span>
            <span className="kpi-lbl">Total Portions</span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="route-progress-track">
          <div
            className="route-progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <div className="route-progress-labels">
          <span>{progressPercent}% Complete</span>
          <span>{pendingStops} stops remaining</span>
        </div>

        {/* Quick Route Controls */}
        <div className="driver-route-launch-buttons">
          <button
            type="button"
            className="button primary route-plan-btn"
            onClick={launchGoogleMapsMultiRoute}
            disabled={pendingStops === 0}
          >
            <Navigation size={18} />
            <span>Plan Route in Google Maps 🗺️</span>
          </button>
          <button
            type="button"
            className="button secondary compact auto-sort-btn"
            onClick={autoSortByZone}
            title="Sort stops geographically by island and zone"
          >
            <Sparkles size={15} />
            <span>Auto-Sort by Zone</span>
          </button>
        </div>
      </section>

      {/* Stop Filter Tabs */}
      <div className="driver-tabs-bar">
        <button
          type="button"
          className={`driver-nav-tab ${filter === "pending" ? "active" : ""}`}
          onClick={() => setFilter("pending")}
        >
          <span>Pending Stops</span>
          <span className="tab-badge pending-badge">{pendingStops}</span>
        </button>
        <button
          type="button"
          className={`driver-nav-tab ${filter === "delivered" ? "active" : ""}`}
          onClick={() => setFilter("delivered")}
        >
          <span>Delivered</span>
          <span className="tab-badge delivered-badge">{deliveredStops}</span>
        </button>
        <button
          type="button"
          className={`driver-nav-tab ${filter === "all" ? "active" : ""}`}
          onClick={() => setFilter("all")}
        >
          <span>All My Stops</span>
          <span className="tab-badge">{totalStops}</span>
        </button>
        <button
          type="button"
          className={`driver-nav-tab claim-tab ${filter === "claim" ? "active" : ""}`}
          onClick={() => setFilter("claim")}
        >
          <span>➕ Available Stops</span>
          <span className="tab-badge claim-badge">{availableUnassigned.length}</span>
        </button>
      </div>

      {/* Available Stops / Claim Pool View */}
      {filter === "claim" ? (
        <section className="driver-claim-pool" aria-label="Available stops pool">
          <div className="claim-pool-header card">
            <div className="claim-header-titles">
              <h2>Available Stops ({filteredUnassigned.length})</h2>
              <p>Self-assign undelivered households directly to your delivery route.</p>
            </div>

            {/* Island Filter Pills */}
            <div className="claim-island-pills">
              <button
                type="button"
                className={`island-pill ${claimArea === "all" ? "active" : ""}`}
                onClick={() => setClaimArea("all")}
              >
                <span>All Areas</span>
                <span className="pill-count">{availableUnassigned.length}</span>
              </button>
              <button
                type="button"
                className={`island-pill pill-male ${claimArea === "Malé" ? "active" : ""}`}
                onClick={() => setClaimArea("Malé")}
              >
                <span className="pill-dot red-dot" />
                <span>Malé</span>
                <span className="pill-count">{availableUnassigned.filter((r) => r.area === "Malé").length}</span>
              </button>
              <button
                type="button"
                className={`island-pill pill-hulh ${claimArea === "Hulhumalé" ? "active" : ""}`}
                onClick={() => setClaimArea("Hulhumalé")}
              >
                <span className="pill-dot cyan-dot" />
                <span>Hulhumalé</span>
                <span className="pill-count">{availableUnassigned.filter((r) => r.area === "Hulhumalé").length}</span>
              </button>
              <button
                type="button"
                className={`island-pill pill-villi ${claimArea === "Villimalé" ? "active" : ""}`}
                onClick={() => setClaimArea("Villimalé")}
              >
                <span className="pill-dot green-dot" />
                <span>Villimalé</span>
                <span className="pill-count">{availableUnassigned.filter((r) => r.area === "Villimalé").length}</span>
              </button>
            </div>

            {/* Claim Search Bar */}
            <div className="claim-search-bar">
              <Search size={16} className="claim-search-icon" />
              <input
                type="search"
                placeholder="Search addresses, household names, phone…"
                value={claimSearch}
                onChange={(e) => setClaimSearch(e.target.value)}
                className="claim-search-input"
              />
              {claimSearch && (
                <button
                  type="button"
                  className="icon-button compact"
                  onClick={() => setClaimSearch("")}
                  aria-label="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Available Stop Cards List */}
          <div className="claim-stops-list">
            {filteredUnassigned.map((record) => {
              const primary = record.addresses.find((a) => a.isPrimary) || record.addresses[0];
              const fullAddress = addressText(primary);
              const isClaiming = claimingId === record.id;
              const isNotPickingUp = record.deliveryStatus === "not-picking-up";

              return (
                <article key={record.id} className={`card claim-stop-card ${isNotPickingUp ? "is-not-picking-up" : ""}`}>
                  <div className="claim-card-top">
                    <div className="claim-badge-row">
                      {record.area && (
                        <span className={`area-tag tag-${record.area}`}>
                          {record.area}
                        </span>
                      )}
                      <span className="stop-portions-chip">
                        🍲 {record.portions} portion{record.portions === 1 ? "" : "s"}
                      </span>
                      {record.groupName && (
                        <span className="stop-group-chip">{record.groupName}</span>
                      )}
                      <span className={`status-chip status-${record.deliveryStatus || "planned"}`}>
                        {record.deliveryStatus === "prepared"
                          ? "Prepared 📦"
                          : record.deliveryStatus === "out-for-delivery"
                          ? "Out 🛵"
                          : record.deliveryStatus === "not-picking-up"
                          ? "No Answer 📵"
                          : record.deliveryStatus === "paused"
                          ? "Hold ⏸️"
                          : "Planned ⏳"}
                      </span>
                    </div>
                  </div>

                  <div className="claim-recipient-block">
                    <h3 className="claim-name">{record.name}</h3>
                    <div className="stop-address-row">
                      <MapPin size={16} className="address-pin" />
                      <span className="stop-address-text">{fullAddress}</span>
                      {primary?.addressLine1 && (
                        <button
                          type="button"
                          className="icon-button compact copy-icon-btn"
                          onClick={() => void handleCopy(record.id, fullAddress)}
                          title="Copy address"
                          aria-label="Copy address"
                        >
                          {copiedId === record.id ? <Check size={13} className="copied-icon" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                    {record.notes && (
                      <p className="stop-delivery-note">
                        <strong>Note:</strong> {record.notes}
                      </p>
                    )}
                    {isNotPickingUp && (
                      <div className="not-picking-up-banner">
                        <PhoneOff size={14} />
                        <span>Previous attempt: Recipient not picking up call</span>
                      </div>
                    )}
                  </div>

                  <div className="claim-actions-row">
                    <button
                      type="button"
                      className="button secondary compact preview-map-btn"
                      onClick={() =>
                        setMapTarget({
                          title: record.name,
                          address: fullAddress,
                          area: record.area,
                          phone: record.phone,
                          portions: record.portions,
                          status: record.deliveryStatus,
                          notes: record.notes,
                        })
                      }
                      title="Preview map location"
                    >
                      <Compass size={15} />
                      <span>Map Preview</span>
                    </button>
                    <button
                      type="button"
                      className="button primary claim-assign-btn"
                      onClick={() => void handleClaimRecord(record)}
                      disabled={isClaiming}
                    >
                      <UserCheck size={16} />
                      <span>{isClaiming ? "Assigning…" : "Assign to Me 🛵"}</span>
                    </button>
                  </div>
                </article>
              );
            })}

            {!filteredUnassigned.length && (
              <div className="card driver-empty-card">
                <p>No available unassigned stops matching your search.</p>
                {claimSearch && (
                  <button
                    type="button"
                    className="button secondary compact"
                    onClick={() => { setClaimSearch(""); setClaimArea("all"); }}
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      ) : (
        <>
          {/* All Delivered Celebration Banner */}
          {totalStops > 0 && pendingStops === 0 && filter === "pending" && (
            <section className="card driver-celebration-card" aria-label="Deliveries completed">
              <div className="celebration-icon">🎉</div>
              <h2>All deliveries completed!</h2>
              <p>Great job, {driver.name}! All {totalStops} assigned households have received their Bondibai.</p>
              <button
                type="button"
                className="button secondary"
                onClick={() => setFilter("all")}
              >
                View All Completed Stops
              </button>
            </section>
          )}

          {/* Stop Cards List */}
          <section className="driver-stops-container" aria-label="Delivery stop list">
            {visibleStops.map((record) => {
              const index = orderedRecords.findIndex((r) => r.id === record.id);
              const primary = record.addresses.find((a) => a.isPrimary) || record.addresses[0];
              const fullAddress = addressText(primary);
              const cleanPhone = cleanMaldivesPhone(record.phone);
              const isDone = record.deliveryStatus === "delivered";
              const isNotPickingUp = record.deliveryStatus === "not-picking-up";

              // Clean WhatsApp arrival message WITHOUT mentioning portion counts
              const waMessage = `Assalaamu Alaikum! Bondibai delivery for ${record.name}. I am approaching your address at ${fullAddress}.\n\n✨ _Bondibai App_`;
              const waUrl = cleanPhone
                ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(waMessage)}`
                : null;

              return (
                <article
                  key={record.id}
                  className={`driver-stop-card card ${isDone ? "is-delivered" : isNotPickingUp ? "is-not-picking-up" : ""}`}
                >
                  {/* Card Header & Sequencing */}
                  <div className="stop-card-header">
                    <div className="stop-badge-row">
                      <span className="stop-number">#{index + 1}</span>
                      {record.area && (
                        <span className={`area-tag tag-${record.area}`}>
                          {record.area}
                        </span>
                      )}
                      <span className="stop-portions-chip">
                        🍲 {record.portions} portion{record.portions === 1 ? "" : "s"}
                      </span>
                      {record.groupName && (
                        <span className="stop-group-chip">{record.groupName}</span>
                      )}
                    </div>

                    <div className="stop-reorder-actions">
                      <button
                        type="button"
                        className="icon-button reorder-btn"
                        onClick={() => moveStop(index, "up")}
                        disabled={index === 0}
                        aria-label={`Move stop ${index + 1} up`}
                        title="Move stop up"
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button
                        type="button"
                        className="icon-button reorder-btn"
                        onClick={() => moveStop(index, "down")}
                        disabled={index === orderedRecords.length - 1}
                        aria-label={`Move stop ${index + 1} down`}
                        title="Move stop down"
                      >
                        <ArrowDown size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Household Name & Address */}
                  <div className="stop-recipient-block">
                    <h2 className="stop-name">{record.name}</h2>
                    <div className="stop-address-row">
                      <MapPin size={16} className="address-pin" />
                      <span className="stop-address-text">{fullAddress}</span>
                      {primary?.addressLine1 && (
                        <button
                          type="button"
                          className="icon-button compact copy-icon-btn"
                          onClick={() => void handleCopy(record.id, fullAddress)}
                          title="Copy address"
                          aria-label="Copy address"
                        >
                          {copiedId === record.id ? <Check size={13} className="copied-icon" /> : <Copy size={13} />}
                        </button>
                      )}
                    </div>
                    {record.notes && (
                      <p className="stop-delivery-note">
                        <strong>Note:</strong> {record.notes}
                      </p>
                    )}
                    {isNotPickingUp && (
                      <div className="not-picking-up-banner">
                        <PhoneOff size={14} />
                        <span>Recipient not picking up call · Retrying contact</span>
                      </div>
                    )}
                  </div>

                  {/* 1-Tap Action Buttons Grid */}
                  <div className="driver-action-grid">
                    {/* 1-Tap High Contrast Call Button */}
                    {record.phone ? (
                      <a
                        href={`tel:${record.phone}`}
                        className="driver-action-btn call-customer-btn"
                        title={`Call ${record.name} at ${record.phone}`}
                      >
                        <Phone size={17} />
                        <span>Call</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="driver-action-btn disabled-btn"
                        disabled
                      >
                        <Phone size={17} />
                        <span>No Phone</span>
                      </button>
                    )}

                    {/* WhatsApp Arrival Notice */}
                    {waUrl ? (
                      <a
                        href={waUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="driver-action-btn wa-customer-btn"
                        title="Send WhatsApp arrival notice"
                      >
                        <MessageSquare size={17} />
                        <span>WhatsApp</span>
                      </a>
                    ) : (
                      <button
                        type="button"
                        className="driver-action-btn disabled-btn"
                        disabled
                      >
                        <MessageSquare size={17} />
                        <span>No WhatsApp</span>
                      </button>
                    )}

                    {/* Single Stop GPS Directions */}
                    <button
                      type="button"
                      className="driver-action-btn nav-gps-btn"
                      onClick={() => launchSingleStopNav(record, primary)}
                      title="Open GPS Navigation in Google Maps"
                    >
                      <Navigation size={17} />
                      <span>Navigate</span>
                    </button>

                    {/* In-App Map Preview */}
                    <button
                      type="button"
                      className="driver-action-btn preview-map-btn"
                      onClick={() =>
                        setMapTarget({
                          title: record.name,
                          address: fullAddress,
                          area: record.area,
                          phone: record.phone,
                          portions: record.portions,
                          status: record.deliveryStatus,
                          notes: record.notes,
                        })
                      }
                      title="Preview map location"
                    >
                      <Compass size={17} />
                      <span>Preview</span>
                    </button>
                  </div>

                  {/* 1-Tap Delivery Status Confirmation, No Answer & Release Option */}
                  <div className="stop-footer-toggle">
                    <button
                      type="button"
                      className={`button stop-delivered-toggle ${isDone ? "is-delivered-btn" : "is-pending-btn"}`}
                      onClick={() => void handleToggleDelivered(record)}
                    >
                      {isDone ? (
                        <>
                          <CheckCircle2 size={18} />
                          <span>Delivered ✅ (Tap to undo)</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={18} />
                          <span>Mark Delivered ✅</span>
                        </>
                      )}
                    </button>
                    {!isDone && (
                      <>
                        <button
                          type="button"
                          className={`not-picking-up-btn ${isNotPickingUp ? "is-active" : ""}`}
                          onClick={() => void handleToggleNotPickingUp(record)}
                          title={isNotPickingUp ? "Reset call status to planned" : "Mark as Not Picking Up"}
                        >
                          <PhoneOff size={14} />
                          <span>{isNotPickingUp ? "No Answer 📵" : "No Answer"}</span>
                        </button>
                        <button
                          type="button"
                          className="button secondary ghost compact release-stop-btn"
                          onClick={() => void handleReleaseRecord(record)}
                          title="Release this stop back to available stops"
                        >
                          <UserMinus size={14} />
                          <span>Release</span>
                        </button>
                      </>
                    )}
                  </div>
                </article>
              );
            })}

            {/* Empty States */}
            {!visibleStops.length && totalStops > 0 && filter === "delivered" && (
              <div className="card subtle-empty-card">
                <p>No deliveries completed yet. Tap "Mark Delivered" as you finish each stop.</p>
              </div>
            )}

            {totalStops === 0 && (
              <section className="card driver-empty-card">
                <div className="empty-icon"><Truck size={36} /></div>
                <h2>No deliveries assigned yet</h2>
                <p>You do not currently have any assigned households on your active route.</p>
                {availableUnassigned.length > 0 && (
                  <button
                    type="button"
                    className="button primary"
                    onClick={() => setFilter("claim")}
                  >
                    <Plus size={16} />
                    <span>Claim Available Stops ({availableUnassigned.length})</span>
                  </button>
                )}
              </section>
            )}
          </section>
        </>
      )}

      {/* In-App Google Maps Preview Modal */}
      {mapTarget && (
        <MapModal
          target={mapTarget}
          onClose={() => setMapTarget(null)}
        />
      )}
    </div>
  );
}
