"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { Library } from "./Library";
import { CommandPalette } from "./CommandPalette";
import { BookmarkDialog } from "./BookmarkDialog";
import { CollectionDialog } from "./CollectionDialog";
import { ConfirmDialog, ShortcutsDialog } from "./Dialog";
import { Toasts } from "./Toasts";
import type { ItemActions } from "./itemActions";
import { useLibrary, useLibraryReady } from "../lib/hooks";
import { pushToast } from "../lib/toast";
import { domainOf } from "../lib/format";
import {
  addBookmark,
  addCollection,
  assignToCollection,
  collectionById,
  deleteBookmarks,
  deleteCollection,
  getState,
  moveWithinVisible,
  resetLibrary,
  restoreBookmarks,
  updateCollection,
  setPrefs,
  setQuery,
  setScope,
  toggleSidebar,
  updateBookmark,
  updateFavorite,
  visibleBookmarks,
  countFor,
  type Bookmark,
  type Collection,
  type Scope,
} from "../lib/store";

const THEME_ORDER = ["system", "light", "dark"] as const;

export function App() {
  useLibraryReady();
  const lib = useLibrary();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [form, setForm] = useState<{ mode: "new" | "edit"; id?: string } | null>(null);
  const [newDefaultCollectionId, setNewDefaultCollectionId] = useState<string | null>(null);
  const [collectionForm, setCollectionForm] = useState<{ id?: string } | null>(null);
  const [shortcuts, setShortcuts] = useState(false);
  const [confirmState, setConfirmState] = useState<{
    title: string;
    body: string;
    confirmLabel: string;
    onConfirm: () => void;
  } | null>(null);
  const [mobileNav, setMobileNav] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /* ------------------------------- theme ----------------------------- */
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const choice = getState().prefs.theme;
      const dark = choice === "dark" || (choice === "system" && media.matches);
      if (choice === "system") root.removeAttribute("data-theme");
      else root.setAttribute("data-theme", choice);
      root.style.colorScheme = dark ? "dark" : "light";
      document
        .querySelector('meta[name="theme-color"]')
        ?.setAttribute("content", dark ? "#0e0e10" : "#ffffff");
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, [lib.prefs.theme]);

  /* -------------------------- shared callbacks ----------------------- */
  const scopeCollectionId = lib.scope.kind === "collection" ? (lib.scope.id ?? null) : null;

  const openNew = useCallback((collectionId: string | null) => {
    setNewDefaultCollectionId(collectionId);
    setForm({ mode: "new" });
  }, []);

  /* --------------------------- global shortcuts ---------------------- */
  const overlayOpen = paletteOpen || !!form || !!collectionForm || shortcuts || !!confirmState;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const typing =
        !!target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable);
      const meta = e.metaKey || e.ctrlKey;
      const key = e.key.toLowerCase();

      // ⌘K is the one chord that works everywhere, including inside fields.
      if (meta && key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
        return;
      }
      if (overlayOpen) return;

      if (meta && key === "n") {
        e.preventDefault();
        openNew(scopeCollectionId);
        return;
      }
      if (meta && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (typing || meta || e.altKey) return;

      if (e.key === "1" || e.key === "2" || e.key === "3") {
        e.preventDefault();
        setScope(
          e.key === "1" ? { kind: "all" } : e.key === "2" ? { kind: "favorites" } : { kind: "recent" },
        );
      } else if (e.key === "?") {
        e.preventDefault();
        setShortcuts(true);
      } else if (e.key === "/") {
        e.preventDefault();
        if (searchRef.current) searchRef.current.focus();
        else setPaletteOpen(true);
      } else if (e.key === "Escape") {
        if (getState().query) setQuery("");
        searchRef.current?.blur();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [openNew, overlayOpen, scopeCollectionId]);

  /* ------------------------------ actions ---------------------------- */
  const actions = useMemo<ItemActions>(
    () => ({
      edit: (id) => setForm({ mode: "edit", id }),
      remove: (id) => {
        const found = getState().bookmarks.find((b) => b.id === id);
        const removed = deleteBookmarks([id]);
        if (!removed.length) return;
        pushToast(found ? `“${found.title}” deleted` : "Deleted", {
          action: {
            label: "Undo",
            onClick: () => {
              restoreBookmarks(removed);
              pushToast("Restored");
            },
          },
        });
      },
      toggleFavorite: (id) => {
        const found = getState().bookmarks.find((b) => b.id === id);
        if (found) updateFavorite(id, !found.favorite);
      },
      open: (b) => window.open(b.url, "_blank", "noopener,noreferrer"),
      copy: (b) => {
        navigator.clipboard
          ?.writeText(b.url)
          .then(() => pushToast(`Copied ${domainOf(b.url)}`))
          .catch(() => pushToast("Clipboard permission denied"));
      },
      assign: (id, collectionId) => {
        assignToCollection(id, collectionId);
        const name = collectionId ? collectionById(getState(), collectionId)?.name : "Unfiled";
        pushToast(`Moved to ${name ?? "Unfiled"}`);
      },
      move: (id, direction) => moveWithinVisible(id, direction),
    }),
    [],
  );

  /* ------------------------------- title ----------------------------- */
  const title = useMemo(() => {
    switch (lib.scope.kind) {
      case "favorites":
        return "Favourites";
      case "recent":
        return "Recent";
      case "collection":
        return collectionById(lib, lib.scope.id ?? "")?.name ?? "Collection";
      case "tag":
        return `#${lib.scope.id ?? ""}`;
      default:
        return "All items";
    }
  }, [lib]);

  const shown = visibleBookmarks(lib).length;

  const handleScope = (scope: Scope) => {
    setScope(scope);
    setMobileNav(false);
  };

  const cycleTheme = () => {
    const current = getState().prefs.theme;
    const next = THEME_ORDER[(THEME_ORDER.indexOf(current) + 1) % THEME_ORDER.length];
    setPrefs({ theme: next });
    pushToast(`Appearance: ${next === "system" ? "follow system" : next}`);
  };

  const editing: Bookmark | null =
    form?.mode === "edit" ? (lib.bookmarks.find((b) => b.id === form.id) ?? null) : null;
  const editingCollection: Collection | null =
    collectionForm?.id ? (lib.collections.find((c) => c.id === collectionForm.id) ?? null) : null;

  return (
    <div
      className="app"
      data-sidebar={lib.prefs.sidebarCollapsed ? "collapsed" : "open"}
      data-mobile-nav={mobileNav ? "open" : "closed"}
    >
      <Sidebar
        lib={lib}
        onNewBookmark={openNew}
        onNewCollection={() => setCollectionForm({})}
        onRenameCollection={(c) => setCollectionForm({ id: c.id })}
        onDeleteCollection={(c) =>
          setConfirmState({
            title: `Delete “${c.name}”?`,
            body: `The ${
              lib.bookmarks.filter((b) => b.collectionId === c.id).length
            } links inside it will be kept and moved to Unfiled.`,
            confirmLabel: "Delete collection",
            onConfirm: () => {
              deleteCollection(c.id);
              pushToast(`Collection “${c.name}” deleted`);
            },
          })
        }
        onShowShortcuts={() => setShortcuts(true)}
        onRestoreSamples={() =>
          setConfirmState({
            title: "Restore sample library?",
            body: "Your current links and collections will be replaced with the built-in sample set. This cannot be undone.",
            confirmLabel: "Replace library",
            onConfirm: () => {
              resetLibrary();
              pushToast("Sample library restored");
            },
          })
        }
        onScope={handleScope}
      />

      <div className="sidebar-scrim" onPointerDown={() => setMobileNav(false)} aria-hidden="true" />

      <div className="main">
        <Toolbar
          lib={lib}
          title={title}
          shown={shown}
          total={lib.scope.kind === "all" ? lib.bookmarks.length : countFor(lib, lib.scope)}
          searchRef={searchRef}
          onToggleSidebar={() => {
            if (window.matchMedia("(max-width: 900px)").matches) setMobileNav((v) => !v);
            else toggleSidebar();
          }}
          onNewBookmark={() => openNew(scopeCollectionId)}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <main className="scroller scroll" data-scroll-root>
          <Library
            lib={lib}
            actions={actions}
            onTag={(tag) => setScope({ kind: "tag", id: tag })}
            onNewBookmark={() => openNew(scopeCollectionId)}
          />
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        lib={lib}
        onClose={() => setPaletteOpen(false)}
        onScope={handleScope}
        onNewBookmark={() => openNew(scopeCollectionId)}
        onNewCollection={() => setCollectionForm({})}
        onEditBookmark={(id) => setForm({ mode: "edit", id })}
        onCycleTheme={cycleTheme}
        onShowShortcuts={() => setShortcuts(true)}
      />

      <BookmarkDialog
        open={!!form}
        bookmark={editing}
        collections={lib.collections}
        defaultCollectionId={form?.mode === "new" ? newDefaultCollectionId : (editing?.collectionId ?? null)}
        onClose={() => setForm(null)}
        onSubmit={(values) => {
          if (editing) {
            updateBookmark(editing.id, values);
            pushToast("Bookmark updated");
          } else {
            addBookmark(values);
            pushToast("Bookmark added");
          }
          setForm(null);
        }}
      />

      <CollectionDialog
        open={!!collectionForm}
        isNew={!collectionForm?.id}
        name={editingCollection?.name ?? ""}
        icon={editingCollection?.icon ?? "folder"}
        onClose={() => setCollectionForm(null)}
        onSubmit={({ name, icon: glyph }) => {
          if (collectionForm?.id) {
            updateCollection(collectionForm.id, { name, icon: glyph });
            pushToast("Collection renamed");
          } else {
            const created = addCollection(name, glyph);
            setScope({ kind: "collection", id: created.id });
            pushToast(`Created “${created.name}”`);
          }
          setCollectionForm(null);
        }}
      />

      <ShortcutsDialog open={shortcuts} onClose={() => setShortcuts(false)} />

      <ConfirmDialog
        open={!!confirmState}
        title={confirmState?.title ?? ""}
        body={confirmState?.body ?? ""}
        confirmLabel={confirmState?.confirmLabel ?? "Delete"}
        onConfirm={() => confirmState?.onConfirm()}
        onClose={() => setConfirmState(null)}
      />

      <Toasts />
    </div>
  );
}
