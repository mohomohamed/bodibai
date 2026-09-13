import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { lockBodyScroll, unlockBodyScroll } from "../scrollLock";

export function Modal({ title, onClose, children, wide = false }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const prevActive = document.activeElement as HTMLElement | null;
    lockBodyScroll();
    return () => {
      unlockBodyScroll();
      if (prevActive && typeof prevActive.focus === "function") {
        try {
          prevActive.focus({ preventScroll: true });
        } catch {
          // ignore
        }
      }
    };
  }, []);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-button" type="button" onClick={onClose} aria-label="Close"><X size={20} /></button>
        </header>
        <div className="modal-body">{children}</div>
      </section>
    </div>
  );
}

