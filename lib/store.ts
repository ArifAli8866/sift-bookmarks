import { uid } from "./format";

export type ViewMode = "grid" | "list";
export type SortKey = "manual" | "added" | "title" | "domain";
export type ThemeMode = "system" | "light" | "dark";
export type ScopeKind = "overview" | "all" | "favorites" | "recent" | "category" | "collection" | "tag";

export interface Scope {
  kind: ScopeKind;
  id?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export interface Bookmark {
  id: string;
  userId?: string;
  title: string;
  url: string;
  description?: string;
  categoryId?: string | null;
  collectionId?: string | null; // alias for backwards compatibility
  iconUrl?: string;
  tags: string[];
  favorite: boolean;
  isFavorite?: boolean;
  addedAt: number;
  order: number;
  position?: number;
  lastOpenedAt?: number | null;
}

export interface Category {
  id: string;
  userId?: string;
  name: string;
  icon: string;
  color?: string;
  position?: number;
}
export type Collection = Category; // alias

export interface Prefs {
  viewMode: ViewMode;
  sortKey: SortKey;
  theme: ThemeMode;
  sidebarCollapsed: boolean;
}

export type SyncStatus = "local" | "syncing" | "synced" | "error";

export interface LibraryState {
  hydrated: boolean;
  loading: boolean;
  authenticated: boolean;
  user: User | null;
  onboarded: boolean;
  bookmarks: Bookmark[];
  categories: Category[];
  collections: Category[]; // alias
  prefs: Prefs;
  scope: Scope;
  query: string;
  syncStatus: SyncStatus;
}

const DEFAULT_PREFS: Prefs = {
  viewMode: "grid",
  sortKey: "manual",
  theme: "system",
  sidebarCollapsed: false,
};

export const INITIAL_STATE: LibraryState = {
  hydrated: false,
  loading: true,
  authenticated: false,
  user: null,
  onboarded: true,
  bookmarks: [],
  categories: [],
  collections: [],
  prefs: DEFAULT_PREFS,
  scope: { kind: "overview" },
  query: "",
  syncStatus: "synced",
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

/* ------------------------------------------------------------------ */
/* Hydration & Backend Synchronization                                */
/* ------------------------------------------------------------------ */

export async function hydrate() {
  if (typeof window === "undefined") return;

  write({ loading: true });

  try {
    const authRes = await fetch("/api/auth/me");
    if (authRes.ok) {
      const authData = await authRes.json();
      if (authData.authenticated && authData.user) {
        // Authenticated user: fetch their library
        const libRes = await fetch("/api/library");
        if (libRes.ok) {
          const libData = await libRes.json();
          const categories = libData.categories || [];
          write({
            hydrated: true,
            loading: false,
            authenticated: true,
            user: authData.user,
            onboarded: authData.settings?.onboarded ?? true,
            bookmarks: libData.bookmarks || [],
            categories,
            collections: categories,
            prefs: libData.prefs ? { ...DEFAULT_PREFS, ...libData.prefs } : state.prefs,
            syncStatus: "synced",
          });
          return;
        }
      }
    }

    // Unauthenticated
    write({
      hydrated: true,
      loading: false,
      authenticated: false,
      user: null,
      onboarded: true,
      bookmarks: [],
      categories: [],
      collections: [],
      syncStatus: "synced",
    });
  } catch (err) {
    console.error("Hydration error:", err);
    write({
      hydrated: true,
      loading: false,
      authenticated: false,
      user: null,
      bookmarks: [],
      categories: [],
      collections: [],
      syncStatus: "error",
    });
  }
}

export async function syncToCloud(): Promise<boolean> {
  if (!state.authenticated) return false;
  try {
    write({ syncStatus: "syncing" });
    const res = await fetch("/api/library", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bookmarks: state.bookmarks,
        categories: state.categories,
        prefs: state.prefs,
      }),
    });
    if (res.ok) {
      write({ syncStatus: "synced" });
      return true;
    } else {
      write({ syncStatus: "error" });
      return false;
    }
  } catch {
    write({ syncStatus: "error" });
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Authentication Actions                                              */
/* ------------------------------------------------------------------ */

export async function loginUser(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Login failed" };
    }

    await hydrate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error during login" };
  }
}

export async function registerUser(
  email: string,
  password: string,
  confirmPassword?: string,
  name?: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, confirmPassword, name }),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Registration failed" };
    }

    await hydrate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error during registration" };
  }
}

export async function loginWithGoogle(profile?: {
  name?: string;
  email?: string;
  image?: string;
}): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch("/api/auth/google", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(profile || {}),
    });
    const data = await res.json();
    if (!res.ok) {
      return { ok: false, error: data.error || "Google sign-in failed" };
    }

    await hydrate();
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error during Google sign-in" };
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST" });
  } catch {}
  write({
    authenticated: false,
    user: null,
    bookmarks: [],
    categories: [],
    collections: [],
    scope: { kind: "overview" },
  });
}

