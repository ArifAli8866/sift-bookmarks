import { seedLibrary } from "./seed";
import { uid } from "./format";

export type ViewMode = "grid" | "list";
export type SortKey = "manual" | "added" | "title" | "domain";
export type ThemeMode = "system" | "light" | "dark";
export type ScopeKind = "all" | "favorites" | "recent" | "collection" | "tag";

export interface Scope {
  kind: ScopeKind;
  id?: string;
}

export interface Bookmark {
  id: string;
  title: string;
  url: string;
  collectionId: string | null;
  tags: string[];
  favorite: boolean;
  addedAt: number;
  order: number;
}

export interface Collection {
  id: string;
  name: string;
  icon: string;
}

export interface Prefs {
  viewMode: ViewMode;
  sortKey: SortKey;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
}

export type SyncStatus = "local" | "syncing" | "synced" | "error";

export interface LibraryState {
  hydrated: boolean;
  bookmarks: Bookmark[];
  collections: Collection[];
  prefs: Prefs;
  scope: Scope;
  query: string;
  syncStatus: SyncStatus;
}

const KEY = "sift.library.v1";
const PREFS_KEY = "sift.prefs.v1";

const DEFAULT_PREFS: Prefs = {
  viewMode: "grid",
  sortKey: "manual",
  theme: "system",
  sidebarCollapsed: false,
};

/** Returned for every server render and every pre-hydration render. */
export const INITIAL_STATE: LibraryState = {
  hydrated: false,
  bookmarks: [],
  collections: [],
  prefs: DEFAULT_PREFS,
  scope: { kind: "all" },
  query: "",
  syncStatus: "local",
};

let state: LibraryState = INITIAL_STATE;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

function write(next: Partial<LibraryState>) {
  state = { ...state, ...next };
  emit();
}

let saveTimer: number | undefined;
let cloudTimer: number | undefined;

export async function syncToCloud(): Promise<boolean> {
  if (typeof window === "undefined" || !state.hydrated) return false;
  try {
    write({ syncStatus: "syncing" });
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookmarks: state.bookmarks,
        collections: state.collections,
        prefs: state.prefs,
      }),
    });
    if (!res.ok) {
      write({ syncStatus: "error" });
      return false;
    }
    const data = await res.json();
    if (data.connected) {
      write({ syncStatus: "synced" });
      return true;
    } else {
      write({ syncStatus: "local" });
      return false;
    }
  } catch {
    write({ syncStatus: "local" });
    return false;
  }
}

