import { prisma } from "./db";
import { Prisma, ReservationStatus } from "@prisma/client";

// Re-export for convenience
export type ReservationRecord = Prisma.ReservationGetPayload<Record<string, never>>;

export const RESERVATION_WINDOW_MINUTES = 10;

/**
 * Atomically reserves stock units using a conditional UPDATE.
 *
 * The WHERE clause ensures the update only succeeds when the available
 * inventory (totalUnits - reservedUnits) is sufficient. Postgres row-level
 * locking guarantees that concurrent requests cannot both see "enough stock"
 * and both succeed — only one writer wins per row at a time.
 *
 * If rowsAffected === 0, another concurrent request already took the units.
 *
 * Returns the created Reservation, or throws:
 *   - 'INSUFFICIENT_STOCK' if not enough available units
 *   - 'STOCK_NOT_FOUND' if the stockId doesn't exist
 */
export async function createReservation(
  stockId: string,
  quantity: number,
  idempotencyKey?: string
): Promise<ReservationRecord> {
  // Verify stock row exists first (better error message)
  const stock = await prisma.stock.findUnique({ where: { id: stockId } });
  if (!stock) throw new Error("STOCK_NOT_FOUND");

  const expiresAt = new Date(Date.now() + RESERVATION_WINDOW_MINUTES * 60 * 1000);

  // ── Critical section: atomic conditional UPDATE ──────────────────────────
  // We update reservedUnits ONLY if there's enough available stock.
  // This single statement is the concurrency safety guarantee.
  const result = await prisma.$executeRaw`
    UPDATE "Stock"
    SET "reservedUnits" = "reservedUnits" + ${quantity},
        "updatedAt" = NOW()
    WHERE id = ${stockId}
      AND ("totalUnits" - "reservedUnits") >= ${quantity}
  `;

  if (result === 0) {
    // Either no stock or another request just took the last units
    throw new Error("INSUFFICIENT_STOCK");
  }

  // Create the reservation record
  const reservation = await prisma.reservation.create({
    data: {
      stockId,
      quantity,
      expiresAt,
      status: ReservationStatus.PENDING,
      idempotencyKey: idempotencyKey ?? null,
    },
  });

  return reservation;
}

/**
 * Releases a reservation: decrements reservedUnits and marks status RELEASED.
 * Safe to call on already-released reservations (idempotent).
 */
export async function releaseReservation(reservationId: string) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");
    if (reservation.status !== ReservationStatus.PENDING) {
      // Already released or confirmed — return current state
      return reservation;
    }

    await tx.$executeRaw`
      UPDATE "Stock"
      SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0),
          "updatedAt" = NOW()
      WHERE id = ${reservation.stockId}
    `;

    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.RELEASED,
        releasedAt: new Date(),
      },
    });
  });
}

/**
 * Confirms a reservation: decrements both reservedUnits and totalUnits
 * (units are now permanently sold), marks status CONFIRMED.
 *
 * Throws 'EXPIRED' if the reservation has passed its expiresAt.
 * Throws 'NOT_PENDING' if already confirmed or released.
 */
export async function confirmReservation(reservationId: string) {
  return prisma.$transaction(async (tx) => {
    const reservation = await tx.reservation.findUnique({
      where: { id: reservationId },
    });

    if (!reservation) throw new Error("RESERVATION_NOT_FOUND");

    if (reservation.status === ReservationStatus.RELEASED) {
      throw new Error("RELEASED");
    }
    if (reservation.status === ReservationStatus.CONFIRMED) {
      // Already confirmed — idempotent return
      return reservation;
    }

    // Check expiry
    if (new Date() > reservation.expiresAt) {
      // Lazy-release: clean up while we're here
      await tx.$executeRaw`
        UPDATE "Stock"
        SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0),
            "updatedAt" = NOW()
        WHERE id = ${reservation.stockId}
      `;
      await tx.reservation.update({
        where: { id: reservationId },
        data: { status: ReservationStatus.RELEASED, releasedAt: new Date() },
      });
      throw new Error("EXPIRED");
    }

    // Confirm: units are sold — decrement both reserved and total
    await tx.$executeRaw`
      UPDATE "Stock"
      SET "reservedUnits" = GREATEST("reservedUnits" - ${reservation.quantity}, 0),
          "totalUnits" = GREATEST("totalUnits" - ${reservation.quantity}, 0),
          "updatedAt" = NOW()
      WHERE id = ${reservation.stockId}
    `;

    return tx.reservation.update({
      where: { id: reservationId },
      data: {
        status: ReservationStatus.CONFIRMED,
        confirmedAt: new Date(),
      },
    });
  });
}

/**
 * Bulk-releases all expired PENDING reservations.
 * Called by the cron job every minute.
 * Returns the number of reservations released.
 */
export async function expireStaleReservations(): Promise<number> {
  const now = new Date();

  // Find all expired pending reservations
  const expired = await prisma.reservation.findMany({
    where: {
      status: ReservationStatus.PENDING,
      expiresAt: { lt: now },
    },
  });

  if (expired.length === 0) return 0;

  // Release each in a transaction to keep stock consistent
  await prisma.$transaction(
    expired.map((r) =>
      prisma.$executeRaw`
        UPDATE "Stock"
        SET "reservedUnits" = GREATEST("reservedUnits" - ${r.quantity}, 0),
            "updatedAt" = NOW()
        WHERE id = ${r.stockId}
      `
    )
  );

  // Bulk-update status
  await prisma.reservation.updateMany({
    where: { id: { in: expired.map((r) => r.id) } },
    data: { status: ReservationStatus.RELEASED, releasedAt: now },
  });

  return expired.length;
}
