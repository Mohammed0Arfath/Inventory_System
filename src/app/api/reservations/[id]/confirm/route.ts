import { NextRequest, NextResponse } from "next/server";
import { confirmReservation } from "@/lib/reservation";
import { buildReservationResponse } from "@/lib/reservation-response";

export const dynamic = "force-dynamic";

/**
 * POST /api/reservations/:id/confirm
 *
 * Confirms a pending reservation (simulates payment success).
 * - 200: confirmed successfully
 * - 404: reservation not found
 * - 409: reservation already released/cancelled
 * - 410: reservation has expired (Gone)
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await confirmReservation(params.id);

    const response = await buildReservationResponse(params.id);
    if (!response) {
      return NextResponse.json({ error: "Reservation not found after update" }, { status: 500 });
    }

    return NextResponse.json(response, { status: 200 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "RESERVATION_NOT_FOUND") {
        return NextResponse.json({ error: "Reservation not found", code: "NOT_FOUND" }, { status: 404 });
      }
      if (error.message === "EXPIRED") {
        return NextResponse.json(
          {
            error:
              "This reservation has expired. The held units have been released back to stock.",
            code: "RESERVATION_EXPIRED",
          },
          { status: 410 }
        );
      }
      if (error.message === "RELEASED") {
        return NextResponse.json(
          { error: "This reservation was already cancelled or released.", code: "ALREADY_RELEASED" },
          { status: 409 }
        );
      }
    }

    console.error("[POST /api/reservations/[id]/confirm]", error);
    return NextResponse.json({ error: "Failed to confirm reservation" }, { status: 500 });
  }
}
