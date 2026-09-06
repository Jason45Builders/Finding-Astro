import { NextRequest } from "next/server";
import { redis } from "./redis";

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

const ALLOWED_IP_PREFIXES = [
  "103.", "104.", "110.", "111.", "112.", "113.", "114.", "115.",
  "116.", "117.", "118.", "119.", "120.", "121.", "122.", "123.",
  "124.", "125.", "126.", "127.", "128.", "129.", "130.", "131.",
  "132.", "133.", "134.", "135.", "136.", "137.", "138.", "139.",
];

const fallbackStore = new Map<string, RateLimitEntry>();

function getRemainingSeconds(resetAt: number): number {
  return Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
}

async function getCount(key: string): Promise<{ count: number; resetAt: number } | null> {
  if (redis) {
    try {
      const ttl = await redis.ttl(`rate:${key}`);
      if (ttl === null || ttl < 0) return null;
      const count = (await redis.get<number>(`rate:${key}`)) ?? 0;
      const resetAt = Date.now() + ttl * 1000;
      return { count, resetAt };
    } catch {
      return null;
    }
  }
  const entry = fallbackStore.get(key);
  if (!entry || Date.now() > entry.resetAt) return null;
  return entry;
}

async function incrementCount(key: string, resetAt: number): Promise<void> {
  if (redis) {
    try {
      const ttlSeconds = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
      await redis.incr(`rate:${key}`);
      await redis.expire(`rate:${key}`, ttlSeconds);
    } catch {
      // non-fatal: fallback to in-memory below
    }
  }
  fallbackStore.set(key, { count: (fallbackStore.get(key)?.count ?? 0) + 1, resetAt });
}

export async function checkRateLimit(ip: string, userAgent?: string): Promise<{ allowed: true } | { allowed: false; retryAfter: number }> {
  const key = userAgent ? getRateLimitKey(ip, userAgent) : `rl:${ip}`;
  const existing = await getCount(key);
  if (!existing) {
    const resetAt = Date.now() + WINDOW_MS;
    await incrementCount(key, resetAt);
    return { allowed: true };
  }

  if (existing.count >= MAX_REQUESTS) {
    return { allowed: false, retryAfter: getRemainingSeconds(existing.resetAt) };
  }

  await incrementCount(key, existing.resetAt);
  return { allowed: true };
}

export function getClientIp(req: NextRequest): string {
  const trustedHeaders = [
    "x-vercel-ip-country",
    "x-vercel-ip",
    "x-vercel-forwarded-for",
    "x-appengine-user-ip",
    "cf-connecting-ip",
    "true-client-ip",
  ];
  for (const header of trustedHeaders) {
    const value = req.headers.get(header);
    if (value && value.trim() !== "") return value.trim().split(",")[0].trim();
  }

  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first && first !== "unknown") return first;
  }

  const realIp = req.headers.get("x-real-ip");
  if (realIp && realIp.trim() !== "unknown") return realIp.trim();

  return "unknown";
}

export function getRateLimitKey(ip: string, userAgent: string): string {
  const normalizedUA = userAgent.split(" ")[0] ?? "unknown";
  const prefix = ip.split(".").slice(0, 2).join(".");
  return `rl:${prefix}:${normalizedUA}`;
}

export { WINDOW_MS, MAX_REQUESTS };
