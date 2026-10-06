"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { BookmarkCard, BookmarkRow } from "./BookmarkCard";
import { EmptyState } from "./EmptyState";
import { SkeletonGrid } from "./Skeletons";
import { Menu } from "./Menu";
import { Icon, type IconName } from "./Icon";
import { Favicon } from "./Favicon";
import { buildItemEntries, type ItemActions } from "./itemActions";
import { useDragReorder } from "../lib/useDragReorder";
import { useMediaQuery } from "../lib/hooks";
import {
  addBookmark,
  reorder,
  setQuery,
  visibleBookmarks,
  type Bookmark,
  type Category,
  type LibraryState,
} from "../lib/store";
import { DashboardOverview } from "./DashboardOverview";
import { SUGGESTED_BOOKMARKS } from "../lib/suggestions";
import { pushToast } from "../lib/toast";

interface Section {
  id: string;
  title: string | null;
  icon: IconName | null;
  items: Bookmark[];
}

/** Nearest-neighbour arrow navigation: works across sections and columns. */
function moveGeometric(container: HTMLElement, currentId: string, dx: number, dy: number): string | null {
  const current = container.querySelector<HTMLElement>(`[data-drag-id="${currentId}"]`);
  if (!current) return null;
  const box = current.getBoundingClientRect();
  const cx = box.left + box.width / 2;
  const cy = box.top + box.height / 2;
  let best: { id: string; cost: number } | null = null;

  for (const node of Array.from(container.querySelectorAll<HTMLElement>("[data-drag-id]"))) {
    const id = node.dataset.dragId;
    if (!id || id === currentId) continue;
    const r = node.getBoundingClientRect();
    const nx = r.left + r.width / 2;
    const ny = r.top + r.height / 2;
    const off = dx !== 0 ? nx - cx : ny - cy;
    const across = dx !== 0 ? Math.abs(ny - cy) : Math.abs(nx - cx);
    if (off <= 2 || across > Math.max(r.width, r.height) * 0.72) continue;
    const cost = Math.abs(off) + across * 2.4;
    if (!best || cost < best.cost) best = { id, cost };
  }
  return best?.id ?? null;
}

function SectionHead({ title, icon, count }: { title: string; icon: IconName | null; count: number }) {
  const headRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const root = headRef.current?.closest("[data-scroll-root]") ?? null;
    const io = new IntersectionObserver(
      ([entry]) => setStuck(entry ? !entry.isIntersecting : false),
      { root, threshold: 0, rootMargin: "1px 0px 0px 0px" },
    );
    io.observe(sentinel);
    return () => io.disconnect();
  }, []);

  return (
    <>
      <div ref={sentinelRef} style={{ height: 1, marginTop: -1 }} aria-hidden="true" />
      <div className="section-head" ref={headRef} data-stuck={stuck ? "true" : undefined}>
        <span className="section-name">
          {icon ? <Icon name={icon} size={14} /> : null}
          {title}
        </span>
        <span className="count-badge t-num">{count}</span>
        <span className="section-rule" aria-hidden="true" />
      </div>
    </>
  );
}

