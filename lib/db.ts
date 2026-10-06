import { neon } from "@neondatabase/serverless";
import fs from "node:fs";
import path from "node:path";
import type { Bookmark, Category, Prefs } from "./store";

export interface User {
  id: string;
  name: string;
  email: string;
  image?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserSettings {
  id: string;
  userId: string;
  theme: "system" | "light" | "dark";
  sidebarCollapsed: boolean;
  viewMode: "grid" | "list";
  sortKey: "manual" | "added" | "title" | "domain";
  onboarded: boolean;
}

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

export function isNeonConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

// Global cached client instance for local PGlite (persists on disk in .data/sift_pg)
let pgliteInstance: any = null;
let initPromise: Promise<void> | null = null;

async function getPglite() {
  if (!pgliteInstance) {
    const { PGlite } = await import("@electric-sql/pglite");
    const dataDir = path.join(process.cwd(), ".data");
    fs.mkdirSync(dataDir, { recursive: true });
    const dbDir = path.join(dataDir, "sift_pg");
    pgliteInstance = new PGlite(dbDir);
  }
  return pgliteInstance;
}

/**
 * Universal SQL query executor supporting both Neon PostgreSQL (when DATABASE_URL is set)
 * and embedded PostgreSQL (via PGlite) when running locally.
 */
export async function query<T = any>(sqlText: string, params: any[] = []): Promise<T[]> {
  const url = getDatabaseUrl();
  if (url) {
    const sql = neon(url) as any;
    const rows = await sql(sqlText, params);
    return rows as T[];
  } else {
    const pg = await getPglite();
    const res = await pg.query(sqlText, params);
    return (res.rows || []) as T[];
  }
}

export async function queryOne<T = any>(sqlText: string, params: any[] = []): Promise<T | null> {
  const rows = await query<T>(sqlText, params);
  return rows[0] ?? null;
}

export async function exec(sqlText: string): Promise<void> {
  const url = getDatabaseUrl();
  if (url) {
    const sql = neon(url) as any;
    // Split on semicolons that are not inside strings
    const statements = sqlText
      .split(/;(?=(?:[^']*'[^']*')*[^']*$)/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (const stmt of statements) {
      await sql(stmt);
    }
  } else {
    const pg = await getPglite();
    await pg.exec(sqlText);
  }
}

/**
 * Ensure all PostgreSQL tables, constraints, foreign keys and indexes exist.
 */
export async function ensureTables(): Promise<void> {
  if (!initPromise) {
    initPromise = (async () => {
      const ddl = `
        CREATE TABLE IF NOT EXISTS sift_users (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          email VARCHAR(255) UNIQUE NOT NULL,
          password_hash TEXT,
          image TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sift_sessions (
          id VARCHAR(128) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES sift_users(id) ON DELETE CASCADE,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sift_categories (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES sift_users(id) ON DELETE CASCADE,
          name VARCHAR(255) NOT NULL,
          icon VARCHAR(64) NOT NULL DEFAULT 'folder',
          color VARCHAR(32) NOT NULL DEFAULT '#0a7aff',
          position DOUBLE PRECISION NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sift_bookmarks (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES sift_users(id) ON DELETE CASCADE,
          category_id VARCHAR(64) REFERENCES sift_categories(id) ON DELETE SET NULL,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          description TEXT NOT NULL DEFAULT '',
          icon_url TEXT,
          tags JSONB NOT NULL DEFAULT '[]'::jsonb,
          is_favorite BOOLEAN NOT NULL DEFAULT FALSE,
          position DOUBLE PRECISION NOT NULL DEFAULT 0,
          last_opened_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sift_user_settings (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) UNIQUE NOT NULL REFERENCES sift_users(id) ON DELETE CASCADE,
          theme VARCHAR(16) NOT NULL DEFAULT 'system',
          sidebar_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
          view_mode VARCHAR(16) NOT NULL DEFAULT 'grid',
          sort_key VARCHAR(16) NOT NULL DEFAULT 'manual',
          onboarded BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE TABLE IF NOT EXISTS sift_recently_used (
          id VARCHAR(64) PRIMARY KEY,
          user_id VARCHAR(64) NOT NULL REFERENCES sift_users(id) ON DELETE CASCADE,
          bookmark_id VARCHAR(64) NOT NULL REFERENCES sift_bookmarks(id) ON DELETE CASCADE,
          opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_sift_sessions_user_id ON sift_sessions(user_id);
        CREATE INDEX IF NOT EXISTS idx_sift_categories_user_id ON sift_categories(user_id);
        CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_user_id ON sift_bookmarks(user_id);
        CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_category_id ON sift_bookmarks(category_id);
        CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_is_favorite ON sift_bookmarks(is_favorite);
        CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_position ON sift_bookmarks(position);
        CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_last_opened ON sift_bookmarks(last_opened_at);
        CREATE INDEX IF NOT EXISTS idx_sift_recently_used_user_id ON sift_recently_used(user_id);
      `;
      await exec(ddl);
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }
  await initPromise;
}

export async function testDbConnection(): Promise<{
  ok: boolean;
  type: "neon" | "embedded";
  message?: string;
}> {
  try {
    await ensureTables();
    await query("SELECT 1 as health_check");
    return {
      ok: true,
      type: isNeonConfigured() ? "neon" : "embedded",
      message: isNeonConfigured()
        ? "Connected to Neon PostgreSQL cloud"
        : "Connected to local embedded PostgreSQL (configure DATABASE_URL for Neon)",
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      ok: false,
      type: isNeonConfigured() ? "neon" : "embedded",
      message,
    };
  }
}

/* ------------------------------------------------------------------ */
/* Scoped Database Queries for Authenticated Users                    */
/* ------------------------------------------------------------------ */

export async function fetchUserLibrary(userId: string): Promise<{
  bookmarks: Bookmark[];
  categories: Category[];
  settings: UserSettings;
}> {
  await ensureTables();

  const [rawCategories, rawBookmarks, rawSettings] = await Promise.all([
    query<{
      id: string;
      user_id: string;
      name: string;
      icon: string;
      color: string;
      position: number;
    }>(
      `SELECT id, user_id, name, icon, color, position
       FROM sift_categories
       WHERE user_id = $1
       ORDER BY position ASC, created_at ASC`,
      [userId]
    ),
    query<{
      id: string;
      user_id: string;
      category_id: string | null;
      title: string;
      url: string;
      description: string;
      icon_url: string | null;
      tags: any;
      is_favorite: boolean;
      position: number;
      last_opened_at: string | null;
      created_at: string;
    }>(
      `SELECT id, user_id, category_id, title, url, description, icon_url, tags, is_favorite, position, last_opened_at, created_at
       FROM sift_bookmarks
       WHERE user_id = $1
       ORDER BY position ASC, created_at DESC`,
      [userId]
    ),
    queryOne<{
      id: string;
      user_id: string;
      theme: string;
      sidebar_collapsed: boolean;
      view_mode: string;
      sort_key: string;
      onboarded: boolean;
    }>(
      `SELECT id, user_id, theme, sidebar_collapsed, view_mode, sort_key, onboarded
       FROM sift_user_settings
       WHERE user_id = $1`,
      [userId]
    ),
  ]);

  const categories: Category[] = rawCategories.map((c) => ({
    id: c.id,
    userId: c.user_id,
    name: c.name,
    icon: c.icon || "folder",
    color: c.color || "#0a7aff",
    position: Number(c.position ?? 0),
  }));

  const bookmarks: Bookmark[] = rawBookmarks.map((b) => ({
    id: b.id,
    userId: b.user_id,
    title: b.title,
    url: b.url,
    description: b.description || "",
    categoryId: b.category_id,
    collectionId: b.category_id,
    iconUrl: b.icon_url || undefined,
    tags: Array.isArray(b.tags) ? b.tags.map(String) : [],
    favorite: Boolean(b.is_favorite),
    isFavorite: Boolean(b.is_favorite),
    addedAt: new Date(b.created_at).getTime(),
    order: Number(b.position ?? 0),
    position: Number(b.position ?? 0),
    lastOpenedAt: b.last_opened_at ? new Date(b.last_opened_at).getTime() : null,
  }));

  let settings: UserSettings;
  if (rawSettings) {
    settings = {
      id: rawSettings.id,
      userId: rawSettings.user_id,
      theme: (rawSettings.theme as any) || "system",
      sidebarCollapsed: Boolean(rawSettings.sidebar_collapsed),
      viewMode: (rawSettings.view_mode as any) || "grid",
      sortKey: (rawSettings.sort_key as any) || "manual",
      onboarded: Boolean(rawSettings.onboarded),
    };
  } else {
    // Insert default user settings if none exist
    const defaultId = `s_${Date.now()}`;
    await query(
      `INSERT INTO sift_user_settings (id, user_id, theme, sidebar_collapsed, view_mode, sort_key, onboarded)
       VALUES ($1, $2, 'system', false, 'grid', 'manual', false)
       ON CONFLICT (user_id) DO NOTHING`,
      [defaultId, userId]
    );
    settings = {
      id: defaultId,
      userId,
      theme: "system",
      sidebarCollapsed: false,
      viewMode: "grid",
      sortKey: "manual",
      onboarded: false,
    };
  }

  return { bookmarks, categories, settings };
}

export async function upsertUserBookmark(
  userId: string,
  bookmark: {
    id: string;
    title: string;
    url: string;
    description?: string;
    categoryId?: string | null;
    tags?: string[];
    favorite?: boolean;
    position?: number;
  }
): Promise<void> {
  await ensureTables();
  const categoryId = bookmark.categoryId || null;
  const tags = JSON.stringify(bookmark.tags || []);
  const favorite = Boolean(bookmark.favorite);
  const position = bookmark.position ?? 0;
  const description = bookmark.description || "";

  await query(
    `INSERT INTO sift_bookmarks (id, user_id, category_id, title, url, description, tags, is_favorite, position, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, NOW())
     ON CONFLICT (id) DO UPDATE SET
       category_id = EXCLUDED.category_id,
       title = EXCLUDED.title,
       url = EXCLUDED.url,
       description = EXCLUDED.description,
       tags = EXCLUDED.tags,
       is_favorite = EXCLUDED.is_favorite,
       position = EXCLUDED.position,
       updated_at = NOW()
     WHERE sift_bookmarks.user_id = $2`,
    [bookmark.id, userId, categoryId, bookmark.title, bookmark.url, description, tags, favorite, position]
  );
}

export async function deleteUserBookmark(userId: string, bookmarkId: string): Promise<boolean> {
  await ensureTables();
  const res = await query(
    `DELETE FROM sift_bookmarks WHERE id = $1 AND user_id = $2 RETURNING id`,
    [bookmarkId, userId]
  );
  return res.length > 0;
}

export async function recordBookmarkOpened(userId: string, bookmarkId: string): Promise<void> {
  await ensureTables();
  await query(
    `UPDATE sift_bookmarks
     SET last_opened_at = NOW(), updated_at = NOW()
     WHERE id = $1 AND user_id = $2`,
    [bookmarkId, userId]
  );

  const recId = `rec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
  await query(
    `INSERT INTO sift_recently_used (id, user_id, bookmark_id, opened_at)
     VALUES ($1, $2, $3, NOW())`,
    [recId, userId, bookmarkId]
  );
}

export async function upsertUserCategory(
  userId: string,
  category: {
    id: string;
    name: string;
    icon?: string;
    color?: string;
    position?: number;
  }
): Promise<void> {
  await ensureTables();
  const icon = category.icon || "folder";
  const color = category.color || "#0a7aff";
  const position = category.position ?? 0;

  await query(
    `INSERT INTO sift_categories (id, user_id, name, icon, color, position, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     ON CONFLICT (id) DO UPDATE SET
       name = EXCLUDED.name,
       icon = EXCLUDED.icon,
       color = EXCLUDED.color,
       position = EXCLUDED.position,
       updated_at = NOW()
     WHERE sift_categories.user_id = $2`,
    [category.id, userId, category.name, icon, color, position]
  );
}

export async function deleteUserCategory(userId: string, categoryId: string): Promise<void> {
  await ensureTables();
  // As per Section 15: Move bookmarks in this category to Uncategorized (NULL)
  await query(
    `UPDATE sift_bookmarks
     SET category_id = NULL, updated_at = NOW()
     WHERE category_id = $1 AND user_id = $2`,
    [categoryId, userId]
  );

  // Then delete the category
  await query(
    `DELETE FROM sift_categories
     WHERE id = $1 AND user_id = $2`,
    [categoryId, userId]
  );
}

export async function updateUserPreferences(
  userId: string,
  patch: Partial<{
    theme: "system" | "light" | "dark";
    sidebarCollapsed: boolean;
    viewMode: "grid" | "list";
    sortKey: "manual" | "added" | "title" | "domain";
    onboarded: boolean;
  }>
): Promise<void> {
  await ensureTables();
  const existing = await queryOne<UserSettings>(
    `SELECT theme, sidebar_collapsed as "sidebarCollapsed", view_mode as "viewMode", sort_key as "sortKey", onboarded
     FROM sift_user_settings WHERE user_id = $1`,
    [userId]
  );

  const theme = patch.theme ?? existing?.theme ?? "system";
  const sidebarCollapsed = patch.sidebarCollapsed ?? existing?.sidebarCollapsed ?? false;
  const viewMode = patch.viewMode ?? existing?.viewMode ?? "grid";
  const sortKey = patch.sortKey ?? existing?.sortKey ?? "manual";
  const onboarded = patch.onboarded ?? existing?.onboarded ?? false;

  await query(
    `INSERT INTO sift_user_settings (id, user_id, theme, sidebar_collapsed, view_mode, sort_key, onboarded, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       theme = EXCLUDED.theme,
       sidebar_collapsed = EXCLUDED.sidebar_collapsed,
       view_mode = EXCLUDED.view_mode,
       sort_key = EXCLUDED.sort_key,
       onboarded = EXCLUDED.onboarded,
       updated_at = NOW()`,
    [`s_${userId}`, userId, theme, sidebarCollapsed, viewMode, sortKey, onboarded]
  );
}
