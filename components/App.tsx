"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./Sidebar";
import { Toolbar } from "./Toolbar";
import { Library } from "./Library";
import { CommandPalette } from "./CommandPalette";
import { BookmarkDialog } from "./BookmarkDialog";
import { CategoryDialog, type CategoryFormData } from "./CategoryDialog";
import { SettingsDialog } from "./SettingsDialog";
import { AuthView } from "./AuthView";
import { OnboardingModal } from "./OnboardingModal";
import { ConfirmDialog, ShortcutsDialog } from "./Dialog";
import { Toasts } from "./Toasts";
import type { ItemActions } from "./itemActions";
import { useLibrary, useLibraryReady } from "../lib/hooks";
import { pushToast } from "../lib/toast";
import { domainOf } from "../lib/format";
import {
  addBookmark,
  addCategory,
  assignToCategory,
  categoryById,
  deleteBookmarks,
  deleteCategory,
  getState,
  logoutUser,
  moveWithinVisible,
  restoreBookmarks,
  updateCategory,
  setPrefs,
  setQuery,
  setScope,
  toggleSidebar,
  updateBookmark,
  updateFavorite,
  visibleBookmarks,
  countFor,
  type Bookmark,
  type Category,
  type Scope,
} from "../lib/store";

const THEME_ORDER = ["system", "light", "dark"] as const;

