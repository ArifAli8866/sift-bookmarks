import { NextResponse } from "next/server";
import { ensureTables, query, queryOne, type User } from "../../../../lib/db";
import { createSession, buildSessionCookie } from "../../../../lib/auth";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    await ensureTables();
    const body = await request.json().catch(() => ({}));
    const email = (body.email || "developer@google.com").trim().toLowerCase();
    const name = (body.name || "Alex Chen").trim();
    const image =
      body.image ||
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80";

    // Find or create Google user
    let user = await queryOne<User>(
      `SELECT id, name, email, image, created_at as "createdAt", updated_at as "updatedAt"
       FROM sift_users
       WHERE email = $1`,
      [email]
    );

    let isNewUser = false;
    if (!user) {
      isNewUser = true;
      const userId = `u_goog_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      await query(
        `INSERT INTO sift_users (id, name, email, image, created_at, updated_at)
         VALUES ($1, $2, $3, $4, NOW(), NOW())`,
        [userId, name, email, image]
      );

      await query(
        `INSERT INTO sift_user_settings (id, user_id, theme, sidebar_collapsed, view_mode, sort_key, onboarded, updated_at)
         VALUES ($1, $2, 'system', false, 'grid', 'manual', false, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [`s_${userId}`, userId]
      );

      user = {
        id: userId,
        name,
        email,
        image,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    } else if (image && !user.image) {
      await query(`UPDATE sift_users SET image = $1, updated_at = NOW() WHERE id = $2`, [
        image,
        user.id,
      ]);
      user.image = image;
    }

    const { token } = await createSession(user.id);

    const settings = await queryOne<{ onboarded: boolean }>(
      `SELECT onboarded FROM sift_user_settings WHERE user_id = $1`,
      [user.id]
    );

    const res = NextResponse.json({
      success: true,
      user,
      onboarded: settings?.onboarded ?? !isNewUser,
    });

    res.headers.set("Set-Cookie", buildSessionCookie(token));
    return res;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("Google auth error:", message);
    return NextResponse.json({ error: message || "Failed to sign in with Google." }, { status: 500 });
  }
}