export async function finishOnboarding(payload: {
  categories?: string[];
  bookmarks?: any[];
  skipped?: boolean;
}): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      write({ onboarded: true });
      await hydrate();
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export async function updateProfile(patch: { name?: string; image?: string }): Promise<boolean> {
  if (!state.user) return false;
  try {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      const data = await res.json();
      write({ user: data.user });
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/* Selectors                                                           */
/* ------------------------------------------------------------------ */

export function categoryById(s: LibraryState, id: string | null) {
  return id ? s.categories.find((c) => c.id === id) : undefined;
}
export const collectionById = categoryById;

export function countFor(s: LibraryState, scope: Scope): number {
  switch (scope.kind) {
    case "overview":
    case "all":
      return s.bookmarks.length;
    case "favorites":
      return s.bookmarks.filter((b) => b.favorite || b.isFavorite).length;
    case "recent":
      return s.bookmarks.filter((b) => {
        if (b.lastOpenedAt) return Date.now() - b.lastOpenedAt < 1000 * 60 * 60 * 24 * 7;
        return Date.now() - b.addedAt < 1000 * 60 * 60 * 24 * 7;
      }).length;
    case "category":
    case "collection":
      return s.bookmarks.filter((b) => (b.categoryId || b.collectionId) === scope.id).length;
    case "tag":
      return s.bookmarks.filter((b) => b.tags.includes(scope.id ?? "")).length;
  }
}

export function visibleBookmarks(s: LibraryState): Bookmark[] {
  const q = s.query.trim().toLowerCase();
  let list = s.bookmarks.filter((b) => {
    switch (s.scope.kind) {
      case "overview":
      case "all":
        return true;
      case "favorites":
        return b.favorite || b.isFavorite;
      case "recent":
        if (b.lastOpenedAt) return Date.now() - b.lastOpenedAt < 1000 * 60 * 60 * 24 * 14;
        return Date.now() - b.addedAt < 1000 * 60 * 60 * 24 * 7;
      case "category":
      case "collection":
        return (b.categoryId || b.collectionId) === s.scope.id;
      case "tag":
        return b.tags.includes(s.scope.id ?? "");
    }
  });

  if (q) {
    list = list.filter((b) => {
      const cat = categoryById(s, b.categoryId || b.collectionId || null);
      return (
        b.title.toLowerCase().includes(q) ||
        b.url.toLowerCase().includes(q) ||
        (b.description && b.description.toLowerCase().includes(q)) ||
        (cat && cat.name.toLowerCase().includes(q)) ||
        b.tags.some((t) => t.toLowerCase().includes(q))
      );
    });
  }

  if (s.scope.kind === "recent") {
    return [...list].sort((a, b) => {
      const timeA = a.lastOpenedAt || a.addedAt;
      const timeB = b.lastOpenedAt || b.addedAt;
      return timeB - timeA;
    });
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
      return [...list].sort((a, b) => (a.position ?? a.order) - (b.position ?? b.order));
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
/* State Actions                                                       */
/* ------------------------------------------------------------------ */

export function setScope(scope: Scope) {
  write({ scope, query: "" });
}

export function setQuery(query: string) {
  write({ query });
}

export function setPrefs(patch: Partial<Prefs>) {
  write({ prefs: { ...state.prefs, ...patch } });
  if (state.authenticated) {
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }
}

export function toggleSidebar() {
  setPrefs({ sidebarCollapsed: !state.prefs.sidebarCollapsed });
}

export function addBookmark(input: {
  title: string;
  url: string;
  description?: string;
  categoryId?: string | null;
  collectionId?: string | null;
  tags?: string[];
  favorite?: boolean;
}): Bookmark {
  const lowest = state.bookmarks.reduce((min, b) => Math.min(min, b.position ?? b.order), 0);
  const catId = input.categoryId || input.collectionId || null;
  const bookmark: Bookmark = {
    id: uid(),
    userId: state.user?.id,
    title: input.title,
    url: input.url,
    description: input.description || "",
    categoryId: catId,
    collectionId: catId,
    tags: input.tags || [],
    favorite: input.favorite ?? false,
    isFavorite: input.favorite ?? false,
    addedAt: Date.now(),
    order: lowest - 100,
    position: lowest - 100,
    lastOpenedAt: null,
  };

  write({ bookmarks: [bookmark, ...state.bookmarks] });

  if (state.authenticated) {
    fetch("/api/bookmarks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(bookmark),
    }).catch(() => {});
  }

  return bookmark;
}

export function updateBookmark(id: string, patch: Partial<Omit<Bookmark, "id">>) {
  write({
    bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, ...patch } : b)),
  });

  if (state.authenticated) {
    fetch(`/api/bookmarks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }
}

export function toggleFavorite(id: string) {
  const target = state.bookmarks.find((b) => b.id === id);
  if (!target) return;
  const fav = !(target.favorite || target.isFavorite);
  updateBookmark(id, { favorite: fav, isFavorite: fav });
}

export function updateFavorite(id: string, favorite: boolean) {
  updateBookmark(id, { favorite, isFavorite: favorite });
}

export function deleteBookmarks(ids: string[]): Bookmark[] {
  const removed = state.bookmarks.filter((b) => ids.includes(b.id));
  if (!removed.length) return [];

  write({ bookmarks: state.bookmarks.filter((b) => !ids.includes(b.id)) });

  if (state.authenticated) {
    for (const id of ids) {
      fetch(`/api/bookmarks/${id}`, { method: "DELETE" }).catch(() => {});
    }
  }

  return removed;
}

export function restoreBookmarks(removed: Bookmark[]) {
  const existing = new Set(state.bookmarks.map((b) => b.id));
  const toAdd = removed.filter((b) => !existing.has(b.id));
  write({ bookmarks: [...state.bookmarks, ...toAdd] });

  if (state.authenticated) {
    for (const b of toAdd) {
      fetch("/api/bookmarks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(b),
      }).catch(() => {});
    }
  }
}

export function markBookmarkOpened(id: string) {
  const now = Date.now();
  write({
    bookmarks: state.bookmarks.map((b) => (b.id === id ? { ...b, lastOpenedAt: now } : b)),
  });

  if (state.authenticated) {
    fetch(`/api/bookmarks/${id}/open`, { method: "POST" }).catch(() => {});
  }
}

export function reorder(draggedId: string, visibleIds: string[], targetIndex: number) {
  const next = visibleIds.filter((id) => id !== draggedId);
  next.splice(Math.max(0, Math.min(targetIndex, next.length)), 0, draggedId);

  const byId = new Map(state.bookmarks.map((b) => [b.id, b]));
  const base = next.reduce((min, id) => Math.min(min, byId.get(id)?.position ?? byId.get(id)?.order ?? 0), 0);
  const orders = new Map(next.map((id, index) => [id, base + index]));

  write({
    bookmarks: state.bookmarks.map((b) =>
      orders.has(b.id)
        ? { ...b, order: orders.get(b.id) as number, position: orders.get(b.id) as number }
        : b
    ),
  });

  syncToCloud();
}

export function moveWithinVisible(id: string, direction: -1 | 1) {
  const list = visibleBookmarks(state);
  const ids = list.map((b) => b.id);
  const index = ids.indexOf(id);
  const target = index + direction;
  if (index === -1 || target < 0 || target >= ids.length) return;
  reorder(id, ids, target);
}

export function assignToCategory(id: string, categoryId: string | null) {
  updateBookmark(id, { categoryId, collectionId: categoryId });
}
export const assignToCollection = assignToCategory;

export function addCategory(name: string, icon = "folder", color = "#0a7aff"): Category {
  const category: Category = {
    id: uid("c"),
    userId: state.user?.id,
    name: name.trim() || "Untitled",
    icon,
    color,
    position: state.categories.length * 10,
  };

  const nextCategories = [...state.categories, category];
  write({ categories: nextCategories, collections: nextCategories });

  if (state.authenticated) {
    fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(category),
    }).catch(() => {});
  }

  return category;
}
export const addCollection = addCategory;

export function updateCategory(id: string, patch: Partial<Omit<Category, "id">>) {
  const nextCategories = state.categories.map((c) =>
    c.id === id ? { ...c, ...patch, name: patch.name !== undefined ? patch.name.trim() || c.name : c.name } : c
  );
  write({ categories: nextCategories, collections: nextCategories });

  if (state.authenticated) {
    fetch(`/api/categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }).catch(() => {});
  }
}
export const updateCollection = updateCategory;

export function renameCategory(id: string, name: string) {
  updateCategory(id, { name });
}
export const renameCollection = renameCategory;

export function deleteCategory(id: string) {
  const scopeGone =
    (state.scope.kind === "category" || state.scope.kind === "collection") && state.scope.id === id;

  const nextCategories = state.categories.filter((c) => c.id !== id);
  // As per Section 15: move bookmarks inside to Uncategorized (null)
  const nextBookmarks = state.bookmarks.map((b) =>
    (b.categoryId === id || b.collectionId === id) ? { ...b, categoryId: null, collectionId: null } : b
  );

  write({
    categories: nextCategories,
    collections: nextCategories,
    bookmarks: nextBookmarks,
    scope: scopeGone ? { kind: "overview" } : state.scope,
  });

  if (state.authenticated) {
    fetch(`/api/categories/${id}`, { method: "DELETE" }).catch(() => {});
  }
}
export function resetLibrary() {
  write({ bookmarks: [], scope: { kind: "overview" }, query: "" });
  syncToCloud();
}

export const deleteCollection = deleteCategory;
