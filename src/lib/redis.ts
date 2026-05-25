/**
 * Upstash Redis client for idempotency key storage.
 * Falls back gracefully if env vars are not set (idempotency is disabled).
 */
import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

if (
  process.env.UPSTASH_REDIS_REST_URL &&
  process.env.UPSTASH_REDIS_REST_TOKEN &&
  process.env.UPSTASH_REDIS_REST_URL.trim() !== "" &&
  process.env.UPSTASH_REDIS_REST_TOKEN.trim() !== ""
) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
}

export { redis };

export const IDEMPOTENCY_TTL_SECONDS = 86400; // 24 hours
