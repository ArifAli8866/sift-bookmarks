"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "./Icon";

export interface MenuEntry {
  id: string;
  label: string;
  icon?: IconName;
  kbd?: string;
  trail?: string;
  danger?: boolean;
  disabled?: boolean;
  checked?: boolean;
  header?: string;
  onSelect?: () => void;
}

export interface MenuPoint {
  x: number;
  y: number;
}

let openCount = 0;
export function hasOpenMenu() {
  return openCount > 0;
}

const MARGIN = 8;
const GAP = 6;

export function Menu({
  open,
  anchor,
  point,
  entries,
  onClose,
  align = "start",
  width,
}: {
  open: boolean;
  anchor?: HTMLElement | null;
  point?: MenuPoint | null;
  entries: MenuEntry[];
  onClose: () => void;
  align?: "start" | "end";
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ left: number; top: number; origin: string } | null>(null);
  const [active, setActive] = useState(0);

  useLayoutEffect(() => {
    if (!open) {
      setBox(null);
      setActive(0);
      return;
    }
    const el = ref.current;
    if (!el) return;
    const w = width ?? el.offsetWidth;
    const h = el.offsetHeight;
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const rect = anchor?.getBoundingClientRect();
    let left = point ? point.x : rect ? (align === "end" ? rect.right - w : rect.left) : 0;
    let top = point ? point.y : rect ? rect.bottom + GAP : 0;
    let originY = "top";
    let originX = align === "end" ? "right" : "left";

    if (rect && align === "end") originX = "right";
    if (top + h > vh - MARGIN) {
      if (rect && rect.top - GAP - h > MARGIN) {
        top = rect.top - GAP - h;
        originY = "bottom";
      } else {
        top = Math.max(MARGIN, vh - MARGIN - h);
      }
    }
    if (left + w > vw - MARGIN) {
      left = Math.max(MARGIN, vw - MARGIN - w);
      originX = "right";
    }
    left = Math.max(MARGIN, left);

    setBox({ left, top, origin: `${originY} ${originX}` });
    const first = entries.findIndex((e) => !e.disabled && e.onSelect);
    setActive(first === -1 ? 0 : first);
  }, [open, anchor, point, width, align, entries]);

  useEffect(() => {
    if (!open) return;
    openCount += 1;
    const node = ref.current;
    // Chrome re-focuses the right-clicked element after `contextmenu`, which
    // undoes a synchronous focus() from an effect. Defer one frame so arrow
    // keys and Enter land inside the menu.
    const raf = requestAnimationFrame(() => node?.focus({ preventScroll: true }));
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    // Escape must close the menu even when focus never made it inside.
    window.addEventListener("keydown", onKey, true);

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (node?.contains(target)) return;
      if (anchor && anchor.contains(target)) return;
      onClose();
    };
    window.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      openCount -= 1;
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open, onClose, anchor]);

  if (!open) return null;

  const selectable = entries.filter((e) => e.onSelect);
  const move = (delta: number) => {
    if (!selectable.length) return;
    const currentIndex = selectable.findIndex((s) => s.id === entries[active]?.id);
    let next = currentIndex;
    for (let step = 0; step < entries.length; step += 1) {
      next = (next + delta + entries.length) % entries.length;
      const candidate = entries[next];
      if (candidate && !candidate.disabled && candidate.onSelect) break;
    }
    setActive(next);
    ref.current?.querySelector<HTMLElement>(`[data-menu-index="${next}"]`)?.scrollIntoView({
      block: "nearest",
    });
  };

  const commit = (entry: MenuEntry | undefined) => {
    if (!entry || entry.disabled) return;
    entry.onSelect?.();
    onClose();
  };

  return createPortal(
    <div
      ref={ref}
      className="popover"
      role="menu"
      tabIndex={-1}
      data-layer="menu"
      style={{
        left: box?.left ?? -9999,
        top: box?.top ?? -9999,
        visibility: box ? undefined : "hidden",
        width,
        ["--pop-origin" as string]: box?.origin ?? "top left",
      }}
      onMouseDown={(e) => e.preventDefault()}
      onKeyDown={(e) => {
        if (e.key === "ArrowDown") {
          e.preventDefault();
          move(1);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          move(-1);
        } else if (e.key === "Home") {
          e.preventDefault();
          setActive(0);
        } else if (e.key === "End") {
          e.preventDefault();
          setActive(entries.length - 1);
        } else if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          commit(entries[active]);
        } else if (e.key === "Escape") {
          e.preventDefault();
          onClose();
        }
      }}
    >
      {entries.map((entry, index) => {
        if (entry.id.startsWith("sep")) return <div key={`sep${index}`} className="menu-sep" role="separator" />;
        return (
          <div key={entry.id}>
            {entry.header ? <div className="menu-label">{entry.header}</div> : null}
            <button
              type="button"
              role="menuitem"
              data-menu-index={index}
              data-active={box && index === active ? "true" : undefined}
              aria-disabled={entry.disabled ? "true" : undefined}
              className={`menu-item${entry.danger ? " is-danger" : ""}`}
              onMouseEnter={() => !entry.disabled && setActive(index)}
              onClick={() => commit(entry)}
            >
              {entry.checked ? (
                <Icon name="check" size={14} className="icon" />
              ) : entry.icon ? (
                <Icon name={entry.icon} size={15} className="icon" />
              ) : (
                <span className="icon" style={{ width: 15 }} />
              )}
              <span className="truncate">{entry.label}</span>
              {entry.kbd ? <span className="menu-trail">{entry.kbd}</span> : null}
              {entry.trail ? <span className="menu-trail">{entry.trail}</span> : null}
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}

/** Convenience hook for the "row menu" pattern used all over the app. */
export function useMenuState() {
  const [state, setState] = useState<{
    anchor: HTMLElement | null;
    point: MenuPoint | null;
    entries: MenuEntry[];
    width?: number;
  } | null>(null);

  const open = (entries: MenuEntry[], anchor: HTMLElement, at?: MenuPoint, width?: number) =>
    setState({ anchor, point: at ?? null, entries, width });

  const menu = state ? (
    <Menu
      open
      anchor={state.anchor}
      point={state.point}
      width={state.width}
      entries={state.entries}
      onClose={() => setState(null)}
    />
  ) : null;

  return { menu, open, close: () => setState(null) };
}
