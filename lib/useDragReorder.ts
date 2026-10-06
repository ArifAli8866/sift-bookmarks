"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Rect {
  left: number;
  top: number;
  width: number;
  height: number;
}

interface Snapshot {
  rects: Rect[];
  nodes: HTMLElement[];
  ids: string[];
}

interface DragCtx extends Snapshot {
  id: string;
  index: number;
  target: number;
  el: HTMLElement;
  grabX: number;
  grabY: number;
  lastShift: Map<HTMLElement, string>;
}

const swallow = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

interface Arm extends Snapshot {
  x: number;
  y: number;
  index: number;
  el: HTMLElement;
}

const ITEM_ATTR = "data-drag-id";
const ITEM_SEL = `[${ITEM_ATTR}]`;
/** Real controls never start a drag. */
const INTERACTIVE = "button,input,textarea,select,[data-no-drag]";
/**
 * The card's "stretched link" overlay (an `<a>` whose ::after paints the
 * whole card, so a plain click opens it) sits under the pointer everywhere.
 * It is marked with this attribute, and it is allowed to become a drag handle:
 * clicking still opens the link, and only a deliberate 4px pull reorders.
 */
const STRETCH = "[data-stretch]";
const ARM_DISTANCE = 4;

function snapshot(root: HTMLElement): Snapshot {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(ITEM_SEL));
  return {
    nodes,
    ids: nodes.map((n) => n.dataset.dragId ?? ""),
    rects: nodes.map((n) => {
      const r = n.getBoundingClientRect();
      return { left: r.left, top: r.top, width: r.width, height: r.height };
    }),
  };
}

/**
 * Pointer-based reordering with live neighbour shifting and a FLIP settle.
 *
 * Three deliberate decisions:
 *  · The whole card is the handle — you grab what you see, no grip gutter.
 *    A 4px travel threshold keeps a click a click and a scroll a scroll.
 *  · Everything that happens 60× a second is written straight to the DOM;
 *    React renders exactly once, on drop.
 *  · Motion uses only `transform` + `transition`, so the gesture stays on
 *    the compositor and reads as mass rather than as decoration.
 */
