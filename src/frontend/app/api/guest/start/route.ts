import { NextResponse } from "next/server";

/**
 * POST /api/guest/start
 * Guest sessions have been removed; users must sign in before using gated APIs.
 */
export async function POST() {
  return NextResponse.json(
    { error: "Guest sessions are no longer supported. Please sign in." },
    { status: 410 },
  );
}
