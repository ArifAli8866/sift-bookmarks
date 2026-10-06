import { NextResponse } from "next/server";
import { isDbConfigured, fetchLibraryFromDb, upsertBookmarkDb } from "../../../lib/db";
import type { Bookmark } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  try {
    const data = await fetchLibraryFromDb();
    return NextResponse.json(data.bookmarks);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  try {
    const bookmark = (await request.json()) as Bookmark;
    if (!bookmark.id || !bookmark.title || !bookmark.url) {
      return NextResponse.json({ error: "Missing required fields: id, title, url" }, { status: 400 });
    }

    await upsertBookmarkDb(bookmark);
    return NextResponse.json({ success: true, bookmark }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
