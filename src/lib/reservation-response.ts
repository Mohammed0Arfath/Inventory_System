import { prisma } from "@/lib/db";
import type { ReservationResponse } from "@/lib/schemas";

/**
 * Fetches a reservation by ID and shapes it into the API response format.
 * Shared by the GET, confirm, and release route handlers.
 */
export async function buildReservationResponse(
  id: string
): Promise<ReservationResponse | null> {
  const r = await prisma.reservation.findUnique({
    where: { id },
    include: {
      stock: {
        include: {
          product: true,
          warehouse: true,
        },
      },
    },
  });

  if (!r) return null;

  return {
    id: r.id,
    stockId: r.stockId,
    quantity: r.quantity,
    status: r.status as ReservationResponse["status"],
    expiresAt: r.expiresAt.toISOString(),
    confirmedAt: r.confirmedAt?.toISOString() ?? null,
    releasedAt: r.releasedAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
    product: {
      id: r.stock.product.id,
      name: r.stock.product.name,
      price: Number(r.stock.product.price),
      sku: r.stock.product.sku,
    },
    warehouse: {
      id: r.stock.warehouse.id,
      name: r.stock.warehouse.name,
      location: r.stock.warehouse.location,
    },
  };
}
