import type { Bookmark, Collection } from "./store";

const DAY = 86_400_000;

/**
 * Sample library. Deliberately un-flashy: real domains, uneven titles,
 * varied ages, a few duplicates-looking neighbours — the way an actual
 * browser profile looks. A seed that reads like a template makes the whole
 * interface read like a template.
 */
export function seedLibrary(): { bookmarks: Bookmark[]; collections: Collection[] } {
  const now = Date.now();
  const collections: Collection[] = [
    { id: "c_docs", name: "Docs & Reference", icon: "book" },
    { id: "c_tools", name: "Tools", icon: "wrench" },
    { id: "c_design", name: "Design", icon: "swatch" },
    { id: "c_infra", name: "Infra & deploys", icon: "briefcase" },
    { id: "c_read", name: "Read later", icon: "bookmark" },
    { id: "c_snips", name: "Snippets", icon: "code" },
  ];

  type Row = [title: string, url: string, collection: string | null, tags: string[], fav: boolean, daysAgo: number];

  const rows: Row[] = [
    ["MDN — CSS grid layout", "https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_grid_layout", "c_docs", ["css", "layout"], true, 1.2],
    ["React — useSyncExternalStore", "https://react.dev/reference/react/useSyncExternalStore", "c_docs", ["react"], false, 0.4],
    ["TypeScript Handbook — Narrowing", "https://www.typescriptlang.org/docs/handbook/2/narrowing.html", "c_docs", ["ts"], false, 6],
    ["Rust Book — Error Handling", "https://doc.rust-lang.org/book/ch09-00-error-handling.html", "c_docs", ["rust"], false, 12],
    ["caniuse — CSS :has()", "https://caniuse.com/css-has", "c_docs", ["css", "compat"], true, 2.1],
    ["Web.dev — View transitions", "https://web.dev/view-transitions/", "c_docs", ["css", "motion"], false, 4],
    ["Bun docs", "https://bun.sh/docs", "c_docs", ["runtime"], false, 9],

    ["Linear — Keyboard shortcuts", "https://linear.app/docs/keyboard-shortcuts", "c_tools", ["keyboard"], false, 3],
    ["Raycast — Extension API", "https://developers.raycast.com/", "c_tools", ["macos"], false, 7],
    ["Figma — Variables REST API", "https://www.figma.com/developers/api#variables", "c_tools", ["figma", "api"], false, 14],
    ["Excalidraw", "https://excalidraw.com/", "c_tools", ["diagrams"], false, 21],
    ["Regex101", "https://regex101.com/", "c_tools", ["regex"], true, 5],

    ["SF Symbols", "https://developer.apple.com/sf-symbols/", "c_design", ["macos", "icons"], false, 2],
    ["Refactoring UI — spacing", "https://www.refactoringui.com/", "c_design", ["design"], false, 18],
    ["Laws of UX", "https://lawsofux.com/", "c_design", ["design"], false, 25],
    ["Radix — Design tokens", "https://www.radix-ui.com/themes/docs/theme/tokens", "c_design", ["tokens"], false, 1.1],
    ["Font Variant — Optical sizing", "https://fontvariant.app/", "c_design", ["type"], false, 30],

    ["Vercel — Project logs", "https://vercel.com/team/logs", "c_infra", ["deploy"], false, 0.2],
    ["Cloudflare — Workers dashboard", "https://dash.cloudflare.com/", "c_infra", ["edge"], false, 8],
    ["Grafana — Sift API p95", "https://grafana.internal/d/api-p95", "c_infra", ["observability"], true, 1.5],
    ["Terraform registry — aws_vpc", "https://registry.terraform.io/modules/aws-terraform/vpc/aws", "c_infra", ["iac"], false, 16],
    ["Uptime — status page", "https://status.sift.dev/", "c_infra", ["oncall"], false, 0.05],

    ["The MacRumors guide to haptics", "https://developer.apple.com/documentation/uikit/creating_and_sharing_haptic_feedback", "c_read", ["ios"], false, 11],
    ["IndieWeb — offline-first patterns", "https://indieweb.org/offline", "c_read", ["pwa"], false, 27],
    ["Aral — Designing for focus", "https://aeon.co/essays/how-attention-economies-hijack-your-morning", "c_read", ["essay"], false, 33],
    ["Ruminations — On writing good code", "https://blog.codinghorror.com/craftsmanship/", "c_read", ["essay"], false, 41],

    ["CSS — hairline borders at 0.5px", "https://gist.github.com/hairline-borders", "c_snips", ["css"], false, 1.8],
    ["JS — debounce with trailing edge", "https://gist.github.com/debounce-trailing", "c_snips", ["js"], false, 13],
    ["Bash — find largest dirs", "https://gist.github.com/du-top-dirs", "c_snips", ["shell"], false, 20],
  ];

  const bookmarks: Bookmark[] = rows.map(([title, url, collection, tags, fav, daysAgo], index) => ({
    id: `b${String(index).padStart(2, "0")}`,
    title,
    url,
    collectionId: collection,
    tags,
    favorite: fav,
    addedAt: Math.round(now - daysAgo * DAY),
    order: index,
  }));

  return { bookmarks, collections };
}
