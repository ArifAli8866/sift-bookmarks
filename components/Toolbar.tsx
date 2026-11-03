"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { Menu } from "./Menu";
import { setPrefs, setQuery, type LibraryState, type SortKey, type ViewMode } from "../lib/store";

const SORTS: { id: SortKey; label: string }[] = [
  { id: "manual", label: "Manual order" },
  { id: "added", label: "Recently added" },
  { id: "title", label: "Title A–Z" },
  { id: "domain", label: "Domain" },
];

export function Toolbar({
  lib,
  title,
  shown,
  total,
  searchRef,
  onToggleSidebar,
  onNewBookmark,
  onOpenPalette,
  onOpenShare,
}: {
  lib: LibraryState;
  title: string;
  shown: number;
  total: number;
  searchRef: React.RefObject<HTMLInputElement | null>;
  onToggleSidebar: () => void;
  onNewBookmark: () => void;
  onOpenPalette: () => void;
  onOpenShare?: () => void;
}) {
  const [sortAnchor, setSortAnchor] = useState<HTMLElement | null>(null);
  const segRef = useRef<HTMLDivElement>(null);
  const [thumb, setThumb] = useState({ x: 0, w: 0 });
  const querying = lib.query.trim().length > 0;
  const manual = lib.prefs.sortKey === "manual";

  // Measure the thumb rather than hard-coding half widths.
  useLayoutEffect(() => {
    const root = segRef.current;
    if (!root) return;
    const active = root.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (!active) return;
    setThumb({ x: active.offsetLeft - 2, w: active.offsetWidth });
  }, [lib.prefs.viewMode]);

  const setView = (viewMode: ViewMode) => setPrefs({ viewMode });

  return (
    <header className="toolbar">
      <button
        type="button"
        className="icon-btn"
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        title="Toggle sidebar (⌘\)"
      >
        <Icon name="sidebar" size={16} />
      </button>

      <div className="toolbar-title-group">
        <div className="toolbar-title">
          <h1 className="t-title toolbar-name">
            <span className="truncate">{querying && lib.scope.kind === "overview" ? "Search Results" : title}</span>
          </h1>
          <span className="toolbar-metric-pill t-num" aria-live="polite">
            {querying && shown !== total
              ? `${shown} of ${total}`
              : `${shown} ${shown === 1 ? "item" : "items"}`}
          </span>
        </div>
      </div>

      <div className="toolbar-actions">
        <label className="search" title="Filter bookmarks (/) · Command palette (⌘K / Ctrl+K)">
          <Icon name="search" size={13} className="search-icon" />
          <input
            ref={searchRef}
            type="text"
            role="searchbox"
            value={lib.query}
            placeholder="Filter bookmarks…"
            aria-label="Filter bookmarks"
            spellCheck={false}
            autoComplete="off"
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                if (lib.query) setQuery("");
                else e.currentTarget.blur();
              }
              if (e.key === "Enter" && !lib.query.trim()) {
                e.preventDefault();
                onOpenPalette();
              }
            }}
          />
          {querying ? (
            <button
              type="button"
              className="search-clear"
              aria-label="Clear filter"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setQuery("");
                searchRef.current?.focus();
              }}
            >
              <svg width={8} height={8} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.6} strokeLinecap="round" aria-hidden="true">
                <path d="M5 5l14 14M19 5L5 19" />
              </svg>
            </button>
          ) : (
            <kbd aria-hidden="true">/</kbd>
          )}
        </label>

        <button
          type="button"
          className="btn btn-quiet toolbar-palette-btn"
          aria-label="Open command palette"
          title="Command Palette (⌘K / Ctrl+K)"
          onClick={onOpenPalette}
        >
          <Icon name="command" size={13} />
          <kbd aria-hidden="true">⌘K</kbd>
        </button>

        <button
          type="button"
          className="icon-btn search-fallback"
          aria-label="Search all bookmarks"
          onClick={onOpenPalette}
        >
          <Icon name="search" size={16} />
        </button>

        <div className="segmented" ref={segRef} role="group" aria-label="View mode">
          <span
            className="segmented-thumb"
            style={{ width: thumb.w, transform: `translate3d(${thumb.x}px,0,0)` }}
          />
          <button
            type="button"
            className="segmented-btn"
            aria-pressed={lib.prefs.viewMode === "grid"}
            aria-label="Grid view"
            title="Grid view"
            onClick={() => setView("grid")}
          >
            <Icon name="grid" size={14} />
          </button>
          <button
            type="button"
            className="segmented-btn"
            aria-pressed={lib.prefs.viewMode === "list"}
            aria-label="List view"
            title="List view"
            onClick={() => setView("list")}
          >
            <Icon name="list" size={14} />
          </button>
        </div>

        <button
          type="button"
          className="icon-btn"
          aria-label={`Sort: ${SORTS.find((s) => s.id === lib.prefs.sortKey)?.label}`}
          title="Sort"
          data-state={manual ? undefined : "active"}
          onClick={(e) => setSortAnchor(e.currentTarget)}
        >
          <Icon name="sort" size={15} />
        </button>

        {onOpenShare ? (
          <button
            type="button"
            className="btn btn-quiet toolbar-share-btn"
            aria-label="Share bookmarks with friend"
            title="Share bookmarks with friends via link"
            onClick={onOpenShare}
          >
            <Icon name="share" size={13.5} />
            <span>Share</span>
          </button>
        ) : null}

        <button type="button" className="btn btn-primary" onClick={onNewBookmark} title="New bookmark (⌘N)">
          <Icon name="plus" size={14} />
          <span className="btn-new-label">New</span>
        </button>
      </div>

      <Menu
        open={!!sortAnchor}
        anchor={sortAnchor}
        align="end"
        width={200}
        entries={[
          ...SORTS.map((s) => ({
            id: s.id,
            label: s.label,
            checked: lib.prefs.sortKey === s.id,
            onSelect: () => setPrefs({ sortKey: s.id }),
          })),
          { id: "sep", label: "" },
          {
            id: "drag",
            label: manual ? "Manual order — drag to arrange" : "Switch to Manual to drag",
            disabled: true,
          },
        ]}
        onClose={() => setSortAnchor(null)}
      />
    </header>
  );
}
