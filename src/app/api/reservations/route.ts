import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { redis, IDEMPOTENCY_TTL_SECONDS } from "@/lib/redis";
import { createReservation } from "@/lib/reservation";
import { CreateReservationSchema } from "@/lib/schemas";
import type { ReservationResponse } from "@/lib/schemas";

export const dynamic = "force-dynamic";

/**
 * POST /api/reservations
 *
 * Creates a new reservation atomically.
 * - Returns 409 if there is not enough available stock.
 * - Supports optional Idempotency-Key header for safe retries.
 *   If the same key is sent again within 24 hours, the original response
 *   is returned without repeating the side effect.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const parsed = CreateReservationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request body", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { stockId, quantity } = parsed.data;
    const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

    // ── Idempotency check (bonus feature) ───────────────────────────────────
    if (idempotencyKey && redis) {
      const cacheKey = `idempotency:reservation:${idempotencyKey}`;
      const cached = await redis.get<ReservationResponse>(cacheKey);
      if (cached) {
        // Return the original response — no side effects repeated
        return NextResponse.json(cached, {
          status: 200,
          headers: { "X-Idempotent-Replayed": "true" },
        });
      }
    }

    // ── Create reservation (atomic) ──────────────────────────────────────────
    const reservation = await createReservation(stockId, quantity, idempotencyKey);

    // Fetch full data for the response
    const full = await prisma.reservation.findUnique({
      where: { id: reservation.id },
      include: {
        stock: {
          include: {
            product: true,
            warehouse: true,
          },
        },
      },
    });

    if (!full) {
      return NextResponse.json({ error: "Reservation created but not found" }, { status: 500 });
    }

    const responseBody: ReservationResponse = {
      id: full.id,
      stockId: full.stockId,
      quantity: full.quantity,
      status: full.status as "PENDING",
      expiresAt: full.expiresAt.toISOString(),
      confirmedAt: null,
      releasedAt: null,
      createdAt: full.createdAt.toISOString(),
      product: {
        id: full.stock.product.id,
        name: full.stock.product.name,
        price: Number(full.stock.product.price),
        sku: full.stock.product.sku,
      },
      warehouse: {
        id: full.stock.warehouse.id,
        name: full.stock.warehouse.name,
        location: full.stock.warehouse.location,
      },
    };

    // ── Cache for idempotency ────────────────────────────────────────────────
    if (idempotencyKey && redis) {
      const cacheKey = `idempotency:reservation:${idempotencyKey}`;
      await redis.setex(cacheKey, IDEMPOTENCY_TTL_SECONDS, responseBody);
    }

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "INSUFFICIENT_STOCK") {
        return NextResponse.json(
          {
            error: "Not enough stock available. Another customer may have just reserved the last units.",
            code: "INSUFFICIENT_STOCK",
          },
          { status: 409 }
        );
      }
      if (error.message === "STOCK_NOT_FOUND") {
        return NextResponse.json(
          { error: "Stock record not found", code: "STOCK_NOT_FOUND" },
          { status: 404 }
        );
      }
    }

    console.error("[POST /api/reservations]", error);
    return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
  }
}
