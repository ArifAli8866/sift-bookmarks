import { NextResponse } from "next/server";
import { isDbConfigured, fetchLibraryFromDb, syncLibraryToDb } from "../../../lib/db";
import type { Bookmark, Collection, Prefs } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({
      connected: false,
      message: "DATABASE_URL is not configured. Running in local storage mode.",
    });
  }

  try {
    const data = await fetchLibraryFromDb();
    return NextResponse.json({
      connected: true,
      bookmarks: data.bookmarks,
      collections: data.collections,
      prefs: data.prefs,
      empty: data.bookmarks.length === 0 && data.collections.length === 0,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to fetch library from Neon database:", message);
    return NextResponse.json(
      { connected: false, error: message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isDbConfigured()) {
    return NextResponse.json({
      connected: false,
      message: "DATABASE_URL is not configured. Changes saved locally only.",
    });
  }

  try {
    const body = (await request.json()) as {
      bookmarks?: Bookmark[];
      collections?: Collection[];
      prefs?: Prefs;
    };

    const bookmarks = Array.isArray(body.bookmarks) ? body.bookmarks : [];
    const collections = Array.isArray(body.collections) ? body.collections : [];
    const prefs = body.prefs;

    await syncLibraryToDb({ bookmarks, collections, prefs });

    return NextResponse.json({
      connected: true,
      success: true,
      bookmarksCount: bookmarks.length,
      collectionsCount: collections.length,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Failed to sync library to Neon database:", message);
    return NextResponse.json(
      { connected: false, error: message },
      { status: 500 }
    );
  }
}
