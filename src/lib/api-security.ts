import "server-only";
import { createHash } from "node:crypto";
import { getAuthDatabase } from "@/lib/auth";

export { getClientIp } from "@/lib/client-ip";

const isProduction = process.env.NODE_ENV === "production";

function getAllowedOrigins(): Set<string> {
  const configuredOrigins = isProduction
    ? [
        process.env.BETTER_AUTH_URL,
        process.env.FRONTEND_ORIGIN,
        process.env.VERCEL_PROJECT_PRODUCTION_URL,
      ]
    : [
        process.env.BETTER_AUTH_URL,
        process.env.FRONTEND_ORIGIN,
        "http://localhost:3000",
        "http://127.0.0.1:3000",
      ];

  return new Set(
    configuredOrigins.flatMap((value) => {
      if (!value) return [];
      try {
        const normalized = /^https?:\/\//i.test(value) ? value : `https://${value}`;
        return [new URL(normalized).origin];
      } catch {
        return [];
      }
    })
  );
}

/** Reject cross-site browser requests before they reach authenticated mutations. */
export function isTrustedMutationRequest(request: Request): boolean {
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;

  const originHeader = request.headers.get("origin");
  if (originHeader) {
    try {
      return getAllowedOrigins().has(new URL(originHeader).origin);
    } catch {
      return false;
    }
  }

  // Fallback to Referer header if origin is not present
  const refererHeader = request.headers.get("referer");
  if (refererHeader) {
    try {
      return getAllowedOrigins().has(new URL(refererHeader).origin);
    } catch {
      return false;
    }
  }

  return false;
}

type RateLimitRecord = {
  timestamps: number[];
};

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * In-memory sliding-window rate limiter.
 * Automatically evicts old entries to preserve memory.
 */
export function checkRateLimit(
  key: string,
  limit = 20,
  windowMs = 60 * 1000
): { allowed: boolean; remaining: number } {
  const now = Date.now();
  const cutoff = now - windowMs;

  let record = rateLimitStore.get(key);
  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Remove timestamps outside the sliding window
  record.timestamps = record.timestamps.filter((t) => t > cutoff);

  if (record.timestamps.length >= limit) {
    return { allowed: false, remaining: 0 };
  }

  record.timestamps.push(now);
  return { allowed: true, remaining: limit - record.timestamps.length };
}

/** Mongo-backed fixed-window limiter shared by serverless instances. */
let rateLimitIndexPromise: Promise<string> | undefined;
export async function checkPersistentRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<{ allowed: boolean; remaining: number }> {
  const db = await getAuthDatabase();
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const id = createHash("sha256").update(`${key}:${windowStart}`).digest("hex");
  const collection = db.collection<{ _id: string; count: number; expiresAt: Date }>("apiRateLimits");

  rateLimitIndexPromise ??= collection.createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
  await rateLimitIndexPromise;
  let record;
  try {
    record = await collection.findOneAndUpdate(
      { _id: id },
      {
        $inc: { count: 1 },
        $setOnInsert: { expiresAt: new Date(windowStart + windowMs * 2) },
      },
      { upsert: true, returnDocument: "after", includeResultMetadata: false }
    );
  } catch (error) {
    // Concurrent first requests can race on the unique _id during upsert.
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error;
    record = await collection.findOneAndUpdate(
      { _id: id },
      { $inc: { count: 1 } },
      { returnDocument: "after", includeResultMetadata: false }
    );
  }
  const count = record?.count ?? limit + 1;
  return { allowed: count <= limit, remaining: Math.max(0, limit - count) };
}

// Cleanup stale keys every 5 minutes
if (typeof setInterval !== "undefined") {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      record.timestamps = record.timestamps.filter((t) => t > now - 5 * 60 * 1000);
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
  if (cleanupTimer && typeof cleanupTimer === "object" && "unref" in cleanupTimer) {
    (cleanupTimer as { unref: () => void }).unref();
  }
}
