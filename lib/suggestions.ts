export interface Suggestion {
  id: string;
  title: string;
  url: string;
  description: string;
  category: string;
  tags: string[];
}

export const SUGGESTED_BOOKMARKS: Suggestion[] = [
  // Development
  {
    id: "sug_github",
    title: "GitHub",
    url: "https://github.com",
    description: "Code hosting, Git repositories, pull requests, and CI/CD actions.",
    category: "Development",
    tags: ["git", "code", "vcs"],
  },
  {
    id: "sug_mdn",
    title: "MDN Web Docs",
    url: "https://developer.mozilla.org",
    description: "The definitive reference manual for HTML, CSS, and modern JavaScript APIs.",
    category: "Development",
    tags: ["docs", "web", "standards"],
  },
  {
    id: "sug_react",
    title: "React Documentation",
    url: "https://react.dev",
    description: "The official documentation for React 19, hooks, and server components.",
    category: "Development",
    tags: ["react", "ui", "frontend"],
  },
  {
    id: "sug_nextjs",
    title: "Next.js Documentation",
    url: "https://nextjs.org/docs",
    description: "The React framework for the Web with App Router, SSR, and API routes.",
    category: "Development",
    tags: ["nextjs", "react", "fullstack"],
  },
  {
    id: "sug_typescript",
    title: "TypeScript Handbook",
    url: "https://www.typescriptlang.org/docs",
    description: "Typed JavaScript at Any Scale — official handbook and compiler reference.",
    category: "Development",
    tags: ["typescript", "types", "compiler"],
  },
  {
    id: "sug_nodejs",
    title: "Node.js Documentation",
    url: "https://nodejs.org/docs/latest/api/",
    description: "V8-powered asynchronous JavaScript runtime for scalable backend servers.",
    category: "Development",
    tags: ["node", "backend", "runtime"],
  },
  {
    id: "sug_npm",
    title: "npm Registry",
    url: "https://www.npmjs.com",
    description: "Package registry and dependency explorer for the JavaScript ecosystem.",
    category: "Development",
    tags: ["npm", "packages", "deps"],
  },

  // AI
  {
    id: "sug_chatgpt",
    title: "ChatGPT",
    url: "https://chatgpt.com",
    description: "OpenAI conversational assistant, GPT models, and code problem solving.",
    category: "AI",
    tags: ["ai", "assistant", "openai"],
  },
  {
    id: "sug_claude",
    title: "Claude",
    url: "https://claude.ai",
    description: "Anthropic AI assistant for deep thinking, analysis, and architecture advice.",
    category: "AI",
    tags: ["ai", "anthropic", "assistant"],
  },
  {
    id: "sug_huggingface",
    title: "Hugging Face",
    url: "https://huggingface.co",
    description: "The hub for open-weights machine learning models, datasets, and spaces.",
    category: "AI",
    tags: ["ai", "models", "ml"],
  },

  // Database
  {
    id: "sug_neon",
    title: "Neon Console",
    url: "https://console.neon.tech",
    description: "Serverless PostgreSQL with instant branching, autoscaling, and connection pooling.",
    category: "Database",
    tags: ["postgres", "database", "serverless"],
  },
  {
    id: "sug_supabase",
    title: "Supabase Dashboard",
    url: "https://supabase.com/dashboard",
    description: "Open-source Firebase alternative with PostgreSQL, Auth, and Storage.",
    category: "Database",
    tags: ["database", "postgres", "auth"],
  },
  {
    id: "sug_prisma",
    title: "Prisma Documentation",
    url: "https://www.prisma.io/docs",
    description: "Next-generation TypeScript ORM with schema migrations and type safety.",
    category: "Database",
    tags: ["orm", "database", "typescript"],
  },
  {
    id: "sug_mongodb",
    title: "MongoDB Atlas",
    url: "https://cloud.mongodb.com",
    description: "Fully managed cloud document database with flexible JSON-like schemas.",
    category: "Database",
    tags: ["nosql", "mongodb", "database"],
  },

  // Deployment
  {
    id: "sug_vercel",
    title: "Vercel Dashboard",
    url: "https://vercel.com/dashboard",
    description: "Frontend cloud platform for zero-config deployments, analytics, and speed.",
    category: "Deployment",
    tags: ["deploy", "hosting", "cloud"],
  },
  {
    id: "sug_railway",
    title: "Railway Dashboard",
    url: "https://railway.app/dashboard",
    description: "Instant cloud infrastructure for databases, backend containers, and microservices.",
    category: "Deployment",
    tags: ["deploy", "infra", "containers"],
  },
  {
    id: "sug_netlify",
    title: "Netlify",
    url: "https://app.netlify.com",
    description: "Modern composable web platform with Edge functions and CDN deploys.",
    category: "Deployment",
    tags: ["deploy", "edge", "cdn"],
  },

  // Tools
  {
    id: "sug_postman",
    title: "Postman API Platform",
    url: "https://www.postman.com",
    description: "Collaborative platform for designing, testing, and debugging REST & GraphQL APIs.",
    category: "Tools",
    tags: ["api", "testing", "http"],
  },
  {
    id: "sug_regex101",
    title: "Regex101",
    url: "https://regex101.com",
    description: "Interactive regular expression builder, debugger, and explanation tool.",
    category: "Tools",
    tags: ["regex", "tools", "debug"],
  },
  {
    id: "sug_jsonformatter",
    title: "JSON Formatter",
    url: "https://jsonformatter.org",
    description: "Clean JSON validator, beautifier, minifier, and structural parser.",
    category: "Tools",
    tags: ["json", "format", "tools"],
  },
  {
    id: "sug_excalidraw",
    title: "Excalidraw",
    url: "https://excalidraw.com",
    description: "Hand-drawn virtual whiteboard for system architecture and quick wireframes.",
    category: "Tools",
    tags: ["diagrams", "whiteboard", "design"],
  },
  {
    id: "sug_caniuse",
    title: "Can I Use",
    url: "https://caniuse.com",
    description: "Up-to-date browser compatibility tables for modern HTML, CSS, and JS features.",
    category: "Tools",
    tags: ["compat", "browsers", "css"],
  },
];

export const DEFAULT_ONBOARDING_CATEGORIES = [
  { name: "Development", icon: "code", color: "#0a7aff" },
  { name: "AI", icon: "sparkle", color: "#8b5cf6" },
  { name: "Database", icon: "wrench", color: "#06b6d4" },
  { name: "Deployment", icon: "briefcase", color: "#10b981" },
  { name: "Tools", icon: "wrench", color: "#f59e0b" },
  { name: "Documentation", icon: "book", color: "#6366f1" },
  { name: "Design", icon: "swatch", color: "#f43f5e" },
];
