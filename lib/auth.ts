import bcrypt from "bcryptjs";
import crypto from "node:crypto";
import { query, queryOne, ensureTables, type User } from "./db";

export const SESSION_COOKIE_NAME = "sift_session";
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60; // 30 days

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  await ensureTables();
  const token = generateToken();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000);

  await query(
    `INSERT INTO sift_sessions (id, user_id, expires_at, created_at)
     VALUES ($1, $2, $3, NOW())`,
    [token, userId, expiresAt.toISOString()]
  );

  return { token, expiresAt };
}

export async function deleteSession(token: string): Promise<void> {
  await ensureTables();
  await query(`DELETE FROM sift_sessions WHERE id = $1`, [token]);
}

export async function getSessionUser(token: string): Promise<User | null> {
  if (!token) return null;
  await ensureTables();

  interface SessionRow {
    id: string;
    name: string;
    email: string;
    image: string | null;
    created_at: string;
    updated_at: string;
    expires_at: string;
  }

  const row = await queryOne<SessionRow>(
    `SELECT u.id, u.name, u.email, u.image, u.created_at, u.updated_at, s.expires_at
     FROM sift_sessions s
     JOIN sift_users u ON u.id = s.user_id
     WHERE s.id = $1 AND s.expires_at > NOW()`,
    [token]
  );

  if (!row) return null;

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    image: row.image,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Extracts session token from Cookie header or Authorization header,
 * and validates against the database to determine the currently authenticated user.
 */
export async function getAuthUser(request: Request): Promise<User | null> {
  const cookieHeader = request.headers.get("cookie") || "";
  let token: string | null = null;

  const cookies = cookieHeader.split(";").map((c) => c.trim());
  for (const c of cookies) {
    if (c.startsWith(`${SESSION_COOKIE_NAME}=`)) {
      token = decodeURIComponent(c.substring(SESSION_COOKIE_NAME.length + 1));
      break;
    }
  }

  if (!token) {
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.substring(7).trim();
    }
  }

  if (!token) return null;
  return getSessionUser(token);
}

export function buildSessionCookie(token: string, maxAge: number = SESSION_MAX_AGE_SECONDS): string {
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=${encodeURIComponent(
    token
  )}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${isProd ? "; Secure" : ""}`;
}

export function buildClearSessionCookie(): string {
  const isProd = process.env.NODE_ENV === "production";
  return `${SESSION_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${isProd ? "; Secure" : ""}`;
}
