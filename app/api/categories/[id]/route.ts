import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import { deleteUserCategory, query, queryOne, ensureTables } from "../../../../lib/db";
import type { Category } from "../../../../lib/store";

export const dynamic = "force-dynamic";

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
    // As per requirement: deleteUserCategory moves bookmarks to uncategorized and deletes the category
    await deleteUserCategory(user.id, id);

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
    const patch = (await request.json()) as Partial<Category>;

    const existing = await queryOne<{
      id: string;
      name: string;
      icon: string;
      color: string;
      position: number;
    }>(
      `SELECT id, name, icon, color, position
       FROM sift_categories WHERE id = $1 AND user_id = $2`,
      [id, user.id]
    );

    if (!existing) {
      return NextResponse.json({ error: "Category not found or access denied" }, { status: 404 });
    }

    const name = patch.name !== undefined ? patch.name.trim() || existing.name : existing.name;
    const icon = patch.icon !== undefined ? patch.icon : existing.icon;
    const color = patch.color !== undefined ? patch.color : existing.color;
    const position = patch.position !== undefined ? patch.position : existing.position;

    await query(
      `UPDATE sift_categories
       SET name = $1, icon = $2, color = $3, position = $4, updated_at = NOW()
       WHERE id = $5 AND user_id = $6`,
      [name, icon, color, position, id, user.id]
    );

    return NextResponse.json({
      success: true,
      category: {
        id,
        userId: user.id,
        name,
        icon,
        color,
        position,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
