import { NextResponse } from "next/server";
import { isDbConfigured, testDbConnection } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const configured = isDbConfigured();
  if (!configured) {
    return NextResponse.json({
      status: "ok",
      database: {
        configured: false,
        connected: false,
        provider: "Neon PostgreSQL",
        message: "DATABASE_URL is not configured. Sift is running with local storage fallback.",
      },
    });
  }

  const test = await testDbConnection();
  return NextResponse.json({
    status: test.ok ? "ok" : "degraded",
    database: {
      configured: true,
      connected: test.ok,
      provider: "Neon PostgreSQL",
      error: test.ok ? undefined : test.message,
    },
  });
}
