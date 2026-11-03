"use client";

import { useMemo, useState } from "react";
import { Icon, type IconName } from "./Icon";
import { Menu, type MenuEntry } from "./Menu";
import {
  countFor,
  setPrefs,
  tagCounts,
  toggleSidebar,
  type Category,
  type LibraryState,
  type Scope,
} from "../lib/store";

const FALLBACK_ICON: IconName = "folder";
function categoryIcon(category: Category): IconName {
  return (category.icon as IconName) ?? FALLBACK_ICON;
}

const NAV: { kind: Scope["kind"]; label: string; icon: IconName; kbd: string }[] = [
  { kind: "overview", label: "Overview", icon: "sparkle", kbd: "0" },
  { kind: "all", label: "All Items", icon: "inbox", kbd: "1" },
  { kind: "favorites", label: "Favourites", icon: "star", kbd: "2" },
  { kind: "recent", label: "Recent", icon: "clock", kbd: "3" },
];

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
  onNewCategory,
  onEditCategory,
  onDeleteCategory,
  onOpenSettings,
  onShowShortcuts,
  onLogout,
  onScope,
  onOpenPalette,
  onOpenShare,
}: {
  lib: LibraryState;
  onNewBookmark: (categoryId: string | null) => void;
  onNewCategory: () => void;
  onEditCategory: (category: Category) => void;
  onDeleteCategory: (category: Category) => void;
  onOpenSettings: () => void;
  onShowShortcuts: () => void;
  onLogout: () => void;
  onScope: (scope: Scope) => void;
  onOpenPalette?: () => void;
  onOpenShare?: () => void;
}) {
  const [menuFor, setMenuFor] = useState<{ anchor: HTMLElement; id: string } | null>(null);
  const [userMenu, setUserMenu] = useState<HTMLElement | null>(null);
  const [themeMenu, setThemeMenu] = useState<HTMLElement | null>(null);
  const [tagsOpen, setTagsOpen] = useState(false);

  const tags = useMemo(() => tagCounts(lib), [lib]);
  const shownTags = tagsOpen ? tags : tags.slice(0, 6);

  const isCurrent = (scope: Scope) =>
    scope.kind === lib.scope.kind && (scope.id ?? undefined) === (lib.scope.id ?? undefined);

  const categoryEntries = (category: Category): MenuEntry[] => [
    {
      id: "add",
      label: "New bookmark here",
      icon: "plus",
      onSelect: () => onNewBookmark(category.id),
    },
    { id: "sep", label: "" },
    {
      id: "edit",
      label: "Edit collection…",
      icon: "pencil",
      onSelect: () => onEditCategory(category),
    },
    {
      id: "delete",
      label: "Delete collection…",
      icon: "trash",
      danger: true,
      onSelect: () => onDeleteCategory(category),
    },
  ];

  const userInitial = (lib.user?.name || "D")[0]?.toUpperCase() || "D";
  const isLocal = lib.syncStatus === "local";
  const themeIcon: IconName =
    lib.prefs.theme === "light" ? "sun" : lib.prefs.theme === "dark" ? "moon" : "auto";

  return (
    <aside className="sidebar" aria-label="Library navigation">
      <div className="sidebar-inner">
        {/* Brand */}
        <div className="brand">
          <button
            type="button"
            className="brand-home"
            onClick={() => onScope({ kind: "overview" })}
            title="Sift — Overview (0)"
          >
            <span className="brand-mark" aria-hidden="true">
              <Icon name="sift" size={16} />
            </span>
            <span className="brand-text">
              <span className="brand-name">Sift</span>
              <span className="brand-sub">Developer Library</span>
            </span>
          </button>
          <span className="spacer" />
          <button
            type="button"
            className="icon-btn brand-collapse-btn"
            aria-label="Collapse sidebar"
            title="Toggle sidebar (⌘\)"
            onClick={toggleSidebar}
          >
            <Icon name="sidebar" size={14} />
          </button>
          <button
            type="button"
            className="brand-quick-btn"
            aria-label="New bookmark"
            title="New bookmark (⌘N)"
            onClick={() => onNewBookmark(null)}
          >
            <Icon name="plus" size={13} />
          </button>
        </div>

        <div className="sidebar-scroll scroll">
          {/* Library Navigation */}
          <nav className="nav-section" aria-label="Library">
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
                  title={`${item.label} (${item.kbd})`}
                >
                  <Icon name={item.icon} size={15} className="nav-icon" />
                  <span className="nav-label truncate">{item.label}</span>
                  {item.kind !== "overview" ? (
                    <span className="nav-count t-num">
                      {lib.hydrated ? count : <NavSk w={14} />}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </nav>

          {/* Collections / Categories */}
          <nav className="nav-section" aria-label="Collections">
            <div className="nav-head">
              <span className="nav-head-label">Collections</span>
              <button
                type="button"
                className="icon-btn"
                aria-label="Create collection"
                title="New collection"
                onClick={onNewCategory}
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
            ) : lib.categories.length === 0 ? (
              <button
                type="button"
                className="nav-row is-empty-state"
                onClick={onNewCategory}
              >
                <Icon name="plus" size={13} className="nav-icon" />
                <span className="nav-label">New collection…</span>
              </button>
            ) : (
              lib.categories.map((category) => {
                const count = countFor(lib, { kind: "category", id: category.id });
                const active = isCurrent({ kind: "category", id: category.id });
                return (
                  <button
                    key={category.id}
                    type="button"
                    className="nav-row"
                    aria-current={active ? "page" : undefined}
                    onClick={() => onScope({ kind: "category", id: category.id })}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      setMenuFor({ anchor: e.currentTarget, id: category.id });
                    }}
                  >
                    <span
                      className="nav-cat-dot"
                      style={{ backgroundColor: category.color || "var(--accent)" }}
                    />
                    <Icon name={categoryIcon(category)} size={14} className="nav-icon" />
                    <span className="nav-label truncate">{category.name}</span>
                    <span
                      className="nav-more"
                      role="button"
                      tabIndex={-1}
                      aria-label={`Actions for ${category.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                      }}
                      onPointerDown={(e) => {
                        e.stopPropagation();
                        setMenuFor({ anchor: e.currentTarget, id: category.id });
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

          {/* Tags */}
          {shownTags.length ? (
            <nav className="nav-section" aria-label="Tags">
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
                  <Icon name="tag" size={13.5} className="nav-icon" />
                  <span className="nav-label truncate">#{tag}</span>
                  <span className="nav-count t-num">{count}</span>
                </button>
              ))}
              {tags.length > 6 ? (
                <button
                  type="button"
                  className="nav-row nav-row-disclose"
                  onClick={() => setTagsOpen((v) => !v)}
                >
                  <Icon name={tagsOpen ? "chevronUp" : "chevronDown"} size={13} className="nav-icon" />
                  <span className="nav-label">
                    {tagsOpen ? "Show less" : `Show all (${tags.length})`}
                  </span>
                </button>
              ) : null}
            </nav>
          ) : null}
        </div>

        {/* Footer: Storage status, User profile & quick toggles */}
        <div className="sidebar-foot">
          <div className="sidebar-status-row">
            <span
              className="sidebar-storage-badge"
              data-status={lib.syncStatus}
              title={
                isLocal
                  ? "Bookmarks are saved locally in this browser"
                  : lib.syncStatus === "syncing"
                  ? "Syncing with cloud database…"
                  : lib.syncStatus === "error"
                  ? "Sync error — check connection"
                  : "Synced with cloud database"
              }
            >
              <span className="sidebar-storage-dot" aria-hidden="true" />
              <span>{isLocal ? "Local" : lib.syncStatus === "syncing" ? "Syncing…" : "Cloud Sync"}</span>
            </span>
            <span className="spacer" />
            {onOpenShare ? (
              <button
                type="button"
                className="icon-btn"
                aria-label="Share library with friends"
                title="Share bookmarks via link"
                onClick={onOpenShare}
              >
                <Icon name="share" size={13.5} />
              </button>
            ) : null}
            <button
              type="button"
              className="icon-btn"
              aria-label={`Appearance (${lib.prefs.theme})`}
              title={`Theme: ${lib.prefs.theme}`}
              onClick={(e) => setThemeMenu(e.currentTarget)}
            >
              <Icon name={themeIcon} size={14} />
            </button>
            <button
              type="button"
              className="icon-btn"
              aria-label="Keyboard shortcuts"
              title="Keyboard shortcuts (?)"
              onClick={onShowShortcuts}
            >
              <Icon name="keyboard" size={14} />
            </button>
            {onOpenPalette ? (
              <button
                type="button"
                className="icon-btn"
                aria-label="Command palette"
                title="Command palette (⌘K)"
                onClick={onOpenPalette}
              >
                <Icon name="command" size={13.5} />
              </button>
            ) : null}
          </div>

          <button
            type="button"
            className="sidebar-user-pill"
            aria-label="User profile & settings"
            title="Account & workspace settings"
            onClick={(e) => setUserMenu(e.currentTarget)}
          >
            <div className="sidebar-avatar">
              {lib.user?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={lib.user.image} alt={lib.user.name} />
              ) : (
                <span>{userInitial}</span>
              )}
            </div>
            <div className="sidebar-user-details truncate">
              <span className="sidebar-user-name truncate">
                {lib.user?.name || "Developer"}
              </span>
              <span className="sidebar-user-sub truncate">
                {lib.user?.email || (isLocal ? "Stored in browser" : "Workspace")}
              </span>
            </div>
            <Icon name="chevronUp" size={12} className="sidebar-user-arrow" />
          </button>
        </div>
      </div>

      {/* Category Actions Context Menu */}
      <Menu
        open={!!menuFor}
        anchor={menuFor?.anchor ?? null}
        entries={categoryEntries(
          lib.categories.find((c) => c.id === menuFor?.id) ??
            ({ id: "", name: "", icon: "folder" } as Category)
        )}
        onClose={() => setMenuFor(null)}
      />

      {/* User Profile Context Menu */}
      <Menu
        open={!!userMenu}
        anchor={userMenu}
        align="start"
        width={210}
        entries={[
          {
            id: "profile-name",
            label: lib.user?.name || "Developer",
            icon: "user",
            disabled: true,
          },
          { id: "sep1", label: "" },
          ...(onOpenShare
            ? [
                {
                  id: "share",
                  label: "Share library…",
                  icon: "share" as const,
                  onSelect: onOpenShare,
                },
              ]
            : []),
          {
            id: "settings",
            label: "Settings…",
            icon: "settings",
            onSelect: onOpenSettings,
          },
          {
            id: "theme",
            label: `Theme: ${lib.prefs.theme}`,
            icon: lib.prefs.theme === "light" ? "sun" : lib.prefs.theme === "dark" ? "moon" : "auto",
            onSelect: () => {
              const current = lib.prefs.theme;
              const next = current === "light" ? "dark" : current === "dark" ? "system" : "light";
              setPrefs({ theme: next });
            },
          },
          {
            id: "shortcuts",
            label: "Keyboard shortcuts",
            icon: "keyboard",
            kbd: "?",
            onSelect: onShowShortcuts,
          },
          { id: "sep2", label: "" },
          {
            id: "logout",
            label: isLocal ? "Exit local mode / Sign in…" : "Sign out",
            icon: "logout",
            danger: !isLocal,
            onSelect: onLogout,
          },
        ]}
        onClose={() => setUserMenu(null)}
      />

      {/* Theme Menu */}
      <Menu
        open={!!themeMenu}
        anchor={themeMenu}
        entries={[
          {
            id: "system",
            label: "Follow system",
            icon: "auto",
            checked: lib.prefs.theme === "system",
            onSelect: () => setPrefs({ theme: "system" }),
          },
          {
            id: "light",
            label: "Light",
            icon: "sun",
            checked: lib.prefs.theme === "light",
            onSelect: () => setPrefs({ theme: "light" }),
          },
          {
            id: "dark",
            label: "Dark",
            icon: "moon",
            checked: lib.prefs.theme === "dark",
            onSelect: () => setPrefs({ theme: "dark" }),
          },
        ]}
        onClose={() => setThemeMenu(null)}
      />
    </aside>
  );
}
