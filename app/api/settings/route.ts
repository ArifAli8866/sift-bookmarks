import { NextResponse } from "next/server";
import { getAuthUser } from "../../../lib/auth";
import { updateUserPreferences, query, queryOne, type UserSettings } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const settings = await queryOne<UserSettings>(
      `SELECT theme, sidebar_collapsed as "sidebarCollapsed", view_mode as "viewMode", sort_key as "sortKey", onboarded
       FROM sift_user_settings WHERE user_id = $1`,
      [user.id]
    );

    return NextResponse.json({ success: true, settings, user });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    await updateUserPreferences(user.id, {
      theme: body.theme,
      sidebarCollapsed: body.sidebarCollapsed,
      viewMode: body.viewMode,
      sortKey: body.sortKey,
      onboarded: body.onboarded,
    });

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const name = (body.name || user.name).trim();
    const image = body.image !== undefined ? body.image : user.image;

    await query(
      `UPDATE sift_users SET name = $1, image = $2, updated_at = NOW() WHERE id = $3`,
      [name, image, user.id]
    );

    return NextResponse.json({ success: true, user: { ...user, name, image } });
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

    const body = await request.json();
    let updatedUser = user;

    if (body.name !== undefined || body.image !== undefined) {
      const name = (body.name || user.name).trim();
      const image = body.image !== undefined ? body.image : user.image;
      await query(
        `UPDATE sift_users SET name = $1, image = $2, updated_at = NOW() WHERE id = $3`,
        [name, image, user.id]
      );
      updatedUser = { ...user, name, image };
    }

    if (
      body.theme !== undefined ||
      body.sidebarCollapsed !== undefined ||
      body.viewMode !== undefined ||
      body.sortKey !== undefined ||
      body.onboarded !== undefined
    ) {
      await updateUserPreferences(user.id, {
        theme: body.theme,
        sidebarCollapsed: body.sidebarCollapsed,
        viewMode: body.viewMode,
        sortKey: body.sortKey,
        onboarded: body.onboarded,
      });
    }

    const settings = await queryOne<UserSettings>(
      `SELECT theme, sidebar_collapsed as "sidebarCollapsed", view_mode as "viewMode", sort_key as "sortKey", onboarded
       FROM sift_user_settings WHERE user_id = $1`,
      [user.id]
    );

    return NextResponse.json({
      success: true,
      settings: settings || {
        theme: body.theme || "system",
        sidebarCollapsed: false,
        viewMode: "grid",
        sortKey: "manual",
        onboarded: true,
      },
      user: updatedUser,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
