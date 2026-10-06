import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import { deleteUserBookmark, query, queryOne, ensureTables } from "../../../../lib/db";
import type { Bookmark } from "../../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const bookmark = await queryOne<{
      id: string;
      user_id: string;
      category_id: string | null;
      title: string;
      url: string;
      description: string;
      icon_url: string | null;
      tags: any;
      is_favorite: boolean;
      position: number;
      last_opened_at: string | null;
      created_at: string;
    }>(
      `SELECT id, user_id, category_id, title, url, description, icon_url, tags, is_favorite, position, last_opened_at, created_at
       FROM sift_bookmarks WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (!bookmark) {
      return NextResponse.json({ error: "Bookmark not found or access denied" }, { status: 404 });
    }

    return NextResponse.json({
      bookmark: {
        id: bookmark.id,
        userId: bookmark.user_id,
        title: bookmark.title,
        url: bookmark.url,
        description: bookmark.description || "",
        categoryId: bookmark.category_id,
        collectionId: bookmark.category_id,
        iconUrl: bookmark.icon_url || undefined,
        tags: Array.isArray(bookmark.tags) ? bookmark.tags : [],
        favorite: Boolean(bookmark.is_favorite),
        isFavorite: Boolean(bookmark.is_favorite),
        addedAt: new Date(bookmark.created_at).getTime(),
        position: Number(bookmark.position ?? 0),
        order: Number(bookmark.position ?? 0),
        lastOpenedAt: bookmark.last_opened_at ? new Date(bookmark.last_opened_at).getTime() : null,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const deleted = await deleteUserBookmark(user.id, id);
    if (!deleted) {
      return NextResponse.json({ error: "Bookmark not found or not owned by user" }, { status: 404 });
    }

    return NextResponse.json({ success: true, id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await ensureTables();
    const { id } = await params;
    const patch = (await request.json()) as Partial<Bookmark>;

    // Check ownership
    const existing = await queryOne<{
      id: string;
      title: string;
      url: string;
      description: string;
      category_id: string | null;
      tags: any;
      is_favorite: boolean;
      position: number;
    }>(
      `SELECT id, title, url, description, category_id, tags, is_favorite, position
       FROM sift_bookmarks WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (!existing) {
      return NextResponse.json({ error: "Bookmark not found or access denied" }, { status: 404 });
    }

    const title = patch.title !== undefined ? patch.title : existing.title;
    const url = patch.url !== undefined ? patch.url : existing.url;
    const description = patch.description !== undefined ? patch.description : existing.description;
    const categoryId =
      patch.categoryId !== undefined
        ? patch.categoryId
        : patch.collectionId !== undefined
        ? patch.collectionId
        : existing.category_id;
    const tags = patch.tags !== undefined ? JSON.stringify(patch.tags) : JSON.stringify(existing.tags || []);
    const isFavorite =
      patch.favorite !== undefined
        ? patch.favorite
        : patch.isFavorite !== undefined
        ? patch.isFavorite
        : existing.is_favorite;
    const position =
      patch.position !== undefined
        ? patch.position
        : patch.order !== undefined
        ? patch.order
        : existing.position;

    await query(
      `UPDATE sift_bookmarks
       SET title = $1, url = $2, description = $3, category_id = $4, tags = $5::jsonb, is_favorite = $6, position = $7, updated_at = NOW()
       WHERE id = $8 AND user_id = $9`,
      [title, url, description, categoryId, tags, isFavorite, position, id, user.id]
    );

    return NextResponse.json({
      success: true,
      bookmark: {
        id,
        userId: user.id,
        title,
        url,
        description,
        categoryId,
        collectionId: categoryId,
        tags: patch.tags !== undefined ? patch.tags : existing.tags,
        favorite: isFavorite,
        isFavorite,
        order: position,
        position,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
