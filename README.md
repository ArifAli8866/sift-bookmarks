<div align="center">

# ✦ SIFT

### Your personal developer library.

**Save. Organize. Search. Ship.**

A beautiful workspace for all the websites, tools, documentation and resources you use every day.

<br />

[![Live Demo](https://img.shields.io/badge/Live%20Demo-000000?style=for-the-badge\&logo=vercel\&logoColor=white)](https://sift-bookmarks.vercel.app/)
[![Next.js](https://img.shields.io/badge/Next.js-000000?style=flat-square\&logo=next.js\&logoColor=white)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square\&logo=typescript\&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square\&logo=postgresql\&logoColor=white)](https://www.postgresql.org/)
[![Neon](https://img.shields.io/badge/Neon-00E599?style=flat-square\&logo=neon\&logoColor=black)](https://neon.tech/)

<br />

<a href="https://sift-bookmarks.vercel.app/">
  <img src="https://img.shields.io/badge/OPEN%20SIFT-%E2%86%92-111111?style=for-the-badge" />
</a>

</div>

<br />

---

<div align="center">

## The developer web, organized.

<img src="./public/screenshots/dashboard.png" alt="Sift Dashboard" width="950"/>

</div>

---

## ✦ THE PROBLEM

<div align="center">

### Too many tabs.

### Too many bookmarks.

### Too many useful websites.

<br />

`text
GitHub    MDN    React    Next.js    npm
Vercel    Neon   Supabase    Prisma
ChatGPT   Claude  Postman    Figma
Regex101  Docker  Railway    ...
``
### Sift brings them together.

</div>

---

## ⚡ ONE PLACE. EVERYTHING YOU NEED.

``mermaid
mindmap
  root((SIFT))
    Development
      GitHub
      React
      Next.js
      TypeScript
      npm
    AI
      ChatGPT
      Claude
      Hugging Face
      OpenRouter
    Database
      Neon
      Supabase
      Prisma
      MongoDB
    Deployment
      Vercel
      Railway
      Netlify
    Tools
      Postman
      Regex101
      JSON
      Excalidraw
    Design
      Figma
      Dribbble
      Unsplash
``
---

# ✦ BUILT FOR YOUR WORKFLOW

<div align="center">

|        🔖       |           ⭐           |        🗂️        |       🔎       |
| :-------------: | :-------------------: | :---------------: | :------------: |
|  **Bookmarks**  |     **Favorites**     |   **Categories**  |   **Search**   |
| Save everything | Keep essentials close | Organize your way | Find instantly |

</div>

---

## 🔖 YOUR BOOKMARKS

Save the websites you actually use.

<div align="center">

<img src="./public/screenshots/bookmarks.png" alt="Bookmarks" width="900"/>

</div>

``text
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│ ◉                │  │ ◉                │  │ ◉                │
│                  │  │                  │  │                  │
│ GitHub           │  │ React            │  │ Next.js          │
│ Code hosting     │  │ Documentation    │  │ Documentation    │
│                  │  │                  │  │                  │
│ Development  ☆   │  │ Development  ☆   │  │ Development  ★   │
└──────────────────┘  └──────────────────┘  └──────────────────┘
`

# ✦ ORGANIZE YOUR WAY

Create categories that match **your** workflow.

mermaid
flowchart LR
    A[Your Library] --> B[Development]
    A --> C[AI]
    A --> D[Database]
    A --> E[Design]
    A --> F[Deployment]
    A --> G[Tools]
    B --> B1[GitHub]
    B --> B2[React]
    B --> B3[Next.js]
    C --> C1[ChatGPT]
    C --> C2[Claude]
    D --> D1[Neon]
    D --> D2[Supabase]
    E --> E1[Figma]
    E --> E2[Dribbble]
``

### Categories are yours.

Create them.

Rename them.

Customize them.

Organize your library exactly how you work.

---

# ✦ SEARCH WITHOUT THE HUNT

<div align="center">

``text
┌───────────────────────────────────────────────────────┐
│  ⌕   Search your library...                    ⌘ K   │
└───────────────────────────────────────────────────────┘
`

<br />

### Type → Find → Open

</div>

Search across:

``text
Title
   ↓
URL
   ↓
Description
   ↓
Category
`

# ⌘ COMMAND PALETTE

<div align="center">

<img src="./public/screenshots/command-palette.png" alt="Command Palette" width="700"/>

</div>

``text
                 ┌───────────────────────────────┐
                 │ ⌕  Search anything...         │
                 ├───────────────────────────────┤
                 │                               │
                 │  ◉  GitHub                    │
                 │     github.com                │
                 │                               │
                 │  ◉  GitHub Docs               │
                 │     docs.github.com           │
                 │                               │
                 │  ◉  GitHub API                │
                 │     docs.github.com/api       │
                 │                               │
                 └───────────────────────────────┘
`

Press:

**⌘ K / Ctrl K**

Search your entire library without leaving the keyboard.

---

# ✦ YOUR DATA. YOUR LIBRARY.

Sift is built around **personal workspaces**.
mermaid
flowchart TB
    USER["👤 User"]
    USER --> AUTH["🔐 Authentication"]
    AUTH --> WORKSPACE["✦ Personal Workspace"]
    WORKSPACE --> BOOKMARKS["🔖 Bookmarks"]
    WORKSPACE --> CATEGORIES["🗂 Categories"]
    WORKSPACE --> FAVORITES["⭐ Favorites"]
    WORKSPACE --> RECENT["🕐 Recent"]
    BOOKMARKS --> DB[("PostgreSQL")]
    CATEGORIES --> DB
    FAVORITES --> DB
    RECENT --> DB

Every account gets its own data.

`text
User A
 ├── GitHub
 ├── React
 └── Vercel

        ≠

User B
 ├── Figma
 ├── Claude
 └── Supabase
`
---

# 🔐 PRIVATE BY DESIGN

Authentication:

``text
┌─────────────────────┐
│       SIFT          │
│                     │
│  Email              │
│  ┌───────────────┐  │
│  │               │  │
│  └───────────────┘  │
│                     │
│  Password           │
│  ┌───────────────┐  │
│  │               │  │
│  └───────────────┘  │
│                     │
│  [ Create Account ] │
│                     │
│  ─────── OR ─────── │
│                     │
│  [ Continue Google ]│
│                     │
└─────────────────────┘
`

Your bookmarks belong to **your account**.

---

# ✦ SUGGESTIONS, NOT DUMMY DATA

New users don't start with a library full of fake bookmarks.

Instead:

`text
              YOUR EMPTY LIBRARY
        "Build your developer toolbox"
            Popular suggestions
       ┌────────┐ ┌────────┐ ┌────────┐
       │ GitHub │ │  MDN   │ │ React  │
       │  + Add │ │  + Add │ │  + Add │
       └────────┘ └────────┘ └────────┘
       ┌────────┐ ┌────────┐ ┌────────┐
       │ Vercel │ │  Neon  │ │ npm    │
       │  + Add │ │  + Add │ │  + Add │
       └────────┘ └────────┘ └────────┘


Nothing is added automatically.

**You choose your library.**

---

# 📊 YOUR WORKSPACE AT A GLANCE

``text
╭──────────────────╮  ╭──────────────────╮
│                  │  │                  │
│       42         │  │       12         │
│                  │  │                  │
│    Bookmarks     │  │    Favorites     │
│                  │  │                  │
╰──────────────────╯  ╰──────────────────╯

╭──────────────────╮  ╭──────────────────╮
│                  │  │                  │
│        7         │  │        9         │
│                  │  │                  │
│    Categories    │  │     Recent      │
│                  │  │                  │
╰──────────────────╯  ╰──────────────────╯
``
---

# 🧱 ARCHITECTURE
`mermaid
flowchart LR
    UI["Next.js + React"]
    UI --> AUTH["Authentication"]
    UI --> ACTIONS["Server Actions"]
    ACTIONS --> ORM["Drizzle ORM"]
    ORM --> DB[("Neon PostgreSQL")]
    UI --> MOTION["Motion"]
    UI --> UIKIT["Tailwind + UI Components"]
``

---

# 🛠️ STACK

<div align="center">

### Frontend

![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge\&logo=next.js\&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge\&logo=react\&logoColor=61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge\&logo=typescript\&logoColor=white)

### UI

![Tailwind](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=for-the-badge\&logo=tailwindcss\&logoColor=white)
![Motion](https://img.shields.io/badge/Motion-FF0055?style=for-the-badge)

### Backend

![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge\&logo=postgresql\&logoColor=white)
![Drizzle](https://img.shields.io/badge/Drizzle-ORM-C5F74F?style=for-the-badge)

### Infrastructure

![Neon](https://img.shields.io/badge/Neon-00E599?style=for-the-badge)
![Vercel](https://img.shields.io/badge/Vercel-000000?style=for-the-badge\&logo=vercel\&logoColor=white)

</div>

---

# 🗃️ DATA MODEL

``mermaid
erDiagram
    USER ||--o{ BOOKMARK : owns
    USER ||--o{ CATEGORY : creates
    USER ||--|| USER_SETTINGS : has
    BOOKMARK }o--|| CATEGORY : belongs_to
    BOOKMARK ||--o{ RECENTLY_USED : appears_in
    USER {
        string id
        string email
        string name
        string image
    }
    CATEGORY {
        string id
        string user_id
        string name
        string icon
        string color
    }
    BOOKMARK {
        string id
        string user_id
        string category_id
        string title
        string url
        string description
        boolean is_favorite
        datetime last_opened_at
    }
    RECENTLY_USED {
        string id
        string bookmark_id
        datetime opened_at
    }
    USER_SETTINGS {
        string id
        string user_id
        string theme
        boolean sidebar_collapsed
    }
`

# ⚙️ QUICK START

``bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git

cd YOUR_REPOSITORY

npm install

npm run dev
``
Open:

``text
http://localhost:3000
`

# 🔑 ENVIRONMENT

Create `.env.local`:

``env
DATABASE_URL="your-neon-database-url"

AUTH_SECRET="your-auth-secret"

GOOGLE_CLIENT_ID="your-google-client-id"

GOOGLE_CLIENT_SECRET="your-google-client-secret"

NEXT_PUBLIC_APP_URL="http://localhost:3000"
``
# 🧭 ROADMAP

``text
                    SIFT
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
      CORE          ACCOUNT       POWER
        │             │             │
        │             │             │
     Bookmarks     Google Auth    Command K
     Categories    Email Auth     Keyboard
     Favorites     Profiles       Drag & Drop
     Search        Security       Dark Mode
        │             │             │
        └─────────────┼─────────────┘
                      │
                      ▼
                 BROWSER EXTENSION
                      │
                      ├── Save current page
                      ├── Right-click → Sift
                      ├── Quick add
                      └── Sync
```

---

# 🌐 FUTURE

### Sift Browser Extension

The long-term goal:
``text
                 ANY WEBSITE
                      │
                      ▼
              ┌───────────────┐
              │  Sift Chrome  │
              │   Extension   │
              └───────┬───────┘
                      │
                      ▼
              Select Category
                      │
                      ▼
                    SAVE
                      │
                      ▼
             ✦ YOUR SIFT LIBRARY
`

One click.

Saved.

Organized.

Done.

---

# 📈 PROJECT VISION

``text
Bookmarks
     ↓
Personal Library
     ↓
Developer Workspace
     ↓
Browser Extension
     ↓
Your developer command center
`

Sift isn't trying to replace your browser.

It makes the **web you use every day easier to access.**

---

<div align="center">

# ✦ SIFT

### Your personal developer library.

**Less searching.
Less remembering.
More building.**

<br />

<a href="https://sift-bookmarks.vercel.app/">

<img src="https://img.shields.io/badge/TRY%20SIFT%20%E2%86%92-111111?style=for-the-badge" />

</a>

<br /><br />

⭐ **If Sift is useful to you, consider giving the project a star.**

</div>