export function App() {
  useLibraryReady();
  const lib = useLibrary();

  const [paletteOpen, setPaletteOpen] = useState(false);
  const [form, setForm] = useState<{ mode: "new" | "edit"; id?: string } | null>(null);
  const [newDefaultCategoryId, setNewDefaultCategoryId] = useState<string | null>(null);
  const [categoryForm, setCategoryForm] = useState<{ mode: "new" | "edit"; id?: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
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
  const scopeCategoryId =
    lib.scope.kind === "category" || lib.scope.kind === "collection"
      ? (lib.scope.id ?? null)
      : null;

  const openNew = useCallback((categoryId: string | null) => {
    setNewDefaultCategoryId(categoryId);
    setForm({ mode: "new" });
  }, []);

  /* --------------------------- global shortcuts ---------------------- */
  const overlayOpen =
    paletteOpen ||
    !!form ||
    !!categoryForm ||
    settingsOpen ||
    shortcuts ||
    !!confirmState;

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
        openNew(scopeCategoryId);
        return;
      }
      if (meta && e.key === "\\") {
        e.preventDefault();
        toggleSidebar();
        return;
      }
      if (typing || meta || e.altKey) return;

      if (e.key === "1" || e.key === "2" || e.key === "3" || e.key === "0") {
        e.preventDefault();
        setScope(
          e.key === "0"
            ? { kind: "overview" }
            : e.key === "1"
            ? { kind: "all" }
            : e.key === "2"
            ? { kind: "favorites" }
            : { kind: "recent" }
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
  }, [openNew, overlayOpen, scopeCategoryId]);

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
        if (found) updateFavorite(id, !(found.favorite || found.isFavorite));
      },
      open: (b) => window.open(b.url, "_blank", "noopener,noreferrer"),
      copy: (b) => {
        navigator.clipboard
          ?.writeText(b.url)
          .then(() => pushToast(`Copied ${domainOf(b.url)}`))
          .catch(() => pushToast("Clipboard permission denied"));
      },
      assign: (id, categoryId) => {
        assignToCategory(id, categoryId);
        const name = categoryId ? categoryById(getState(), categoryId)?.name : "Uncategorized";
        pushToast(`Moved to ${name ?? "Uncategorized"}`);
      },
      move: (id, direction) => moveWithinVisible(id, direction),
    }),
    [],
  );

  /* ------------------------------- title ----------------------------- */
  const title = useMemo(() => {
    switch (lib.scope.kind) {
      case "overview":
        return "Overview";
      case "favorites":
        return "Favourites";
      case "recent":
        return "Recent";
      case "category":
      case "collection":
        return categoryById(lib, lib.scope.id ?? "")?.name ?? "Category";
      case "tag":
        return `#${lib.scope.id ?? ""}`;
      default:
        return "All Bookmarks";
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
  const editingCategory: Category | null =
    categoryForm?.id ? (lib.categories.find((c) => c.id === categoryForm.id) ?? null) : null;

  // Unauthenticated user: show the beautiful authentication experience
  if (lib.hydrated && !lib.authenticated) {
    return (
      <>
        <AuthView />
        <Toasts />
      </>
    );
  }

  return (
    <div
      className="app"
      data-sidebar={lib.prefs.sidebarCollapsed ? "collapsed" : "open"}
      data-mobile-nav={mobileNav ? "open" : "closed"}
    >
      <Sidebar
        lib={lib}
        onNewBookmark={openNew}
        onNewCategory={() => setCategoryForm({ mode: "new" })}
        onEditCategory={(c) => setCategoryForm({ mode: "edit", id: c.id })}
        onDeleteCategory={(c) =>
          setConfirmState({
            title: `Delete “${c.name}”?`,
            body: `Bookmarks inside will be moved to Uncategorized and will not be deleted.`,
            confirmLabel: "Delete category",
            onConfirm: () => {
              deleteCategory(c.id);
              pushToast(`Category “${c.name}” deleted`);
            },
          })
        }
        onOpenSettings={() => setSettingsOpen(true)}
        onShowShortcuts={() => setShortcuts(true)}
        onLogout={async () => {
          await logoutUser();
          pushToast("Signed out");
        }}
        onScope={handleScope}
      />

      <div className="sidebar-scrim" onPointerDown={() => setMobileNav(false)} aria-hidden="true" />

      <div className="main">
        <Toolbar
          lib={lib}
          title={title}
          shown={shown}
          total={lib.scope.kind === "all" || lib.scope.kind === "overview" ? lib.bookmarks.length : countFor(lib, lib.scope)}
          searchRef={searchRef}
          onToggleSidebar={() => {
            if (window.matchMedia("(max-width: 900px)").matches) setMobileNav((v) => !v);
            else toggleSidebar();
          }}
          onNewBookmark={() => openNew(scopeCategoryId)}
          onOpenPalette={() => setPaletteOpen(true)}
        />

        <main className="scroller scroll" data-scroll-root>
          <Library
            lib={lib}
            actions={actions}
            onTag={(tag) => setScope({ kind: "tag", id: tag })}
            onNewBookmark={() => openNew(scopeCategoryId)}
            onNewCategory={() => setCategoryForm({ mode: "new" })}
            onOpenPalette={() => setPaletteOpen(true)}
          />
        </main>
      </div>

      <CommandPalette
        open={paletteOpen}
        lib={lib}
        onClose={() => setPaletteOpen(false)}
        onScope={handleScope}
        onNewBookmark={() => openNew(scopeCategoryId)}
        onNewCollection={() => setCategoryForm({ mode: "new" })}
        onEditBookmark={(id) => setForm({ mode: "edit", id })}
        onCycleTheme={cycleTheme}
        onShowShortcuts={() => setShortcuts(true)}
      />

      <BookmarkDialog
        open={!!form}
        bookmark={editing}
        collections={lib.categories}
        defaultCollectionId={form?.mode === "new" ? newDefaultCategoryId : (editing?.categoryId ?? editing?.collectionId ?? null)}
        onClose={() => setForm(null)}
        onSubmit={(values) => {
          if (editing) {
            updateBookmark(editing.id, {
              title: values.title,
              url: values.url,
              description: values.description,
              categoryId: values.collectionId,
              collectionId: values.collectionId,
              tags: values.tags,
              favorite: values.favorite,
              isFavorite: values.favorite,
            });
            pushToast("Bookmark updated");
          } else {
            addBookmark({
              title: values.title,
              url: values.url,
              description: values.description,
              categoryId: values.collectionId,
              collectionId: values.collectionId,
              tags: values.tags,
              favorite: values.favorite,
            });
            pushToast("Bookmark added to your library");
          }
          setForm(null);
        }}
      />

      <CategoryDialog
        open={!!categoryForm}
        isNew={categoryForm?.mode === "new"}
        name={editingCategory?.name ?? ""}
        icon={editingCategory?.icon ?? "folder"}
        color={editingCategory?.color ?? "#0a7aff"}
        onClose={() => setCategoryForm(null)}
        onSubmit={(values: CategoryFormData) => {
          if (categoryForm?.id) {
            updateCategory(categoryForm.id, values);
            pushToast("Category updated");
          } else {
            const created = addCategory(values.name, values.icon, values.color);
            setScope({ kind: "category", id: created.id });
            pushToast(`Created category “${created.name}”`);
          }
          setCategoryForm(null);
        }}
      />

      <SettingsDialog
        open={settingsOpen}
        lib={lib}
        onClose={() => setSettingsOpen(false)}
      />

      <OnboardingModal
        open={lib.authenticated && !lib.onboarded}
        userName={lib.user?.name}
        onComplete={() => {}}
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
