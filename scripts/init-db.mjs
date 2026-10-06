#!/usr/bin/env node
import { neon } from "@neondatabase/serverless";

const url = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!url) {
  console.error("❌ Error: DATABASE_URL (or POSTGRES_URL) environment variable is not set.");
  console.error("Please set it in your .env.local file or pass it directly:");
  console.error("  DATABASE_URL=postgresql://... npm run db:init\n");
  process.exit(1);
}

console.log("Connecting to Neon PostgreSQL...");

try {
  const sql = neon(url);
  const [res] = await sql`SELECT version();`;
  console.log("✅ Successfully connected to PostgreSQL:");
  console.log(`   ${res.version.split("\n")[0]}\n`);

  console.log("Creating tables and indexes if they do not exist...");

  await sql`
    CREATE TABLE IF NOT EXISTS sift_collections (
      id VARCHAR(64) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      icon VARCHAR(64) NOT NULL DEFAULT 'folder',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `;
  console.log("  ✓ Table 'sift_collections' ready");

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
  console.log("  ✓ Table 'sift_bookmarks' ready");

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
  console.log("  ✓ Table 'sift_prefs' ready");

  await sql`CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_collection_id ON sift_bookmarks(collection_id);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_favorite ON sift_bookmarks(favorite);`;
  await sql`CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_sort_order ON sift_bookmarks(sort_order);`;
  console.log("  ✓ Indexes ready");

  console.log("\n🎉 Database initialization complete! Your Neon database is ready for Sift.");
} catch (err) {
  console.error("❌ Database initialization failed:", err.message);
  process.exit(1);
}
