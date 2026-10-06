import { NextResponse } from "next/server";
import { ensureTables, queryOne, type User } from "../../../../lib/db";
import { verifyPassword, createSession, buildSessionCookie } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureTables();
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required." },
        { status: 400 }
      );
    }

    interface UserRow {
      id: string;
      name: string;
      email: string;
      password_hash: string | null;
      image: string | null;
      created_at: string;
      updated_at: string;
    }

    const row = await queryOne<UserRow>(
      `SELECT id, name, email, password_hash, image, created_at, updated_at
       FROM sift_users
       WHERE email = $1`,
      [email]
    );

    if (!row || !row.password_hash) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, row.password_hash);
    if (!valid) {
      return NextResponse.json(
        { error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const { token } = await createSession(row.id);

    // Get onboarded state
    const settings = await queryOne<{ onboarded: boolean }>(
      `SELECT onboarded FROM sift_user_settings WHERE user_id = $1`,
      [row.id]
    );

    const user: User = {
      id: row.id,
      name: row.name,
      email: row.email,
      image: row.image,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };

    const res = NextResponse.json({
      success: true,
      user,
      onboarded: settings?.onboarded ?? true,
    });

    res.headers.set("Set-Cookie", buildSessionCookie(token));
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Login error:", message);
    return NextResponse.json(
      { error: "Unable to sign in. Please try again." },
      { status: 500 }
    );
  }
}
