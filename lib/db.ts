import { neon } from "@neondatabase/serverless";
import type { Bookmark, Collection, Prefs } from "./store";

export function getDatabaseUrl(): string | null {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || null;
}

export function isDbConfigured(): boolean {
  return Boolean(getDatabaseUrl());
}

export function getSql() {
  const url = getDatabaseUrl();
  if (!url) return null;
  return neon(url);
}

let initPromise: Promise<void> | null = null;

export async function ensureTables() {
  const sql = getSql();
  if (!sql) return;

  if (!initPromise) {
    initPromise = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS sift_collections (
          id VARCHAR(64) PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          icon VARCHAR(64) NOT NULL DEFAULT 'folder',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sift_bookmarks (
          id VARCHAR(64) PRIMARY KEY,
          title TEXT NOT NULL,
          url TEXT NOT NULL,
          collection_id VARCHAR(64) REFERENCES sift_collections(id) ON DELETE SET NULL,
          tags JSONB NOT NULL DEFAULT '[]'::jsonb,
          favorite BOOLEAN NOT NULL DEFAULT FALSE,
          added_at BIGINT NOT NULL,
          sort_order DOUBLE PRECISION NOT NULL DEFAULT 0,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`
        CREATE TABLE IF NOT EXISTS sift_prefs (
          id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
          view_mode VARCHAR(16) NOT NULL DEFAULT 'grid',
          sort_key VARCHAR(16) NOT NULL DEFAULT 'manual',
          theme VARCHAR(16) NOT NULL DEFAULT 'system',
          sidebar_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `;

      await sql`CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_collection_id ON sift_bookmarks(collection_id);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_favorite ON sift_bookmarks(favorite);`;
      await sql`CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_sort_order ON sift_bookmarks(sort_order);`;
    })().catch((err) => {
      initPromise = null;
      throw err;
    });
  }

  await initPromise;
}

export async function testDbConnection(): Promise<{ ok: boolean; message?: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, message: "DATABASE_URL not configured" };

  try {
    await sql`SELECT 1 as health_check`;
    return { ok: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return { ok: false, message };
  }
}

export async function fetchLibraryFromDb(): Promise<{
  bookmarks: Bookmark[];
  collections: Collection[];
  prefs?: Partial<Prefs>;
}> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured");

  await ensureTables();

  const [rawCollections, rawBookmarks, rawPrefs] = await Promise.all([
    sql`SELECT id, name, icon FROM sift_collections ORDER BY created_at ASC`,
    sql`SELECT id, title, url, collection_id as "collectionId", tags, favorite, added_at as "addedAt", sort_order as "order" FROM sift_bookmarks ORDER BY sort_order ASC, added_at DESC`,
    sql`SELECT view_mode as "viewMode", sort_key as "sortKey", theme, sidebar_collapsed as "sidebarCollapsed" FROM sift_prefs WHERE id = 'default' LIMIT 1`,
  ]);

  const collections: Collection[] = (rawCollections as Array<{ id: string; name: string; icon: string }>).map((r) => ({
    id: String(r.id),
    name: String(r.name),
    icon: String(r.icon || "folder"),
  }));

  const bookmarks: Bookmark[] = (rawBookmarks as Array<{
    id: string;
    title: string;
    url: string;
    collectionId: string | null;
    tags: unknown;
    favorite: boolean;
    addedAt: number | string;
    order: number | string;
  }>).map((r) => ({
    id: String(r.id),
    title: String(r.title),
    url: String(r.url),
    collectionId: r.collectionId ? String(r.collectionId) : null,
    tags: Array.isArray(r.tags) ? r.tags.map(String) : [],
    favorite: Boolean(r.favorite),
    addedAt: Number(r.addedAt || Date.now()),
    order: Number(r.order ?? 0),
  }));

  const typedPrefs = rawPrefs as Array<{ viewMode: string; sortKey: string; theme: string; sidebarCollapsed: boolean }>;
  const firstPref = typedPrefs[0];
  const prefs = firstPref
    ? {
        viewMode: firstPref.viewMode as Prefs["viewMode"],
        sortKey: firstPref.sortKey as Prefs["sortKey"],
        theme: firstPref.theme as Prefs["theme"],
        sidebarCollapsed: Boolean(firstPref.sidebarCollapsed),
      }
    : undefined;

  return { bookmarks, collections, prefs };
}

