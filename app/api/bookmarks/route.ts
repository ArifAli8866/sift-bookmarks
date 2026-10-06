import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import { fetchUserLibrary, upsertUserBookmark } from "../../../lib/db";
import type { Bookmark } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await fetchUserLibrary(user.id);
    return NextResponse.json(data.bookmarks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const bookmark = (await request.json()) as Partial<Bookmark>;
    if (!bookmark.title || !bookmark.url) {
      return NextResponse.json(
        { error: "Missing required fields: title, url" },
        { status: 400 }
      );
    }

    const bookmarkId = bookmark.id || `b_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const categoryId = bookmark.categoryId || bookmark.collectionId || null;

    await upsertUserBookmark(user.id, {
      id: bookmarkId,
      title: bookmark.title,
      url: bookmark.url,
      description: bookmark.description || "",
      categoryId,
      tags: bookmark.tags || [],
      favorite: Boolean(bookmark.favorite ?? bookmark.isFavorite),
      position: bookmark.position ?? bookmark.order ?? 0,
    });

    return NextResponse.json(
      {
        success: true,
        bookmark: {
          id: bookmarkId,
          userId: user.id,
          title: bookmark.title,
          url: bookmark.url,
          description: bookmark.description || "",
          categoryId,
          collectionId: categoryId,
          tags: bookmark.tags || [],
          favorite: Boolean(bookmark.favorite ?? bookmark.isFavorite),
          isFavorite: Boolean(bookmark.favorite ?? bookmark.isFavorite),
          addedAt: Date.now(),
          order: bookmark.position ?? bookmark.order ?? 0,
          position: bookmark.position ?? bookmark.order ?? 0,
        },
      },
      { status: 201 }
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
