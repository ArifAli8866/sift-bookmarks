import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../../lib/auth";
import { recordBookmarkOpened } from "../../../../../lib/db";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    await recordBookmarkOpened(user.id, id);

    return NextResponse.json({ success: true, id, openedAt: Date.now() });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
