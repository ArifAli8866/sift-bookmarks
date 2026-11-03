import type { Bookmark, Category } from "./store";

export interface SharedCategoryItem {
  name: string;
  icon: string;
  color: string;
}

export interface SharedBookmarkItem {
  id: string;
  title: string;
  url: string;
  description: string;
  categoryName: string | null;
  categoryColor?: string;
  categoryIcon?: string;
  tags: string[];
  favorite: boolean;
}

export interface SharedPackPayload {
  v: 1;
  senderName: string;
  packTitle: string;
  sharedAt: number;
  categories: SharedCategoryItem[];
  bookmarks: SharedBookmarkItem[];
}

/**
 * Compact wire format to keep share URLs as short as possible:
 * [version, senderName, packTitle, sharedAt, [[catName, catIcon, catColor], ...], [[title, url, desc, catIdx, tags, favBit], ...]]
 */
type WireCategory = [name: string, icon: string, color: string];
type WireBookmark = [
  title: string,
  url: string,
  description: string,
  catIndex: number, // -1 if uncategorized
  tags: string[],
  favBit: 0 | 1,
];
type WirePack = [
  version: 1,
  senderName: string,
  packTitle: string,
  sharedAt: number,
  categories: WireCategory[],
  bookmarks: WireBookmark[],
];

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const b64 =
    typeof btoa === "function"
      ? btoa(binary)
      : Buffer.from(bytes).toString("base64");
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64UrlToBytes(token: string): Uint8Array {
  const b64 = token.replace(/-/g, "+").replace(/_/g, "/");
  const pad = b64.length % 4 === 0 ? "" : "=".repeat(4 - (b64.length % 4));
  const padded = b64 + pad;
  if (typeof atob === "function") {
    const binary = atob(padded);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  return new Uint8Array(Buffer.from(padded, "base64"));
}

export function buildSharePayload(
  bookmarks: Bookmark[],
  categories: Category[],
  senderName: string,
  packTitle?: string
): SharedPackPayload {
  const catMap = new Map<string, Category>();
  for (const c of categories) {
    catMap.set(c.id, c);
  }

  const usedCategories = new Map<string, SharedCategoryItem>();
  const sharedBookmarks: SharedBookmarkItem[] = bookmarks.map((b, idx) => {
    const catId = b.categoryId || b.collectionId || null;
    const cat = catId ? catMap.get(catId) : undefined;
    if (cat && !usedCategories.has(cat.name.toLowerCase())) {
      usedCategories.set(cat.name.toLowerCase(), {
        name: cat.name,
        icon: cat.icon || "folder",
        color: cat.color || "#2563eb",
      });
    }
    return {
      id: b.id || `shared-${idx}`,
      title: b.title.trim() || b.url,
      url: b.url.trim(),
      description: (b.description || "").trim(),
      categoryName: cat ? cat.name : null,
      categoryColor: cat?.color,
      categoryIcon: cat?.icon,
      tags: Array.isArray(b.tags) ? b.tags.slice(0, 8) : [],
      favorite: Boolean(b.favorite || b.isFavorite),
    };
  });

  const cleanSender = senderName.trim() || "A developer";
  return {
    v: 1,
    senderName: cleanSender,
    packTitle: (packTitle || `${cleanSender}’s Bookmarks`).trim(),
    sharedAt: Date.now(),
    categories: Array.from(usedCategories.values()),
    bookmarks: sharedBookmarks,
  };
}

export function encodeSharePayload(payload: SharedPackPayload): string {
  const catIndexByName = new Map<string, number>();
  const wireCategories: WireCategory[] = payload.categories.map((c, idx) => {
    catIndexByName.set(c.name.toLowerCase(), idx);
    return [c.name, c.icon || "folder", c.color || "#2563eb"];
  });

  const wireBookmarks: WireBookmark[] = payload.bookmarks.map((b) => {
    const cIdx = b.categoryName
      ? (catIndexByName.get(b.categoryName.toLowerCase()) ?? -1)
      : -1;
    return [
      b.title,
      b.url,
      b.description || "",
      cIdx,
      b.tags || [],
      b.favorite ? 1 : 0,
    ];
  });

  const wire: WirePack = [
    1,
    payload.senderName,
    payload.packTitle,
    payload.sharedAt,
    wireCategories,
    wireBookmarks,
  ];

  const json = JSON.stringify(wire);
  const bytes = new TextEncoder().encode(json);
  return bytesToBase64Url(bytes);
}

export function decodeSharePayload(token: string): SharedPackPayload | null {
  try {
    const clean = token.trim();
    if (!clean) return null;
    const bytes = base64UrlToBytes(clean);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as unknown;

    if (!Array.isArray(parsed) || parsed[0] !== 1) return null;
    const [, rawSender, rawTitle, rawSharedAt, rawCats, rawBookmarks] = parsed as WirePack;

    const categories: SharedCategoryItem[] = Array.isArray(rawCats)
      ? rawCats
          .filter((c): c is WireCategory => Array.isArray(c) && typeof c[0] === "string")
          .map(([name, icon, color]) => ({
            name: String(name).trim() || "Collection",
            icon: typeof icon === "string" && icon ? icon : "folder",
            color: typeof color === "string" && color ? color : "#2563eb",
          }))
      : [];

    const bookmarks: SharedBookmarkItem[] = Array.isArray(rawBookmarks)
      ? rawBookmarks
          .filter(
            (b): b is WireBookmark =>
              Array.isArray(b) && typeof b[0] === "string" && typeof b[1] === "string"
          )
          .map(([title, url, description, catIdx, tags, favBit], idx) => {
            const cat =
              typeof catIdx === "number" && catIdx >= 0 && catIdx < categories.length
                ? categories[catIdx]
                : undefined;
            return {
              id: `shared-bm-${idx}-${Math.random().toString(36).slice(2, 7)}`,
              title: String(title).trim() || String(url).trim(),
              url: String(url).trim(),
              description: typeof description === "string" ? description : "",
              categoryName: cat ? cat.name : null,
              categoryColor: cat?.color,
              categoryIcon: cat?.icon,
              tags: Array.isArray(tags)
                ? tags.filter((t): t is string => typeof t === "string" && Boolean(t.trim()))
                : [],
              favorite: favBit === 1,
            };
          })
      : [];

    if (bookmarks.length === 0) return null;

    return {
      v: 1,
      senderName: typeof rawSender === "string" && rawSender.trim() ? rawSender.trim() : "A friend",
      packTitle:
        typeof rawTitle === "string" && rawTitle.trim()
          ? rawTitle.trim()
          : "Shared Bookmarks",
      sharedAt: typeof rawSharedAt === "number" ? rawSharedAt : Date.now(),
      categories,
      bookmarks,
    };
  } catch {
    return null;
  }
}

export function buildShareUrl(payload: SharedPackPayload, origin?: string): string {
  const token = encodeSharePayload(payload);
  const base =
    origin ||
    (typeof window !== "undefined" ? window.location.origin : "https://sift-bookmarks.vercel.app");
  return `${base}/?share=${encodeURIComponent(token)}`;
}

export function extractShareFromCurrentUrl(): SharedPackPayload | null {
  if (typeof window === "undefined") return null;
  try {
    const url = new URL(window.location.href);
    const qToken = url.searchParams.get("share");
    if (qToken) {
      return decodeSharePayload(qToken);
    }
    if (window.location.hash.startsWith("#share=")) {
      const hToken = decodeURIComponent(window.location.hash.slice("#share=".length));
      return decodeSharePayload(hToken);
    }
    return null;
  } catch {
    return null;
  }
}

export function clearShareFromCurrentUrl(): void {
  if (typeof window === "undefined") return;
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete("share");
    const nextSearch = url.searchParams.toString();
    const nextHash = window.location.hash.startsWith("#share=") ? "" : window.location.hash;
    const cleanUrl = `${url.pathname}${nextSearch ? `?${nextSearch}` : ""}${nextHash}`;
    window.history.replaceState({}, "", cleanUrl);
  } catch {}
}
