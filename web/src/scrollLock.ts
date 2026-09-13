let lockCount = 0;
let savedScrollY = 0;

/**
 * Reference-counted body scroll lock manager.
 * Captures the exact window scroll offset upon first lock and freezes scrolling.
 */
export function lockBodyScroll(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  if (lockCount === 0) {
    savedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
  }
  lockCount += 1;
}

/**
 * Releases body scroll lock when all active modal instances have unmounted.
 * Restores the exact scroll position instantly without page jump.
 */
export function unlockBodyScroll(): void {
  if (typeof window === "undefined" || typeof document === "undefined") return;

  lockCount = Math.max(0, lockCount - 1);
  if (lockCount === 0) {
    document.body.style.overflow = "";
    document.documentElement.style.overflow = "";

    const restoreY = savedScrollY;
    requestAnimationFrame(() => {
      window.scrollTo({ top: restoreY, left: 0, behavior: "instant" as ScrollBehavior });
    });
  }
}
