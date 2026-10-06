"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";
import {
  getState,
  getServerState,
  hydrate,
  subscribe,
  type LibraryState,
} from "./store";

export function useLibrary(): LibraryState {
  return useSyncExternalStore(subscribe, getState, getServerState);
}

/** Read-only action bag + one-time hydration. */
export function useLibraryReady() {
  useEffect(() => {
    hydrate();
  }, []);
}

export function useMediaQuery(query: string): boolean {
  const matches = useCallback(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  }, [query]);
  return useSyncExternalStore(
    (onStoreChange) => {
      if (typeof window === "undefined" || !window.matchMedia) return () => {};
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onStoreChange);
      return () => mql.removeEventListener("change", onStoreChange);
    },
    matches,
    () => false,
  );
}

export function usePrefersReducedMotion(): boolean {
  return useMediaQuery("(prefers-reduced-motion: reduce)");
}

/** Overlay plumbing: Escape to close + dismiss on pointerdown outside. */
export function useDismiss(
  active: boolean,
  onClose: () => void,
  refs: (React.RefObject<HTMLElement | null> | null | undefined)[],
) {
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      for (const ref of refs) {
        if (ref?.current?.contains(target)) return;
      }
      onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onPointer, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointer, true);
    };
  }, [active, onClose, refs]);
}

/** Body scroll lock while a modal or sheet is open. */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [active]);
}

/** Keeps focus inside a container (Tab cycling) and restores it on unmount. */
export function useFocusTrap<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
  active: boolean,
  autofocusSelector?: string,
) {
  useEffect(() => {
    const node = ref.current;
    if (!active || !node) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;

    const focusables = () =>
      Array.from(
        node.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),textarea,select,[tabindex]:not([tabindex="-1"]),[contenteditable]',
        ),
      ).filter((el) => el.offsetParent !== null || el === document.activeElement);

    if (autofocusSelector) {
      const target = node.querySelector<HTMLElement>(autofocusSelector);
      (target ?? node).focus({ preventScroll: true });
    } else {
      // Informational sheets take focus on the container itself: the trap is
      // armed, but nothing opens with a focus ring already on it.
      node.focus({ preventScroll: true });
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0] as HTMLElement;
      const last = items[items.length - 1] as HTMLElement;
      const active_ = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active_ === first || !node.contains(active_))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && active_ === last) {
        e.preventDefault();
        first.focus();
      }
    };

    node.addEventListener("keydown", onKeyDown);
    return () => {
      node.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [ref, active, autofocusSelector]);
}
