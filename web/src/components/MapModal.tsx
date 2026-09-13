import {
  Check,
  Compass,
  Copy,
  ExternalLink,
  MapPin,
  MessageSquare,
  Phone,
  X,
} from "lucide-react";
import { useState } from "react";
import { getGoogleMapsEmbedUrl, getGoogleMapsUrl } from "../types";

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
}

function cleanMaldivesPhone(phone?: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("960")) return digits;
  if (digits.length === 7) return `960${digits}`;
  return digits;
}

export function MapModal({ target, onClose }: Props) {
  const [copied, setCopied] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);

  if (!target) return null;

  const address = (target.address || "").trim();
  const area = target.area || "Malé";
  const query = address ? (address.toLowerCase().includes(area.toLowerCase()) ? address : `${address}, ${area}`) : `${target.title}, ${area}`;
  const embedUrl = getGoogleMapsEmbedUrl(query);
  const googleMapsUrl = getGoogleMapsUrl(query);

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
      // ignore
    }
  };

  const handleCopyPhone = async () => {
    if (!target.phone) return;
    try {
      await navigator.clipboard.writeText(target.phone);
      setCopiedPhone(true);
      setTimeout(() => setCopiedPhone(false), 2000);
    } catch {
      // ignore
    }
  };

  const launchGoogleMaps = () => {
    window.open(googleMapsUrl, "_blank", "noopener,noreferrer");
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

          {/* Phone & Contact Row */}
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

          {/* Live In-Modal Google Map Preview */}
          <div className="map-modal-preview">
            <div className="preview-top-bar">
              <span className="preview-label">
                <Compass size={14} /> Google Maps Preview
              </span>
              <span className="preview-badge">Live View</span>
            </div>
            <iframe
              title={`Google Map preview for ${target.title}`}
              src={embedUrl}
              className="map-modal-iframe"
              loading="lazy"
              allowFullScreen
            />
          </div>

          {/* Primary Action Button */}
          <div className="map-modal-launcher-section">
            <button
              type="button"
              className="button primary map-modal-primary-btn"
              onClick={launchGoogleMaps}
            >
              <span>Open in Google Maps 📍</span>
              <ExternalLink size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
