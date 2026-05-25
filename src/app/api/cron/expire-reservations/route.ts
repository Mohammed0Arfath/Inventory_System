import { NextRequest, NextResponse } from "next/server";
import { expireStaleReservations } from "@/lib/reservation";

export const dynamic = "force-dynamic";

/**
 * POST /api/cron/expire-reservations
 *
 * Called by Vercel Cron every minute (see vercel.json).
 * Finds all PENDING reservations past their expiresAt and releases them,
 * returning stock to available.
 *
 * Protected by a simple bearer token to prevent unauthorized calls.
 */
export async function POST(request: NextRequest) {
  // Validate cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const released = await expireStaleReservations();
    console.log(`[CRON] Expired and released ${released} stale reservations`);

    return NextResponse.json({
      ok: true,
      released,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("[CRON /api/cron/expire-reservations]", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

// Vercel Cron calls via GET on some plans
export async function GET(request: NextRequest) {
  return POST(request);
}