function DndGrid({
  items,
  view,
  canReorder,
  pointerAllowsDrag,
  focusedId,
  onFocused,
  actions,
  onMenu,
  onTag,
  categoryMap,
  onAnnounce,
}: {
  items: Bookmark[];
  view: "grid" | "list";
  canReorder: boolean;
  pointerAllowsDrag: boolean;
  focusedId: string | null;
  onFocused: (id: string) => void;
  actions: ItemActions;
  onMenu: (bookmark: Bookmark, anchor: HTMLElement) => void;
  onTag: (tag: string) => void;
  categoryMap: Map<string, Category>;
  onAnnounce: (text: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const ids = useMemo(() => items.map((b) => b.id), [items]);
  const key = ids.join("|");

  const handleDrop = useCallback(
    (id: string, from: number, to: number) => {
      reorder(id, ids, to);
      const label = items.find((b) => b.id === id)?.title ?? "Item";
      onAnnounce(`${label} moved from position ${from + 1} to ${to + 1}`);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key, onAnnounce],
  );

  const { draggingId } = useDragReorder({
    containerRef: ref,
    ids,
    enabled: canReorder && pointerAllowsDrag,
    onDrop: handleDrop,
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const block = (e: Event) => {
      if (draggingId) e.preventDefault();
    };
    el.addEventListener("dragstart", block);
    return () => el.removeEventListener("dragstart", block);
  }, [draggingId]);

  const className = view === "grid" ? "grid" : "rows";

  return (
    <div
      className={className}
      ref={ref}
      data-dragging={draggingId ?? undefined}
      onDragStartCapture={(e) => {
        if (draggingId) e.preventDefault();
      }}
    >
      {items.map((bookmark, index) => {
        const catId = bookmark.categoryId || bookmark.collectionId;
        const cat = catId ? categoryMap.get(catId) : undefined;
        const shared = {
          bookmark,
          index,
          focused: bookmark.id === focusedId,
          actions,
          onFocus: onFocused,
          onMenu,
          onTag,
          category: cat ? { name: cat.name, color: cat.color, icon: cat.icon } : undefined,
        };
        return view === "grid" ? (
          <BookmarkCard key={bookmark.id} {...shared} />
        ) : (
          <BookmarkRow
            key={bookmark.id}
            {...shared}
            collectionName={cat?.name}
            categoryColor={cat?.color}
          />
        );
      })}
    </div>
  );
}

export function Library({
  lib,
  actions,
  onTag,
  onNewBookmark,
  onNewCategory,
  onOpenPalette,
}: {
  lib: LibraryState;
  actions: ItemActions;
  onTag: (tag: string) => void;
  onNewBookmark: () => void;
  onNewCategory: () => void;
  onOpenPalette: () => void;
}) {
  const items = useMemo(() => visibleBookmarks(lib), [lib]);
  const querying = lib.query.trim().length > 0;
  const manual = lib.prefs.sortKey === "manual";
  const coarsePointer = useMediaQuery("(pointer: coarse)");
  const [focusedId, setFocusedId] = useState<string | null>(null);
  const [menu, setMenu] = useState<{ anchor: HTMLElement; bookmark: Bookmark } | null>(null);
  const [status, setStatus] = useState("");
  const rootRef = useRef<HTMLDivElement>(null);

  const canReorder = manual && !querying && lib.scope.kind !== "recent";

  const categoryMap = useMemo(() => {
    const map = new Map<string, Category>();
    for (const c of lib.categories) map.set(c.id, c);
    return map;
  }, [lib.categories]);

  // Sections bucketed by category for "all" scope in manual mode
  const sections = useMemo<Section[]>(() => {
    if (!lib.hydrated) return [];
    const grouped = lib.scope.kind === "all" && manual && lib.categories.length > 0;
    if (!grouped) {
      return [{ id: "flat", title: null, icon: null, items }];
    }
    const buckets: Section[] = lib.categories
      .map((c) => ({
        id: c.id,
        title: c.name,
        icon: c.icon as IconName,
        items: items.filter((b) => (b.categoryId || b.collectionId) === c.id),
      }))
      .filter((s) => s.items.length > 0);
    const unfiled = items.filter(
      (b) => !(b.categoryId || b.collectionId) || !lib.categories.some((c) => c.id === (b.categoryId || b.collectionId))
    );
    if (unfiled.length) buckets.push({ id: "unfiled", title: "Unfiled", icon: "inbox", items: unfiled });
    return buckets;
  }, [items, lib.categories, lib.hydrated, lib.scope.kind, manual]);

  const flat = useMemo(() => sections.flatMap((s) => s.items), [sections]);

  useEffect(() => {
    if (focusedId && !flat.some((b) => b.id === focusedId)) setFocusedId(null);
  }, [flat, focusedId]);

  const focusAt = (id: string | null) => {
    if (!id) return;
    setFocusedId(id);
    const link = rootRef.current?.querySelector<HTMLElement>(`[data-drag-id="${id}"] a`);
    link?.focus({ preventScroll: false });
    link?.scrollIntoView({ block: "nearest", behavior: "auto" });
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!focusedId) return;
    const root = rootRef.current;
    if (!root) return;
    const step = (dx: number, dy: number) => {
      const next = moveGeometric(root, focusedId, dx, dy);
      if (next) {
        e.preventDefault();
        focusAt(next);
      }
    };
    switch (e.key) {
      case "ArrowRight":
        step(1, 0);
        return;
      case "ArrowLeft":
        step(-1, 0);
        return;
      case "ArrowDown":
        step(0, 1);
        return;
      case "ArrowUp":
        step(0, -1);
        return;
      default:
        break;
    }

    const bookmark = flat.find((b) => b.id === focusedId);
    if (!bookmark) return;
    const key = e.key.toLowerCase();
    if ((e.metaKey || e.ctrlKey) && (key === "arrowup" || key === "arrowdown")) {
      if (!canReorder) return;
      e.preventDefault();
      actions.move(bookmark.id, key === "arrowup" ? -1 : 1);
      setStatus(`${bookmark.title} moved ${key === "arrowup" ? "up" : "down"}`);
      return;
    }
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    if (key === "f") {
      e.preventDefault();
      actions.toggleFavorite(bookmark.id);
    } else if (key === "e") {
      e.preventDefault();
      actions.edit(bookmark.id);
    } else if (e.key === "Backspace" || e.key === "Delete") {
      e.preventDefault();
      actions.remove(bookmark.id);
    }
  };

  if (!lib.hydrated) {
    return (
      <div className="content" aria-busy="true" aria-label="Loading library">
        <div className="content-top" />
        <SkeletonGrid count={8} mode={lib.prefs.viewMode} />
      </div>
    );
  }

  // OVERVIEW DASHBOARD (Default view matching Dribbble inspiration)
  if (lib.scope.kind === "overview") {
    return (
      <div className="content">
        <DashboardOverview
          lib={lib}
          actions={actions}
          onNewBookmark={onNewBookmark}
          onNewCategory={onNewCategory}
          onOpenPalette={onOpenPalette}
          onTag={onTag}
        />
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="content">
        <EmptyView lib={lib} onNewBookmark={onNewBookmark} />
      </div>
    );
  }

  return (
    <div className="content">
      <div
        ref={rootRef}
        onKeyDown={onKeyDown}
        onFocusCapture={(e) => {
          const id = (e.target as HTMLElement).closest?.("[data-drag-id]")?.getAttribute("data-drag-id");
          if (id) setFocusedId(id);
        }}
      >
        {sections.map((section) => (
          <section className="section" key={section.id} aria-label={section.title ?? undefined}>
            {section.title ? (
              <SectionHead title={section.title} icon={section.icon} count={section.items.length} />
            ) : (
              <div className="content-top" />
            )}
            <DndGrid
              items={section.items}
              view={lib.prefs.viewMode}
              canReorder={canReorder}
              pointerAllowsDrag={!coarsePointer}
              focusedId={focusedId}
              onFocused={setFocusedId}
              actions={actions}
              onMenu={(bookmark, anchor) => setMenu({ bookmark, anchor })}
              onTag={onTag}
              categoryMap={categoryMap}
              onAnnounce={setStatus}
            />
          </section>
        ))}
      </div>

      <p className="sr-only" role="status" aria-live="polite">
        {status}
      </p>

      <Menu
        open={!!menu}
        anchor={menu?.anchor ?? null}
        width={220}
        entries={menu ? buildItemEntries(menu.bookmark, actions, lib.categories, canReorder) : []}
        onClose={() => setMenu(null)}
      />
    </div>
  );
}

function EmptyView({ lib, onNewBookmark }: { lib: LibraryState; onNewBookmark: () => void }) {
  const category = (lib.scope.kind === "category" || lib.scope.kind === "collection")
    ? lib.categories.find((c) => c.id === lib.scope.id)
    : undefined;

  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());

  const handleAdd = (sug: (typeof SUGGESTED_BOOKMARKS)[0]) => {
    addBookmark({
      title: sug.title,
      url: sug.url,
      description: sug.description,
      categoryId: category?.id || null,
      tags: sug.tags,
      favorite: false,
    });
    setAddedIds((prev) => new Set([...prev, sug.id]));
    pushToast(`Added “${sug.title}”`);
  };

  if (lib.query.trim()) {
    return (
      <EmptyState
        icon="search"
        title={`No links match “${lib.query.trim()}”`}
        body="Search looks inside titles, addresses, descriptions and tags."
        secondary={{ label: "Clear filter", onClick: () => setQuery("") }}
      />
    );
  }

  if (lib.scope.kind === "favorites") {
    return (
      <EmptyState
        icon="star"
        title="Nothing pinned yet"
        body="Favourites stay at the top of every view. Star a bookmark to pin it here."
      />
    );
  }

  if (lib.scope.kind === "recent") {
    return (
      <EmptyState
        icon="clock"
        title="No recently opened links"
        body="Bookmarks you open will be tracked and displayed here."
      />
    );
  }

  if (category) {
    return (
      <EmptyState
        icon={(category.icon as IconName) ?? "folder"}
        title={`${category.name} is empty`}
        body="Save your links into this category to keep your workspace organized."
        primary={{ label: "Add a bookmark", onClick: onNewBookmark, kbd: "⌘N" }}
      />
    );
  }

  if (lib.scope.kind === "tag") {
    return (
      <EmptyState
        icon="tag"
        title="No links with this tag"
        body="Tags come from the fields you fill in when saving a link."
      />
    );
  }

  // All bookmarks empty state with suggested websites
  return (
    <div className="empty-library-container">
      <div className="dashboard-empty-card">
        <div className="dashboard-empty-hero">
          <span className="dashboard-empty-icon">
            <Icon name="bookmark" size={26} />
          </span>
          <h3 className="dashboard-empty-title">Build your developer library</h3>
          <p className="dashboard-empty-subtitle">
            Save the websites you use every day and access them from one place.
          </p>
          <button type="button" className="btn btn-primary" onClick={onNewBookmark}>
            <Icon name="plus" size={14} />
            <span>Add your first bookmark</span>
          </button>
        </div>
      </div>

      <div className="empty-suggestions-section">
        <div className="empty-suggestions-head">
          <Icon name="sparkle" size={15} />
          <h4 className="empty-suggestions-title">Popular suggestions for your toolbox</h4>
        </div>
        <div className="suggestions-grid">
          {SUGGESTED_BOOKMARKS.slice(0, 6).map((sug) => {
            const added = addedIds.has(sug.id);
            return (
              <div className="suggestion-card" key={sug.id}>
                <div className="sug-card-head">
                  <div className="sug-card-icon-box">
                    <Favicon url={sug.url} size={20} />
                  </div>
                  <div className="sug-card-title-col truncate">
                    <h5 className="sug-card-title truncate">{sug.title}</h5>
                    <span className="sug-card-cat">{sug.category}</span>
                  </div>
                </div>
                <p className="sug-card-desc truncate-2">{sug.description}</p>
                <div className="sug-card-foot">
                  <span className="sug-card-domain">
                    {sug.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                  </span>
                  <span className="spacer" />
                  <button
                    type="button"
                    className={`sug-add-btn ${added ? "is-added" : ""}`}
                    disabled={added}
                    onClick={() => handleAdd(sug)}
                  >
                    {added ? "✓ Added" : "+ Add"}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
