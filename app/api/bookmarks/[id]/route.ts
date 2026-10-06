import { NextResponse } from "next/server";
import { isDbConfigured, deleteBookmarkDb, upsertBookmarkDb, fetchLibraryFromDb } from "../../../../lib/db";
import type { Bookmark } from "../../../../lib/store";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
    await deleteBookmarkDb(id);
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
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  try {
    const { id } = await params;
    const patch = (await request.json()) as Partial<Bookmark>;
    const library = await fetchLibraryFromDb();
    const existing = library.bookmarks.find((b) => b.id === id);

    if (!existing) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    const updated: Bookmark = { ...existing, ...patch, id };
    await upsertBookmarkDb(updated);

    return NextResponse.json({ success: true, bookmark: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
