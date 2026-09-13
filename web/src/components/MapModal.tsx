import {
  Check,
  Compass,
  Copy,
  ExternalLink,
  Globe,
  MapPin,
  MessageSquare,
  Navigation,
  Phone,
  X,
} from "lucide-react";
import { useState } from "react";
import { getPreferredMap, MAP_PROVIDERS, setPreferredMap, type MapProvider } from "../types";

export interface MapModalTarget {
  title: string;
  address?: string;
  area?: string;
  phone?: string;
  portions?: number;
  status?: string;
  notes?: string;
}

interface Props {
  target: MapModalTarget | null;
  onClose: () => void;
  onSelectPreferredMap?: (provider: MapProvider) => void;
}

function cleanMaldivesPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("960")) return digits;
  if (digits.length === 7) return `960${digits}`;
  return digits;
}

export function MapModal({ target, onClose, onSelectPreferredMap }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<MapProvider>(getPreferredMap());

  if (!target) return null;

  const address = (target.address || "").trim();
  const area = target.area || "Malé";
  const query = address ? (address.toLowerCase().includes(area.toLowerCase()) ? address : `${address}, ${area}`) : `${target.title}, ${area}`;
  const encodedQuery = encodeURIComponent(`${query} Maldives`);
  const embedUrl = `https://maps.google.com/maps?q=${encodedQuery}&t=&z=16&ie=UTF8&iwloc=&output=embed`;

  const cleanPhone = cleanMaldivesPhone(target.phone);
  const waUrl = cleanPhone
    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(`Assalaamu Alaikum! Bondibai delivery for ${target.title}${target.portions ? ` (${target.portions} portion${target.portions === 1 ? "" : "s"})` : ""}.`)}`
    : null;

  const handleCopyAddress = async () => {
    if (!address && !query) return;
    try {
      await navigator.clipboard.writeText(address || query);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const handleCopyPhone = async () => {
    if (!target.phone) return;
    try {
      await navigator.clipboard.writeText(target.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  const launchMap = (providerKey: MapProvider) => {
    const url = MAP_PROVIDERS[providerKey].getUrl(query);
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleSetPreferred = (p: MapProvider) => {
    setSelectedProvider(p);
    setPreferredMap(p);
    if (onSelectPreferredMap) onSelectPreferredMap(p);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal map-modal-dialog"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="map-modal-title"
      >
        {/* Header */}
        <div className="map-modal-header">
          <div className="map-modal-title-group">
            <div className="map-modal-badges">
              {target.area && <span className={`area-tag tag-${target.area}`}>{target.area}</span>}
              {target.portions && (
                <span className="portion-count-badge">
                  {target.portions} portion{target.portions === 1 ? "" : "s"}
                </span>
              )}
              {target.status && (
                <span className={`status-chip status-${target.status}`}>
                  {target.status.replaceAll("-", " ")}
                </span>
              )}
            </div>
            <h2 id="map-modal-title">{target.title}</h2>
          </div>
          <button
            type="button"
            className="icon-button modal-close-btn"
            onClick={onClose}
            aria-label="Close map"
          >
            <X size={18} />
          </button>
        </div>

        <div className="modal-body map-modal-body">
          {/* Address Details Card */}
          <div className="map-modal-address-card">
            <div className="address-icon-wrap">
              <MapPin size={18} />
            </div>
            <div className="address-text-wrap">
              <span className="address-label">Delivery Address</span>
              <p className="address-full">{address || "No street address entered yet"}</p>
            </div>
            {(address || query) && (
              <button
                type="button"
                className="button secondary compact copy-btn"
                onClick={handleCopyAddress}
                title="Copy address"
              >
                {copied ? <Check size={14} className="copied-icon" /> : <Copy size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            )}
          </div>

          {/* Phone & Quick Contact Row */}
          {target.phone && (
            <div className="map-modal-contact-row">
              <span className="contact-phone">📞 {target.phone}</span>
              <div className="contact-actions-group">
                <a href={`tel:${target.phone}`} className="card-action-chip phone-action">
                  <Phone size={13} /> Call
                </a>
                {waUrl && (
                  <a
                    href={waUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="card-action-chip wa-action"
                  >
                    <MessageSquare size={13} /> WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  className="card-action-chip copy-phone-chip"
                  onClick={handleCopyPhone}
                >
                  {copiedPhone ? "Copied" : "Copy"}
                </button>
              </div>
            </div>
          )}

          {/* Delivery Notes */}
          {target.notes && (
            <div className="map-modal-notes-box">
              <strong>Delivery Notes:</strong>
              <p>{target.notes}</p>
            </div>
          )}

          {/* Live In-Modal Map Preview */}
          <div className="map-modal-preview">
            <div className="preview-top-bar">
              <span className="preview-label">
                <Compass size={14} /> Live Map Preview
              </span>
              <span className="preview-badge">Interactive</span>
            </div>
            <iframe
              title={`Map preview for ${target.title}`}
              src={embedUrl}
              className="map-modal-iframe"
              loading="lazy"
              allowFullScreen
            />
          </div>

          {/* External Map Launch Section */}
          <div className="map-modal-launcher-section">
            <div className="launcher-header">
              <h3>Open in Map App / Web</h3>
              <p>Navigate directly in your preferred map</p>
            </div>

            {/* Primary Large Button */}
            <button
              type="button"
              className="button primary map-modal-primary-btn"
              onClick={() => launchMap(selectedProvider)}
            >
              <span>Open in {MAP_PROVIDERS[selectedProvider].label}</span>
              <ExternalLink size={16} />
            </button>

            {/* 4-Grid Provider Selector */}
            <div className="map-modal-provider-grid">
              {/* Eatolls */}
              <button
                type="button"
                className={`provider-card provider-eatolls ${selectedProvider === "eatolls" ? "selected" : ""}`}
                onClick={() => {
                  handleSetPreferred("eatolls");
                  launchMap("eatolls");
                }}
              >
                <div className="provider-card-icon">
                  <Globe size={20} />
                </div>
                <div className="provider-card-info">
                  <strong>Eatolls 🇲🇻</strong>
                  <small>Maldives House Names</small>
                </div>
                <ExternalLink size={13} className="ext-icon" />
              </button>

              {/* Google Maps */}
              <button
                type="button"
                className={`provider-card provider-google ${selectedProvider === "google" ? "selected" : ""}`}
                onClick={() => {
                  handleSetPreferred("google");
                  launchMap("google");
                }}
              >
                <div className="provider-card-icon">
                  <Compass size={20} />
                </div>
                <div className="provider-card-info">
                  <strong>Google Maps 📍</strong>
                  <small>Turn-by-turn Navigation</small>
                </div>
                <ExternalLink size={13} className="ext-icon" />
              </button>

              {/* Apple Maps */}
              <button
                type="button"
                className={`provider-card provider-apple ${selectedProvider === "apple" ? "selected" : ""}`}
                onClick={() => {
                  handleSetPreferred("apple");
                  launchMap("apple");
                }}
              >
                <div className="provider-card-icon">
                  <Navigation size={20} />
                </div>
                <div className="provider-card-info">
                  <strong>Apple Maps 🍏</strong>
                  <small>iOS & macOS Native</small>
                </div>
                <ExternalLink size={13} className="ext-icon" />
              </button>

              {/* Waze */}
              <button
                type="button"
                className={`provider-card provider-waze ${selectedProvider === "waze" ? "selected" : ""}`}
                onClick={() => {
                  handleSetPreferred("waze");
                  launchMap("waze");
                }}
              >
                <div className="provider-card-icon">
                  <Navigation size={20} />
                </div>
                <div className="provider-card-info">
                  <strong>Waze 🚗</strong>
                  <small>Traffic & Driving</small>
                </div>
                <ExternalLink size={13} className="ext-icon" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
