import { NextRequest, NextResponse } from "next/server";
import { releaseReservation } from "@/lib/reservation";
import { buildReservationResponse } from "@/lib/reservation-response";

export const dynamic = "force-dynamic";

/**
 * POST /api/reservations/:id/release
 *
 * Releases a pending reservation early (payment failed / user cancelled).
 * - 200: released successfully (or already released — idempotent)
 * - 404: reservation not found
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await releaseReservation(params.id);

    const response = await buildReservationResponse(params.id);
    if (!response) {
      return NextResponse.json({ error: "Reservation not found after update" }, { status: 500 });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof Error && error.message === "RESERVATION_NOT_FOUND") {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }

    console.error("[POST /api/reservations/[id]/release]", error);
    return NextResponse.json({ error: "Failed to release reservation" }, { status: 500 });
  }
}