export function useDragReorder(options: {
  containerRef: React.RefObject<HTMLElement | null>;
  ids: string[];
  enabled: boolean;
  onDrop: (id: string, from: number, to: number) => void;
}) {
  const { containerRef, enabled, onDrop } = options;
  const ctx = useRef<DragCtx | null>(null);
  const arm = useRef<Arm | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const refreshRects = useCallback(() => {
    const root = containerRef.current;
    if (!root || !ctx.current) return;
    ctx.current.rects = snapshot(root).rects;
  }, [containerRef]);

  // Slots move under our feet while the list scrolls or resizes.
  useEffect(() => {
    if (!draggingId) return;
    const root = containerRef.current;
    window.addEventListener("scroll", refreshRects, true);
    const ro = root ? new ResizeObserver(refreshRects) : null;
    if (root && ro) ro.observe(root);
    return () => {
      window.removeEventListener("scroll", refreshRects, true);
      ro?.disconnect();
    };
  }, [containerRef, draggingId, refreshRects]);

  useEffect(() => {
    if (!enabled) return;
    const root = containerRef.current;
    if (!root) return;
    // Set once a gesture wins the 4px race; consumed by the click that follows.
    let suppressed = false;

    const setShift = (node: HTMLElement, dx: number, dy: number) => {
      const c = ctx.current;
      if (!c) return;
      const key = `${dx.toFixed(1)}:${dy.toFixed(1)}`;
      if (c.lastShift.get(node) === key) return;
      c.lastShift.set(node, key);
      node.style.transform = dx === 0 && dy === 0 ? "" : `translate3d(${dx}px, ${dy}px, 0)`;
    };

    const begin = (a: Arm) => {
      const rect = a.rects[a.index];
      if (!rect) return;
      root.classList.add("is-dragging");
      document.documentElement.classList.add("is-reordering");
      a.el.classList.add("is-drag-source");
      a.el.style.zIndex = "6";
      // The grab offset is measured from the pointerDOWN position: the card has
      // already travelled the 4px arming distance, so using the current event
      // here would bake that distance into every subsequent frame as a phantom
      // offset (visible as a jump on pick-up, and a slot-off drop index).
      ctx.current = {
        rects: a.rects,
        nodes: a.nodes,
        ids: a.ids,
        id: a.el.dataset.dragId ?? "",
        index: a.index,
        target: a.index,
        el: a.el,
        grabX: a.x - rect.left,
        grabY: a.y - rect.top,
        lastShift: new Map(),
      };
      setDraggingId(ctx.current.id);
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0 || ctx.current) return;
      const origin = e.target as HTMLElement | null;
      if (!origin?.closest) return;
      const hit = origin.closest<HTMLElement>(INTERACTIVE);
      if (hit && !hit.matches(STRETCH)) return;
      const el = origin.closest<HTMLElement>(ITEM_SEL);
      if (!el) return;
      const snap = snapshot(root);
      const index = snap.ids.indexOf(el.dataset.dragId ?? "");
      if (index === -1) return;
      arm.current = { ...snap, x: e.clientX, y: e.clientY, index, el };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!ctx.current && arm.current) {
        const a = arm.current;
        if (Math.abs(e.clientX - a.x) + Math.abs(e.clientY - a.y) < ARM_DISTANCE) return;
        e.preventDefault();
        a.el.setPointerCapture?.(e.pointerId);
        suppressed = true;
        begin(a);
        arm.current = null;
      }

      const c = ctx.current;
      if (!c) return;
      const from = c.rects[c.index];
      if (!from) return;
      const x = e.clientX - c.grabX - from.left;
      const y = e.clientY - c.grabY - from.top;
      c.el.style.transform = `translate3d(${x}px, ${y}px, 0) scale(1.014)`;

      // Closest-centre slot assignment: predictable in two-dimensional grids,
      // unlike index arithmetic derived from a single axis.
      const centerX = from.left + from.width / 2 + x;
      const centerY = from.top + from.height / 2 + y;
      let best = c.index;
      let bestDist = Number.POSITIVE_INFINITY;
      c.rects.forEach((r, i) => {
        const dist = (r.left + r.width / 2 - centerX) ** 2 + (r.top + r.height / 2 - centerY) ** 2;
        if (dist < bestDist) {
          bestDist = dist;
          best = i;
        }
      });

      if (best !== c.target) {
        c.rects.forEach((r, i) => {
          const node = c.nodes[i];
          if (!node || node === c.el) return;
          let target = r;
          if (c.index < best && i > c.index && i <= best) target = c.rects[i - 1] ?? r;
          else if (c.index > best && i >= best && i < c.index) target = c.rects[i + 1] ?? r;
          setShift(node, target.left - r.left, target.top - r.top);
        });
        c.target = best;
      }

      // Edge autoscroll keeps a long list reachable without dropping the card.
      const scroller = root.closest<HTMLElement>("[data-scroll-root]");
      if (scroller) {
        const box = scroller.getBoundingClientRect();
        const margin = 64;
        if (e.clientY < box.top + margin) scroller.scrollTop -= 16;
        else if (e.clientY > box.bottom - margin) scroller.scrollTop += 16;
      }
    };

    const finish = (commit: boolean) => {
      const c = ctx.current;
      arm.current = null;
      if (!c) return;
      ctx.current = null;

      const { el, index, target, rects } = c;
      if (suppressed) {
        // Swallow the click the browser is about to synthesise on the link.
        suppressed = false;
        root.addEventListener("click", swallow, true);
        window.setTimeout(() => root.removeEventListener("click", swallow, true), 0);
      }
      if (commit && target !== index) onDrop(c.id, index, target);

      // Neighbours already sit in their final slots, so only the dragged card
      // animates. One moving element instead of thirty reads as calm.
      const from = rects[index];
      const to = rects[target] ?? from;
      const live = el.style.transform.match(/translate3d\(([-\d.]+)px,\s*([-\d.]+)px/);
      const dx = live ? Number(live[1] ?? 0) : 0;
      const dy = live ? Number(live[2] ?? 0) : 0;

      if (from && to) {
        el.style.transition = "none";
        el.style.transform = `translate3d(${from.left + dx - to.left}px, ${from.top + dy - to.top}px, 0)`;
        requestAnimationFrame(() => {
          el.classList.add("is-settling");
          el.style.transition = "";
          el.style.transform = "";
          el.style.zIndex = "";
        });
      }
      window.setTimeout(() => el.classList.remove("is-settling", "is-drag-source"), 240);

      for (const node of c.nodes) if (node !== el) node.style.transform = "";
      root.classList.remove("is-dragging");
      document.documentElement.classList.remove("is-reordering");
      setDraggingId(null);
    };

    const onPointerUp = () => finish(true);
    const onPointerCancel = () => finish(false);
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ctx.current) {
        e.preventDefault();
        finish(false);
      }
    };

    root.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerCancel);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      root.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerCancel);
      window.removeEventListener("keydown", onKeyDown);
      arm.current = null;
    };
  }, [containerRef, enabled, onDrop]);

  return { draggingId };
}
