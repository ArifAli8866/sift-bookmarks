# Sift — Keyboard-First Bookmark Manager

**Sift** is a keyboard-first bookmark manager designed for developers. It pairs fast client-side performance with **Neon Serverless PostgreSQL** cloud persistence and is optimized for zero-config deployment on **Vercel**.

---

## ✨ Features

- ⚡ **Instant & Optimistic UI**: Immediate client-side reactions backed by automatic cloud synchronization.
- 🐘 **Neon Serverless PostgreSQL**: Robust, scalable cloud storage with automatic table migration.
- 🔍 **Command Palette (`⌘K` / `Ctrl+K`)**: Fuzzy search across titles, URLs, tags, and collections.
- 🗂 **Collections & Tags**: Organize bookmarks into folders and multi-tag taxonomies.
- ⭐ **Favourites & Recents**: One-tap access to frequently used developer resources.
- 🖱 **Manual Drag & Reorder**: Customize item ordering with persistent fractional sorting.
- 🌓 **Theme Support**: Seamless Dark, Light, and System appearance modes with zero flicker.
- 🛡 **Graceful Local Fallback**: Continues functioning via browser `localStorage` if offline or running without a database.

---

## 🛠 Tech Stack

- **Framework**: [Next.js 16](https://nextjs.org/) (App Router & Turbopack)
- **UI Library**: [React 19](https://react.dev/)
- **Language**: [TypeScript 5](https://www.typescriptlang.org/)
- **Database**: [Neon PostgreSQL](https://neon.tech/) (`@neondatabase/serverless`)
- **Styling**: Modern CSS design system (tokens, variables, theme switches)
- **Deployment**: [Vercel](https://vercel.com/)

---

## 🚀 Getting Started Locally

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables (Optional for local testing)

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

If you have a Neon PostgreSQL database, add your connection string in `.env.local`:

```env
DATABASE_URL="postgresql://user:password@ep-sample-pooler.us-east-2.aws.neon.tech/neondb?sslmode=require"
```

*(Note: If `DATABASE_URL` is omitted, Sift automatically runs in local storage mode.)*

### 3. Initialize Database (Optional)

If you configured `DATABASE_URL`, initialize the database tables:

```bash
npm run db:init
```

### 4. Run Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser.

---

## 📋 Complete Step-by-Step Deployment Guide

Follow these three steps to deploy Sift to production:

### STEP 1: Set Up Neon PostgreSQL Database

1. Sign up or log in at **[https://console.neon.tech](https://console.neon.tech)**.
2. Click **Create Project** (e.g. name it `sift-db`).
3. Once created, in your Neon Dashboard under **Connection Details**:
   - Select **Connection string**.
   - Make sure **Pooled connection** is checked (recommended for serverless).
   - Copy the connection URL. It looks like:
     ```text
     postgresql://<user>:<password>@<ep-name>-pooler.<region>.aws.neon.tech/<dbname>?sslmode=require
     ```
4. *(Optional)* You can run the queries from `schema.sql` in the **SQL Editor** tab of Neon console, or let Sift automatically create the tables on the first API request or via `npm run db:init`.

---

### STEP 2: Push Code to GitHub

1. Create a new repository on **[GitHub](https://github.com/new)** (e.g. `sift` or `sift-bookmarks`). Keep it private or public as you prefer.
2. In your terminal, initialize and commit the repository:

```bash
git add .
git commit -m "feat: initial commit - production ready with Neon PostgreSQL and Vercel support"
```

3. Link your local repository to your GitHub repository and push:

```bash
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/<YOUR_REPOSITORY_NAME>.git
git branch -M main
git push -u origin main
```

---

### STEP 3: Deploy to Vercel

1. Log in to **[Vercel](https://vercel.com)**.
2. Click **Add New…** → **Project**.
3. Import your newly pushed **GitHub repository**.
4. In the configuration screen:
   - **Framework Preset**: Next.js (automatically detected)
   - **Root Directory**: `./` (default)
5. Expand the **Environment Variables** section:
   - Key: `DATABASE_URL`
   - Value: Paste your Neon PostgreSQL connection string from **Step 1**.
6. Click **Deploy**.
7. Vercel will build and deploy your application in under a minute!
8. When deployment finishes, click on the live URL. Sift is now live with full cloud database persistence!

---

## 📡 API Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/api/status` | `GET` | Health check and Neon DB connectivity report |
| `/api/library` | `GET` | Fetch all bookmarks, collections, and preferences |
| `/api/library` | `POST` | Batch sync library changes to Neon DB |
| `/api/bookmarks` | `GET`, `POST` | List all bookmarks or create a new bookmark |
| `/api/bookmarks/[id]` | `PATCH`, `DELETE` | Update or remove a specific bookmark |
| `/api/collections` | `GET`, `POST` | List all collections or create a new collection |
| `/api/collections/[id]` | `PATCH`, `DELETE` | Update or remove a specific collection |

---

## ⌨️ Useful Commands

```bash
npm run dev        # Start development server on port 3000
npm run build      # Create optimized production build
npm run check      # Run TypeScript checks and design token verification
npm run db:init    # Initialize database tables and indexes in Neon
npm run start      # Start production server
```
