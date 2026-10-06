"use client";

import { useMemo, useState } from "react";
import { Icon } from "./Icon";
import { Menu, type MenuEntry } from "./Menu";
import { countFor, setPrefs, tagCounts, type Collection, type LibraryState, type Scope } from "../lib/store";
import type { IconName } from "./Icon";

const FALLBACK_ICON: IconName = "folder";
function collectionIcon(collection: Collection): IconName {
  return (collection.icon as IconName) ?? FALLBACK_ICON;
}

const NAV: { kind: Scope["kind"]; label: string; icon: Parameters<typeof Icon>[0]["name"] }[] = [
  { kind: "all", label: "All items", icon: "inbox" },
  { kind: "favorites", label: "Favourites", icon: "star" },
  { kind: "recent", label: "Recent", icon: "clock" },
];

/** The sidebar's own loading shape: counts and rows that do not lie. */
function NavSk({ w }: { w: number }) {
  return (
    <span
      className="sk"
      aria-hidden="true"
      style={{ width: w, height: 9, borderRadius: 3, display: "block" }}
    />
  );
}

export function Sidebar({
  lib,
  onNewBookmark,
  onNewCollection,
  onRenameCollection,
  onDeleteCollection,
  onShowShortcuts,
  onRestoreSamples,
  onScope,
}: {
  lib: LibraryState;
  onNewBookmark: (collectionId: string | null) => void;
  onNewCollection: () => void;
  onRenameCollection: (collection: Collection) => void;
  onDeleteCollection: (collection: Collection) => void;
  onShowShortcuts: () => void;
  onRestoreSamples: () => void;
  onScope: (scope: Scope) => void;
}) {
  const [menuFor, setMenuFor] = useState<{ anchor: HTMLElement; id: string } | null>(null);
  const [navMenu, setNavMenu] = useState<HTMLElement | null>(null);
  const [themeMenu, setThemeMenu] = useState<HTMLElement | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);

  const tags = useMemo(() => tagCounts(lib), [lib]);
  const shownTags = tagsOpen ? tags : tags.slice(0, 5);
  const isCurrent = (scope: Scope) =>
    scope.kind === lib.scope.kind && (scope.id ?? undefined) === (lib.scope.id ?? undefined);

  const collectionEntries = (collection: Collection): MenuEntry[] => [
    {
      id: "add",
      label: "New bookmark here",
      icon: "plus",
      onSelect: () => onNewBookmark(collection.id),
    },
    { id: "sep", label: "" },
    {
      id: "rename",
      label: "Rename…",
      icon: "pencil",
      onSelect: () => onRenameCollection(collection),
    },
    {
      id: "delete",
      label: "Delete collection…",
      icon: "trash",
      danger: true,
      onSelect: () => onDeleteCollection(collection),
    },
  ];

  return (
    <aside className="sidebar" aria-label="Library">
      <div className="sidebar-inner">
        <div className="brand">
          <span className="brand-mark" aria-hidden="true">
            <Icon name="bookmark" size={13} />
          </span>
          <span className="brand-name">Sift</span>
        </div>

        <div className="sidebar-scroll scroll">
          <nav className="nav-section">
            <div className="nav-head">
              <span className="nav-head-label">Library</span>
            </div>
            {NAV.map((item) => {
              const count = countFor(lib, { kind: item.kind });
              return (
                <button
                  key={item.kind}
                  type="button"
                  className="nav-row"
                  aria-current={isCurrent({ kind: item.kind }) ? "page" : undefined}
                  onClick={() => onScope({ kind: item.kind })}
                  onContextMenu={(e) => {
                    if (item.kind !== "all") return;
                    e.preventDefault();
                    setNavMenu(e.currentTarget);
                  }}
                >
                  <Icon name={item.icon} size={15} className="nav-icon" />
                  <span className="nav-label truncate">{item.label}</span>
                  {item.kind === "all" ? (
                    <span
                      className="nav-more"
                      role="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setNavMenu(e.currentTarget);
                      }}
                    >
                      <Icon name="ellipsis" size={12} />
                    </span>
                  ) : null}
                  <span className="nav-count t-num">
                    {lib.hydrated ? count : <NavSk w={14} />}
                  </span>
                </button>
              );
            })}
          </nav>

          <nav className="nav-section">
            <div className="nav-head">
              <span className="nav-head-label">Collections</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="New collection"
                title="New collection"
                onClick={onNewCollection}
              >
                <Icon name="plus" size={13} />
              </button>
            </div>

            {!lib.hydrated ? (
              <>
                {[92, 74, 84].map((w, i) => (
                  <div className="nav-row is-sk" key={i} aria-hidden="true">
                    <span
                      className="sk"
                      style={{ width: 15, height: 15, borderRadius: 4, flex: "none" }}
                    />
                    <NavSk w={w} />
                  </div>
                ))}
              </>
            ) : lib.collections.length === 0 ? (
              <button type="button" className="nav-row is-empty-state" onClick={onNewCollection}>
                <span className="nav-label">No collections</span>
              </button>
            ) : (
              lib.collections.map((collection) => {
                const count = countFor(lib, { kind: "collection", id: collection.id });
                return (
                  <button
                    key={collection.id}
                    type="button"
                    className="nav-row"
                    aria-current={isCurrent({ kind: "collection", id: collection.id }) ? "page" : undefined}
                    onClick={() => onScope({ kind: "collection", id: collection.id })}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuFor({ anchor: e.currentTarget, id: collection.id });
                    }}
                  >
                    <Icon name={collectionIcon(collection)} size={15} className="nav-icon" />
                    <span className="nav-label truncate">{collection.name}</span>
                    <span
                      className="nav-more"
                      role="button"
                      tabIndex={-1}
                      aria-hidden="true"
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setMenuFor({ anchor: e.currentTarget, id: collection.id });
                      }}
                    >
                      <Icon name="ellipsis" size={12} />
                    </span>
                    <span className="nav-count t-num">{count}</span>
                  </button>
                );
              })
            )}
          </nav>

          {shownTags.length ? (
            <nav className="nav-section">
              <div className="nav-head">
                <span className="nav-head-label">Tags</span>
              </div>
              {shownTags.map(({ tag, count }) => (
                <button
                  key={tag}
                  type="button"
                  className="nav-row"
                  aria-current={isCurrent({ kind: "tag", id: tag }) ? "page" : undefined}
                  onClick={() => onScope({ kind: "tag", id: tag })}
                >
                  <Icon name="tag" size={14} className="nav-icon" />
                  <span className="nav-label truncate">{tag}</span>
                  <span className="nav-count t-num">{count}</span>
                </button>
              ))}
              {tags.length > 5 ? (
                <button
                  type="button"
                  className="nav-row nav-row-disclose"
                  onClick={() => setTagsOpen((v) => !v)}
                >
                  <Icon name={tagsOpen ? "chevronUp" : "chevronDown"} size={13} className="nav-icon" />
                  <span className="nav-label">{tagsOpen ? "Show less" : `Show all (${tags.length})`}</span>
                </button>
              ) : null}
            </nav>
          ) : null}
        </div>

        <div className="sidebar-foot">
          <button
            type="button"
            className="icon-btn"
            aria-label={`Appearance: ${lib.prefs.theme}`}
            title="Appearance"
            onClick={(e) => setThemeMenu(e.currentTarget)}
          >
            <Icon name={lib.prefs.theme === "light" ? "sun" : lib.prefs.theme === "dark" ? "moon" : "auto"} size={15} />
          </button>
          <button type="button" className="icon-btn" aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)" onClick={onShowShortcuts}>
            <Icon name="keyboard" size={16} />
          </button>
          <span className="spacer" />
          <span
            className="brand-count sync-badge"
            title={
              lib.syncStatus === "synced"
                ? "Connected to Neon PostgreSQL"
                : lib.syncStatus === "syncing"
                ? "Syncing to Neon PostgreSQL..."
                : lib.syncStatus === "error"
                ? "Sync error — local storage active"
                : "Local storage mode (configure DATABASE_URL for Neon)"
            }
          >
            <span className={`sync-indicator sync-${lib.syncStatus}`} aria-hidden="true" />
            {lib.syncStatus === "synced" ? "Neon DB" : lib.syncStatus === "syncing" ? "Syncing…" : "Local"}
          </span>
        </div>
      </div>

      <Menu
        open={!!menuFor}
        anchor={menuFor?.anchor ?? null}
        entries={collectionEntries(lib.collections.find((c) => c.id === menuFor?.id) ?? ({ id: "", name: "", icon: "" } as Collection))}
        onClose={() => setMenuFor(null)}
      />
      <Menu
        open={!!navMenu}
        anchor={navMenu}
        align="start"
        entries={[
          { id: "new", label: "New bookmark", icon: "plus", kbd: "⌘N", onSelect: () => onNewBookmark(null) },
          { id: "sep", label: "" },
          { id: "restore", label: "Restore sample library", icon: "sparkle", onSelect: onRestoreSamples },
        ]}
        onClose={() => setNavMenu(null)}
      />
      <Menu
        open={!!themeMenu}
        anchor={themeMenu}
        entries={[
          { id: "system", label: "Follow system", icon: "auto", checked: lib.prefs.theme === "system", onSelect: () => setPrefs({ theme: "system" }) },
          { id: "light", label: "Light", icon: "sun", checked: lib.prefs.theme === "light", onSelect: () => setPrefs({ theme: "light" }) },
          { id: "dark", label: "Dark", icon: "moon", checked: lib.prefs.theme === "dark", onSelect: () => setPrefs({ theme: "dark" }) },
        ]}
        onClose={() => setThemeMenu(null)}
      />
    </aside>
  );
}
