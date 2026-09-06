import { describe, it, expect, vi, beforeEach } from "vitest";
import { checkRateLimit, getRateLimitKey, WINDOW_MS, MAX_REQUESTS } from "@/lib/rate-limit";

describe("Rate limiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("allows requests under the limit", async () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      const result = await checkRateLimit("127.0.0.1");
      expect(result.allowed).toBe(true);
    }
  });

  it("blocks requests over the limit", async () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      await checkRateLimit("127.0.0.1");
    }
    const result = await checkRateLimit("127.0.0.1");
    expect(result.allowed).toBe(false);
    if (!result.allowed) {
      expect(result.retryAfter).toBeGreaterThan(0);
    }
  });

  it("resets after the window expires", async () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      await checkRateLimit("127.0.0.1");
    }
    vi.advanceTimersByTime(WINDOW_MS + 1000);
    const result = await checkRateLimit("127.0.0.1");
    expect(result.allowed).toBe(true);
  });

  it("treats different IPs independently", async () => {
    for (let i = 0; i < MAX_REQUESTS; i++) {
      await checkRateLimit("127.0.0.1");
    }
    const result = await checkRateLimit("127.0.0.2");
    expect(result.allowed).toBe(true);
  });

  it("generates composite keys with user agent", () => {
    const key1 = getRateLimitKey("127.0.0.1", "Mozilla/5.0");
    const key2 = getRateLimitKey("127.0.0.1", "curl/7.68.0");
    expect(key1).not.toBe(key2);
    expect(key1).toContain("Mozilla/5.0".split(" ")[0]);
  });
});
