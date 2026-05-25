# Allo Inventory – Reservation System

A production-ready inventory reservation system built with **Next.js 14**, **Prisma**, **Supabase (Postgres)**, and optionally **Upstash Redis**.

---

## Live Demo

> 🔗 **[Live URL — see Vercel deployment]**
> 📦 **[github.com/Mohammed0Arfath/Inventory_System](https://github.com/Mohammed0Arfath/Inventory_System)**

Seed data includes:
- 3 warehouses: Mumbai Central, Delhi North, Bangalore South
- 5 health supplement products with varying stock levels
- **Ashwagandha KSM-66 at Mumbai Central has only 1 unit** — perfect for testing the 409 concurrency behaviour

---

## Local Setup

### 1. Prerequisites

- Node.js ≥ 18
- npm or pnpm

### 2. Clone and install

```bash
git clone <your-repo-url>
cd allo-inventory-system
npm install
```

### 3. Environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `DATABASE_URL` | Supabase pooler connection string (port 6543, `?pgbouncer=true`) |
| `DIRECT_URL` | Supabase direct connection (port 5432, for migrations) |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL (optional, enables idempotency) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token (optional) |
| `CRON_SECRET` | Random secret to secure the cron endpoint |

### 4. Run migrations

```bash
npm run db:push
# or for production-grade migrations:
npx prisma migrate deploy
```

### 5. Seed the database

```bash
npm run db:seed
```

### 6. Start the dev server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000).

---

## How the Expiry Mechanism Works

### Primary: Lazy Cleanup on Read

Every API call that touches a reservation (`confirm`, `release`) checks `expiresAt` in real time. If the reservation has expired:
- `confirmReservation` immediately releases the held stock, marks the reservation `RELEASED`, and returns `410 Gone`
- The frontend shows a clear "Reservation Expired" state to the user

This means stock is **always logically correct** — no background job required for correctness.

### Secondary: Vercel Cron (daily cleanup pass)

`vercel.json` registers a daily cron job at midnight UTC (`0 0 * * *`) — the maximum frequency on Vercel Hobby:

```json
{
  "crons": [{ "path": "/api/cron/expire-reservations", "schedule": "0 0 * * *" }]
}
```

This cleans up any orphaned `PENDING` reservations that were never interacted with (e.g., user closed the browser mid-checkout). It:
1. Queries all `PENDING` reservations where `expiresAt < NOW()`
2. Decrements `Stock.reservedUnits` atomically for each
3. Sets their status to `RELEASED`

> **Note:** On Vercel Pro, this can be set to `* * * * *` (every minute) for tighter cleanup. On Hobby, the lazy-read mechanism ensures correctness regardless of cron frequency.

### Why not Redis TTL + keyspace notifications?

Redis TTL-based expiry via keyspace notifications requires a persistent Redis connection and adds operational complexity. The lazy-check + daily cron approach is simpler, serverless-compatible, and fully correct — the daily pass just reclaims `reservedUnits` from orphaned sessions sooner.

---

## Concurrency Model

The core of the race condition fix lives in `src/lib/reservation.ts`:

```sql
UPDATE "Stock"
SET "reservedUnits" = "reservedUnits" + $quantity,
    "updatedAt" = NOW()
WHERE id = $stockId
  AND ("totalUnits" - "reservedUnits") >= $quantity
```

This is a **conditional UPDATE** executed in a single Postgres statement. Postgres's row-level locking ensures:

- Only one writer can modify a given `Stock` row at a time
- If two concurrent requests arrive for the last unit, one UPDATE will win (rowsAffected = 1) and the other will fail silently (rowsAffected = 0)
- The losing request receives a 409 Conflict response

No application-level locks, no Redis SETNX, no advisory locks needed — Postgres is the source of truth.

---

## Bonus: Idempotency

If a client sends a request with an `Idempotency-Key` header, the server stores the response in Redis under `idempotency:reservation:<key>` with a 24-hour TTL.

Subsequent requests with the same key return the cached response without repeating the side effect. This prevents double-reservations on network retries (e.g., the user's browser retrying after a timeout).

Response includes `X-Idempotent-Replayed: true` header when serving a cached response.

**Requires Upstash Redis.** Gracefully degrades to non-idempotent behaviour if Redis is not configured.

---

## API Reference

| Method | Path | Status Codes | Description |
|---|---|---|---|
| GET | `/api/products` | 200, 500 | List products with available stock per warehouse |
| GET | `/api/warehouses` | 200, 500 | List warehouses |
| GET | `/api/reservations/:id` | 200, 404 | Get reservation by ID |
| POST | `/api/reservations` | 201, 400, 404, 409 | Create reservation |
| POST | `/api/reservations/:id/confirm` | 200, 404, 409, 410 | Confirm reservation |
| POST | `/api/reservations/:id/release` | 200, 404 | Release reservation |
| POST | `/api/cron/expire-reservations` | 200 | Expire stale reservations (cron) |

---

## Trade-offs & What I'd Do Differently

### What I'd do with more time

1. **Authentication** — Reservations should be tied to a user/session. Currently any client can confirm or release any reservation by ID. In production, confirm/release would require auth middleware.

2. **WebSocket / SSE for real-time stock** — Currently the product listing page polls every 30 seconds. A WebSocket channel or Server-Sent Events would give true real-time stock updates across all clients simultaneously.

3. **Multi-item reservations** — The current model supports one `Stock` row per reservation. A real checkout would bundle multiple products/warehouses into a single reservation with transactional rollback if any line fails.

4. **Payment integration** — The "confirm" button is a placeholder for a real payment gateway (Razorpay, Stripe). In production, the payment provider webhook would call the confirm endpoint, not the user's browser.

5. **Distributed testing** — A proper load test with k6 or Artillery against the concurrent reservation endpoint to validate the 409 behaviour under real concurrency.

6. **Optimistic UI** — Pre-decrement stock locally on the product page when a reservation is created, rather than waiting for the 30-second refresh.

### Deliberate trade-offs

- **`reservedUnits` counter over reservation aggregation** — Calculating available stock as `totalUnits - reservedUnits` is O(1) per stock row. The alternative (aggregating reservation quantities at read time) is O(n) in reservations and requires joins. The trade-off is that `reservedUnits` must be kept consistent, which the atomic UPDATE ensures.

- **No queue / outbox pattern** — For simplicity, the cron job queries and updates directly. A production system would use a job queue (BullMQ, Inngest) for retry logic and observability.

- **Supabase pgbouncer in transaction mode** — PgBouncer in transaction mode means each query may be routed to a different server connection. Prisma's `$transaction` API works correctly here because each transaction acquires a dedicated connection for its duration.
