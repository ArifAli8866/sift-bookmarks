"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useFocusTrap, useScrollLock } from "../lib/hooks";
import { hasOpenMenu } from "./Menu";

const EXIT_MS = 200;

function reducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true
  );
}

/**
 * One place where dialog plumbing lives: portal, scrim, focus trap, scroll
 * lock, Escape, and — critically — a real exit animation. Overlays that
 * vanish instantly feel cheap; overlays that fade for 400ms feel sluggish.
 * 200ms out / 210ms in, with different curves, is the sweet spot.
 */
export function Overlay({
  open,
  onClose,
  align = "center",
  className = "dialog",
  labelledBy,
  describedBy,
  initialFocus,
  children,
  dismissible = true,
}: {
  open: boolean;
  onClose: () => void;
  align?: "center" | "top";
  className?: string;
  labelledBy?: string;
  describedBy?: string;
  initialFocus?: string;
  children: ReactNode;
  dismissible?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [closing, setClosing] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setClosing(false);
      return;
    }
    if (!mounted) return;
    setClosing(true);
    const t = window.setTimeout(() => {
      setMounted(false);
      setClosing(false);
    }, reducedMotion() ? 1 : EXIT_MS);
    return () => window.clearTimeout(t);
  }, [open, mounted]);

  useScrollLock(mounted);
  useFocusTrap(boxRef, mounted && !closing, initialFocus);

  useEffect(() => {
    if (!mounted || !dismissible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      // A menu sitting on top of this overlay owns Escape first.
      if (hasOpenMenu()) return;
      e.preventDefault();
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mounted, dismissible, onClose]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="overlay"
      data-align={align}
      data-closing={closing ? "true" : undefined}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).dataset.scrim === "") onClose();
      }}
    >
      <div className="overlay-scrim" data-scrim="" />
      <div
        ref={boxRef}
        className={className}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
        tabIndex={-1}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