export async function syncLibraryToDb(data: {
  bookmarks: Bookmark[];
  collections: Collection[];
  prefs?: Prefs;
}): Promise<{ ok: boolean }> {
  const sql = getSql();
  if (!sql) throw new Error("DATABASE_URL is not configured");

  await ensureTables();

  // 1. Sync collections
  if (data.collections.length > 0) {
    const collPayload = JSON.stringify(data.collections);
    await sql`
      INSERT INTO sift_collections (id, name, icon)
      SELECT id, name, icon
      FROM jsonb_to_recordset(${collPayload}::jsonb)
      AS x(id text, name text, icon text)
      ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        icon = EXCLUDED.icon;
    `;

    const collIds = JSON.stringify(data.collections.map((c) => c.id));
    await sql`
      DELETE FROM sift_collections
      WHERE id NOT IN (SELECT * FROM jsonb_array_elements_text(${collIds}::jsonb));
    `;
  } else {
    await sql`DELETE FROM sift_collections;`;
  }

  // 2. Sync bookmarks
  if (data.bookmarks.length > 0) {
    const bookPayload = JSON.stringify(data.bookmarks);
    await sql`
      INSERT INTO sift_bookmarks (id, title, url, collection_id, tags, favorite, added_at, sort_order)
      SELECT id, title, url, "collectionId", tags, favorite, "addedAt", "order"
      FROM jsonb_to_recordset(${bookPayload}::jsonb)
      AS x(id text, title text, url text, "collectionId" text, tags jsonb, favorite boolean, "addedAt" bigint, "order" double precision)
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        url = EXCLUDED.url,
        collection_id = EXCLUDED.collection_id,
        tags = EXCLUDED.tags,
        favorite = EXCLUDED.favorite,
        added_at = EXCLUDED.added_at,
        sort_order = EXCLUDED.sort_order;
    `;

    const bookIds = JSON.stringify(data.bookmarks.map((b) => b.id));
    await sql`
      DELETE FROM sift_bookmarks
      WHERE id NOT IN (SELECT * FROM jsonb_array_elements_text(${bookIds}::jsonb));
    `;
  } else {
    await sql`DELETE FROM sift_bookmarks;`;
  }

  // 3. Sync preferences if provided
  if (data.prefs) {
    await sql`
      INSERT INTO sift_prefs (id, view_mode, sort_key, theme, sidebar_collapsed, updated_at)
      VALUES (
        'default',
        ${data.prefs.viewMode},
        ${data.prefs.sortKey},
        ${data.prefs.theme},
        ${data.prefs.sidebarCollapsed},
        NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        view_mode = EXCLUDED.view_mode,
        sort_key = EXCLUDED.sort_key,
        theme = EXCLUDED.theme,
        sidebar_collapsed = EXCLUDED.sidebar_collapsed,
        updated_at = NOW();
    `;
  }

  return { ok: true };
}

export async function upsertBookmarkDb(bookmark: Bookmark): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTables();

  await sql`
    INSERT INTO sift_bookmarks (id, title, url, collection_id, tags, favorite, added_at, sort_order)
    VALUES (
      ${bookmark.id},
      ${bookmark.title},
      ${bookmark.url},
      ${bookmark.collectionId},
      ${JSON.stringify(bookmark.tags)}::jsonb,
      ${bookmark.favorite},
      ${bookmark.addedAt},
      ${bookmark.order}
    )
    ON CONFLICT (id) DO UPDATE SET
      title = EXCLUDED.title,
      url = EXCLUDED.url,
      collection_id = EXCLUDED.collection_id,
      tags = EXCLUDED.tags,
      favorite = EXCLUDED.favorite,
      added_at = EXCLUDED.added_at,
      sort_order = EXCLUDED.sort_order;
  `;
}

export async function deleteBookmarkDb(id: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTables();
  await sql`DELETE FROM sift_bookmarks WHERE id = ${id}`;
}

export async function upsertCollectionDb(collection: Collection): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTables();

  await sql`
    INSERT INTO sift_collections (id, name, icon)
    VALUES (${collection.id}, ${collection.name}, ${collection.icon})
    ON CONFLICT (id) DO UPDATE SET
      name = EXCLUDED.name,
      icon = EXCLUDED.icon;
  `;
}

export async function deleteCollectionDb(id: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTables();
  await sql`DELETE FROM sift_collections WHERE id = ${id}`;
}
