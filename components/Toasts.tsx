"use client";

import { useSyncExternalStore } from "react";
import { dismissToast, getToasts, subscribeToasts, type Toast } from "../lib/toast";

export function useToasts(): Toast[] {
  return useSyncExternalStore(
    subscribeToasts,
    getToasts,
    () => EMPTY,
  );
}

const EMPTY: Toast[] = [];

export function Toasts() {
  const toasts = useToasts();
  if (!toasts.length) return null;
  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast${t.leaving ? " is-out" : ""}`}>
          <span className="truncate">{t.text}</span>
          {t.action ? (
            <button
              type="button"
              className="btn btn-sm btn-quiet"
              onClick={() => {
                t.action?.onClick();
                dismissToast(t.id, true);
              }}
            >
              {t.action.label}
            </button>
          ) : null}
          <button
            type="button"
            className="icon-btn"
            style={{ width: 22, height: 22 }}
            aria-label="Dismiss"
            onClick={() => dismissToast(t.id)}
          >
            <CloseGlyph />
          </button>
        </div>
      ))}
    </div>
  );
}

function CloseGlyph() {
  return (
    <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" aria-hidden="true">
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}
