-- Sift — Neon PostgreSQL Schema
-- Run this in the Neon SQL Editor or let the app automatically initialize it on first run.

-- 1. Collections table
CREATE TABLE IF NOT EXISTS sift_collections (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  icon VARCHAR(64) NOT NULL DEFAULT 'folder',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Bookmarks table
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

-- 3. Preferences table
CREATE TABLE IF NOT EXISTS sift_prefs (
  id VARCHAR(32) PRIMARY KEY DEFAULT 'default',
  view_mode VARCHAR(16) NOT NULL DEFAULT 'grid',
  sort_key VARCHAR(16) NOT NULL DEFAULT 'manual',
  theme VARCHAR(16) NOT NULL DEFAULT 'system',
  sidebar_collapsed BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_collection_id ON sift_bookmarks(collection_id);
CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_favorite ON sift_bookmarks(favorite);
CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_sort_order ON sift_bookmarks(sort_order);
