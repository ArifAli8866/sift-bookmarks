import { NextResponse } from "next/server";
import { isDbConfigured, fetchLibraryFromDb, upsertCollectionDb } from "../../../lib/db";
import type { Collection } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL is not configured" }, { status: 503 });
  }

  try {
    const data = await fetchLibraryFromDb();
    return NextResponse.json(data.collections);
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
    const collection = (await request.json()) as Collection;
    if (!collection.id || !collection.name) {
      return NextResponse.json({ error: "Missing required fields: id, name" }, { status: 400 });
    }

    await upsertCollectionDb(collection);
    return NextResponse.json({ success: true, collection }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
