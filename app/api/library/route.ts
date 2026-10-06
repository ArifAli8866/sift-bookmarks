import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import {
  fetchUserLibrary,
  upsertUserBookmark,
  upsertUserCategory,
  updateUserPreferences,
  isNeonConfigured,
} from "../../../lib/db";
import type { Bookmark, Category, Prefs } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const data = await fetchUserLibrary(user.id);

    return NextResponse.json({
      connected: true,
      dbType: isNeonConfigured() ? "neon" : "embedded",
      user,
      bookmarks: data.bookmarks,
      categories: data.categories,
      collections: data.categories, // alias for backwards compatibility
      settings: data.settings,
      prefs: {
        viewMode: data.settings.viewMode,
        sortKey: data.settings.sortKey,
        theme: data.settings.theme,
        sidebarCollapsed: data.settings.sidebarCollapsed,
      },
      empty: data.bookmarks.length === 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to fetch user library:", message);
    return NextResponse.json({ error: "Failed to load library." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json(
        { authenticated: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = (await request.json()) as {
      bookmarks?: Bookmark[];
      categories?: Category[];
      collections?: Category[];
      prefs?: Prefs;
    };

    const categories = Array.isArray(body.categories)
      ? body.categories
      : Array.isArray(body.collections)
      ? body.collections
      : [];

    const bookmarks = Array.isArray(body.bookmarks) ? body.bookmarks : [];

    // Sync categories for user
    for (const cat of categories) {
      await upsertUserCategory(user.id, {
        id: cat.id,
        name: cat.name,
        icon: cat.icon,
        color: cat.color,
        position: cat.position,
      });
    }

    // Sync bookmarks for user
    for (const b of bookmarks) {
      await upsertUserBookmark(user.id, {
        id: b.id,
        title: b.title,
        url: b.url,
        description: b.description,
        categoryId: b.categoryId || b.collectionId || null,
        tags: b.tags,
        favorite: b.favorite ?? b.isFavorite,
        position: b.position ?? b.order,
      });
    }

    // Update preferences if provided
    if (body.prefs) {
      await updateUserPreferences(user.id, {
        theme: body.prefs.theme,
        sidebarCollapsed: body.prefs.sidebarCollapsed,
        viewMode: body.prefs.viewMode,
        sortKey: body.prefs.sortKey,
      });
    }

    return NextResponse.json({
      success: true,
      bookmarksCount: bookmarks.length,
      categoriesCount: categories.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to sync user library:", message);
    return NextResponse.json({ error: "Failed to sync library." }, { status: 500 });
  }
}
