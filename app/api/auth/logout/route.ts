import { NextResponse } from "next/server";
import { SESSION_COOKIE_NAME, deleteSession, buildClearSessionCookie } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const cookieHeader = request.headers.get("cookie") || "";
    const cookies = cookieHeader.split(";").map((c) => c.trim());
    let token: string | null = null;
    for (const c of cookies) {
      if (c.startsWith(`${SESSION_COOKIE_NAME}=`)) {
        token = decodeURIComponent(c.substring(SESSION_COOKIE_NAME.length + 1));
        break;
      }
    }

    if (token) {
      await deleteSession(token);
    }

    const res = NextResponse.json({ success: true });
    res.headers.set("Set-Cookie", buildClearSessionCookie());
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Logout error:", message);
    const res = NextResponse.json({ success: true });
    res.headers.set("Set-Cookie", buildClearSessionCookie());
    return res;
  }
}
