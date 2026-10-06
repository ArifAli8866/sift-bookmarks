-- Sift — PostgreSQL Schema (Neon & Embedded PostgreSQL)
-- This schema supports real multi-user authentication and strictly scoped user workspaces.

-- 1. Users table
CREATE TABLE IF NOT EXISTS sift_users (
  id VARCHAR(64) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT,
  image TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. User sessions table (for secure cookie authentication)
CREATE TABLE IF NOT EXISTS sift_sessions (
  id VARCHAR(128) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES sift_users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Custom categories table (scoped to user)
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

-- 4. Bookmarks table (strictly scoped to user)
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

-- 5. User settings / preferences table
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

-- 6. Recently opened bookmarks audit/tracking
CREATE TABLE IF NOT EXISTS sift_recently_used (
  id VARCHAR(64) PRIMARY KEY,
  user_id VARCHAR(64) NOT NULL REFERENCES sift_users(id) ON DELETE CASCADE,
  bookmark_id VARCHAR(64) NOT NULL REFERENCES sift_bookmarks(id) ON DELETE CASCADE,
  opened_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for fast scoped queries and optimal latency
CREATE INDEX IF NOT EXISTS idx_sift_sessions_user_id ON sift_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sift_categories_user_id ON sift_categories(user_id);
CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_user_id ON sift_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_category_id ON sift_bookmarks(category_id);
CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_is_favorite ON sift_bookmarks(is_favorite);
CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_position ON sift_bookmarks(position);
CREATE INDEX IF NOT EXISTS idx_sift_bookmarks_last_opened ON sift_bookmarks(last_opened_at);
CREATE INDEX IF NOT EXISTS idx_sift_recently_used_user_id ON sift_recently_used(user_id);
