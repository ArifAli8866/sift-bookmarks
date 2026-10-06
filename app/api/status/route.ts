import { NextResponse } from "next/server";
import { testDbConnection, isNeonConfigured } from "../../../lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const test = await testDbConnection();
  return NextResponse.json({
    status: test.ok ? "ok" : "degraded",
    database: {
      connected: test.ok,
      provider: isNeonConfigured() ? "Neon PostgreSQL" : "Embedded PostgreSQL",
      mode: isNeonConfigured() ? "cloud" : "local-postgres",
      message: test.message,
    },
  });
}