function persist() {
  if (typeof window === "undefined" || !state.hydrated) return;
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(() => {
    try {
      const { prefs, bookmarks, collections } = state;
      localStorage.setItem(KEY, JSON.stringify({ version: 1, bookmarks, collections }));
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* private mode / quota — the app keeps working in memory */
    }
  }, 140);

  window.clearTimeout(cloudTimer);
  cloudTimer = window.setTimeout(() => {
    syncToCloud();
  }, 600);
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export function getState(): LibraryState {
  return state;
}

export function getServerState(): LibraryState {
  return INITIAL_STATE;
}

export async function hydrate() {
  if (state.hydrated || typeof window === "undefined") return;
  let bookmarks: Bookmark[] = [];
  let collections: Collection[] = [];
  let prefs = DEFAULT_PREFS;
  let hasLocalData = false;

  try {
    const rawLib = localStorage.getItem(KEY);
    const rawPrefs = localStorage.getItem(PREFS_KEY);
    const parsed = rawLib ? JSON.parse(rawLib) : null;
    if (
      parsed &&
      Array.isArray(parsed.bookmarks) &&
      Array.isArray(parsed.collections) &&
      parsed.bookmarks.length > 0
    ) {
      bookmarks = parsed.bookmarks as Bookmark[];
      collections = parsed.collections as Collection[];
      hasLocalData = true;
    } else {
      const seeded = seedLibrary();
      bookmarks = seeded.bookmarks;
      collections = seeded.collections;
    }
    if (rawPrefs) prefs = { ...DEFAULT_PREFS, ...(JSON.parse(rawPrefs) as Partial<Prefs>) };
  } catch {
    const seeded = seedLibrary();
    bookmarks = seeded.bookmarks;
    collections = seeded.collections;
  }

  write({ hydrated: true, bookmarks, collections, prefs, syncStatus: "local" });

  // Check if Neon PostgreSQL is connected and has data
  try {
    const res = await fetch("/api/library");
    if (res.ok) {
      const cloud = await res.json();
      if (cloud.connected) {
        if (!cloud.empty && Array.isArray(cloud.bookmarks) && cloud.bookmarks.length > 0) {
          write({
            bookmarks: cloud.bookmarks,
            collections: cloud.collections || [],
            prefs: cloud.prefs ? { ...DEFAULT_PREFS, ...cloud.prefs } : state.prefs,
            syncStatus: "synced",
          });
          try {
            localStorage.setItem(KEY, JSON.stringify({ version: 1, bookmarks: cloud.bookmarks, collections: cloud.collections }));
          } catch {}
        } else if (hasLocalData || bookmarks.length > 0) {
          await syncToCloud();
        }
      }
    }
  } catch {
    // Offline or fallback to local storage
  }
}

export function resetLibrary() {
  const seeded = seedLibrary();
  write({ bookmarks: seeded.bookmarks, collections: seeded.collections, scope: { kind: "all" }, query: "" });
  persist();
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export function collectionById(s: LibraryState, id: string | null) {
  return id ? s.collections.find((c) => c.id === id) : undefined;
}

export function countFor(s: LibraryState, scope: Scope): number {
  switch (scope.kind) {
    case "all":
      return s.bookmarks.length;
    case "favorites":
      return s.bookmarks.filter((b) => b.favorite).length;
    case "recent":
      return s.bookmarks.filter((b) => Date.now() - b.addedAt < 1000 * 60 * 60 * 24 * 7).length;
    case "collection":
      return s.bookmarks.filter((b) => b.collectionId === scope.id).length;
    case "tag":
      return s.bookmarks.filter((b) => b.tags.includes(scope.id ?? "")).length;
  }
}

export function visibleBookmarks(s: LibraryState): Bookmark[] {
  const q = s.query.trim().toLowerCase();
  let list = s.bookmarks.filter((b) => {
    switch (s.scope.kind) {
      case "all":
        return true;
      case "favorites":
        return b.favorite;
      case "recent":
        return Date.now() - b.addedAt < 1000 * 60 * 60 * 24 * 7;
      case "collection":
        return b.collectionId === s.scope.id;
      case "tag":
        return b.tags.includes(s.scope.id ?? "");
    }
  });

  if (q) {
    list = list.filter(
      (b) =>
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        b.tags.some((t) => t.toLowerCase().includes(q)),
    );
  }

  switch (s.prefs.sortKey) {
    case "added":
      return [...list].sort((a, b) => b.addedAt - a.addedAt);
    case "title":
      return [...list].sort((a, b) => a.title.localeCompare(b.title, "en", { numeric: true }));
    case "domain":
      return [...list].sort((a, b) => hostname(a).localeCompare(hostname(b)));
    case "manual":
    default:
      return [...list].sort((a, b) => a.order - b.order);
  }
}

function hostname(b: Bookmark): string {
  try {
    return new URL(b.url).hostname;
  } catch {
    return b.url;
  }
}

export function tagCounts(s: LibraryState): { tag: string; count: number }[] {
  const map = new Map<string, number>();
  for (const b of s.bookmarks) for (const t of b.tags) map.set(t, (map.get(t) ?? 0) + 1);
  return [...map.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
}

/* ------------------------------------------------------------------ */
/* Actions                                                             */
/* ------------------------------------------------------------------ */

export function setScope(scope: Scope) {
  write({ scope, query: "" });
}

export function setQuery(query: string) {
  write({ query });
}

export function setPrefs(patch: Partial<Prefs>) {
  write({ prefs: { ...state.prefs, ...patch } });
  persist();
}

export function toggleSidebar() {
  setPrefs({ sidebarCollapsed: !state.prefs.sidebarCollapsed });
}

export function addBookmark(input: {
  title: string;
  url: string;
  collectionId: string | null;
  tags: string[];
  favorite?: boolean;
}): Bookmark {
  const lowest = state.bookmarks.reduce((min, b) => Math.min(min, b.order), 0);
  const bookmark: Bookmark = {
    id: uid(),
    title: input.title,
    url: input.url,
    collectionId: input.collectionId,
    tags: input.tags,
    favorite: input.favorite ?? false,
    addedAt: Date.now(),
    // New links join the top of the manual ordering.
    order: lowest - 100,
  };
  write({ bookmarks: [bookmark, ...state.bookmarks] });
  persist();
  return bookmark;
}

export function updateBookmark(id: string, patch: Partial<Omit<Bookmark, "id">>) {
  write({
    bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  });
  persist();
}

export function toggleFavorite(id: string) {
  const target = state.bookmarks.find((b) => b.id === id);
  if (!target) return;
  updateFavorite(id, !target.favorite);
}

export function updateFavorite(id: string, favorite: boolean) {
  write({ bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, favorite } : b)) });
  persist();
}

