import { NextResponse } from "next/server";
import { isDbConfigured, deleteCollectionDb, upsertCollectionDb, fetchLibraryFromDb } from "../../../../lib/db";
import type { Collection } from "../../../../lib/store";

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
    await deleteCollectionDb(id);
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
    const patch = (await request.json()) as Partial<Collection>;
    const library = await fetchLibraryFromDb();
    const existing = library.collections.find((c) => c.id === id);

    if (!existing) {
      return NextResponse.json({ error: "Collection not found" }, { status: 404 });
    }

    const updated: Collection = { ...existing, ...patch, id };
    await upsertCollectionDb(updated);

    return NextResponse.json({ success: true, collection: updated });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
