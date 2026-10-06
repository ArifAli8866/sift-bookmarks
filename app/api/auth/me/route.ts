import { NextResponse } from "next/server";
import { getAuthUser } from "../../../../lib/auth";
import { queryOne, type UserSettings } from "../../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request);
    if (!user) {
      return NextResponse.json({ authenticated: false }, { status: 401 });
    }

    const settings = await queryOne<UserSettings>(
      `SELECT theme, sidebar_collapsed as "sidebarCollapsed", view_mode as "viewMode", sort_key as "sortKey", onboarded
       FROM sift_user_settings WHERE user_id = $1`,
      [user.id]
    );

    return NextResponse.json({
      authenticated: true,
      user,
      settings: settings || {
        theme: "system",
        sidebarCollapsed: false,
        viewMode: "grid",
        sortKey: "manual",
        onboarded: true,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Auth me error:", message);
    return NextResponse.json({ authenticated: false, error: message }, { status: 500 });
  }
}