/** Undo support for delete: re-insert with the previous order value. */
export function deleteBookmarks(ids: string[]): Bookmark[] {
  const removed = state.bookmarks.filter((b) => ids.includes(b.id));
  if (!removed.length) return [];
  write({ bookmarks: state.bookmarks.filter((b) => !ids.includes(b.id)) });
  persist();
  return removed;
}

export function restoreBookmarks(removed: Bookmark[]) {
  const existing = new Set(state.bookmarks.map((b) => b.id));
  write({ bookmarks: [...state.bookmarks, ...removed.filter((b) => !existing.has(b.id))] });
  persist();
}

/**
 * Move `draggedId` to `targetIndex` within the visible manual ordering.
 * Uses fractional indices so a single drag rewrites exactly one record.
 */
/**
 * Move `draggedId` to `targetIndex` inside the visible manual ordering.
 * The visible list is the authoritative order for the current scope, so
 * re-densifying it keeps every view consistent: a collection is a subset,
 * and relative order inside the global list is preserved.
 */
export function reorder(draggedId: string, visibleIds: string[], targetIndex: number) {
  const next = visibleIds.filter((id) => id !== draggedId);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, draggedId);

  const byId = new Map(state.bookmarks.map((b) => [b.id, b]));
  const base = next.reduce((min, id) => Math.min(min, byId.get(id)?.order ?? 0), 0);
  const orders = new Map(next.map((id, index) => [id, base + index]));

  write({
    bookmarks: state.bookmarks.map((b) =>
      orders.has(b.id) ? { ...b, order: orders.get(b.id) as number } : b,
    ),
  });
  persist();
}

export function moveWithinVisible(id: string, direction: -1 | 1) {
  const list = visibleBookmarks(state);
  const ids = list.map((b) => b.id);
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= ids.length) return;
  reorder(id, ids, target);
}

export function assignToCollection(id: string, collectionId: string | null) {
  updateBookmark(id, { collectionId });
}

export function addCollection(name: string, icon = "folder"): Collection {
  const collection: Collection = { id: uid("c"), name: name.trim() || "Untitled", icon };
  write({ collections: [...state.collections, collection] });
  persist();
  return collection;
}

export function updateCollection(id: string, patch: Partial<Omit<Collection, "id">>) {
  write({
    collections: state.collections.map((c) =>
      c.id === id
        ? { ...c, ...patch, name: patch.name !== undefined ? patch.name.trim() || c.name : c.name }
        : c,
    ),
  });
  persist();
}

export function renameCollection(id: string, name: string) {
  write({
    collections: state.collections.map((c) => (c.id === id ? { ...c, name: name.trim() || c.name } : c)),
  });
  persist();
}

export function deleteCollection(id: string) {
  const scopeGone = state.scope.kind === "collection" && state.scope.id === id;
  write({
    collections: state.collections.filter((c) => c.id !== id),
    bookmarks: state.bookmarks.map((b) => (b.collectionId === id ? { ...b, collectionId: null } : b)),
    scope: scopeGone ? { kind: "all" } : state.scope,
  });
  persist();
}
