import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import {
  ensureTables,
  upsertUserCategory,
  upsertUserBookmark,
  updateUserPreferences,
  query,
} from "../../../../lib/db";
import { DEFAULT_ONBOARDING_CATEGORIES } from "../../../../lib/suggestions";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureTables();
    const body = await request.json();
    const skipped = Boolean(body.skipped);

    if (skipped) {
      await updateUserPreferences(user.id, { onboarded: true });
      return NextResponse.json({ success: true, skipped: true });
    }

    const selectedCategoryNames: string[] = Array.isArray(body.categories) ? body.categories : [];
    const selectedBookmarkItems: Array<{
      title: string;
      url: string;
      description?: string;
      category?: string;
      tags?: string[];
      isFavorite?: boolean;
      favorite?: boolean;
    }> = Array.isArray(body.bookmarks) ? body.bookmarks : [];

    const categoryNameToId = new Map<string, string>();

    // 1. Create selected categories
    for (let i = 0; i < selectedCategoryNames.length; i++) {
      const catName = selectedCategoryNames[i]!;
      const defaultInfo = DEFAULT_ONBOARDING_CATEGORIES.find(
        (c) => c.name.toLowerCase() === catName.toLowerCase()
      );
      const catId = `cat_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${i}`;
      categoryNameToId.set(catName.toLowerCase(), catId);

      await upsertUserCategory(user.id, {
        id: catId,
        name: catName,
        icon: defaultInfo?.icon || "folder",
        color: defaultInfo?.color || "#0a7aff",
        position: i * 10,
      });
    }

    // 2. Create selected bookmarks
    for (let i = 0; i < selectedBookmarkItems.length; i++) {
      const b = selectedBookmarkItems[i]!;
      const bId = `bm_${Date.now()}_${Math.random().toString(36).slice(2, 6)}_${i}`;
      const catId = b.category ? categoryNameToId.get(b.category.toLowerCase()) || null : null;

      await upsertUserBookmark(user.id, {
        id: bId,
        title: b.title,
        url: b.url,
        description: b.description || "",
        categoryId: catId,
        tags: b.tags || [],
        favorite: Boolean(b.isFavorite ?? b.favorite ?? false),
        position: i * 10,
      });
    }

    // Mark as onboarded
    await updateUserPreferences(user.id, { onboarded: true });

    return NextResponse.json({
      success: true,
      categoriesCount: selectedCategoryNames.length,
      bookmarksCount: selectedBookmarkItems.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Onboarding error:", message);
    return NextResponse.json({ error: "Failed to complete onboarding." }, { status: 500 });
  }
}
