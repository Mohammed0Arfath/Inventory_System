import { NextRequest, NextResponse } from "next/server";
import { buildReservationResponse } from "@/lib/reservation-response";

export const dynamic = "force-dynamic";

// GET /api/reservations/[id] — used by the checkout page to load reservation state
export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const data = await buildReservationResponse(params.id);
    if (!data) {
      return NextResponse.json({ error: "Reservation not found" }, { status: 404 });
    }
    return NextResponse.json(data);
  } catch (error) {
    console.error("[GET /api/reservations/[id]]", error);
    return NextResponse.json({ error: "Failed to fetch reservation" }, { status: 500 });
  }
}
