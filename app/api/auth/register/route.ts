import { NextResponse } from "next/server";
import { ensureTables, query, queryOne, type User } from "../../../../lib/db";
import { hashPassword, createSession, buildSessionCookie } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureTables();
    const body = await request.json();
    const email = (body.email || "").trim().toLowerCase();
    const password = body.password || "";
    const confirmPassword = body.confirmPassword || "";
    const name = (body.name || "").trim() || email.split("@")[0] || "Developer";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    if (!password || password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long." },
        { status: 400 }
      );
    }

    if (confirmPassword && password !== confirmPassword) {
      return NextResponse.json({ error: "Passwords do not match." }, { status: 400 });
    }

    // Check if user already exists
    const existing = await queryOne<{ id: string }>(
      `SELECT id FROM sift_users WHERE email = $1`,
      [email]
    );

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists. Please sign in instead." },
        { status: 409 }
      );
    }

    const userId = `u_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const passwordHash = await hashPassword(password);

    await query(
      `INSERT INTO sift_users (id, name, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      [userId, name, email, passwordHash]
    );

    // Create default user settings (onboarded = false for new signups)
    await query(
      `INSERT INTO sift_user_settings (id, user_id, theme, sidebar_collapsed, view_mode, sort_key, onboarded, updated_at)
       VALUES ($1, $2, 'system', false, 'grid', 'manual', false, NOW())
       ON CONFLICT (user_id) DO NOTHING`,
      [`s_${userId}`, userId]
    );

    const { token } = await createSession(userId);

    const user: User = {
      id: userId,
      name,
      email,
      image: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const res = NextResponse.json({
      success: true,
      user,
      onboarded: false,
    });

    res.headers.set("Set-Cookie", buildSessionCookie(token));
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Register error:", message);
    return NextResponse.json({ error: "Failed to create account. Please try again." }, { status: 500 });
  }
}
