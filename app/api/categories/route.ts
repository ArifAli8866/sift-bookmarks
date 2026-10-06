import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import { fetchUserLibrary, upsertUserCategory } from "../../../lib/db";
import type { Category } from "../../../lib/store";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await fetchUserLibrary(user.id);
    return NextResponse.json(data.categories);
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

    const body = (await request.json()) as Partial<Category>;
    const name = (body.name || "").trim();
    if (!name) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const id = body.id || `c_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const icon = body.icon || "folder";
    const color = body.color || "#0a7aff";
    const position = body.position ?? 0;

    await upsertUserCategory(user.id, {
      id,
      name,
      icon,
      color,
      position,
    });

    const category: Category = {
      id,
      userId: user.id,
      name,
      icon,
      color,
      position,
    };

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
