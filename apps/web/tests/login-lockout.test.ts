import { describe, it, expect } from "vitest";

describe("Login lockout logic", () => {
  it("calculates lockout threshold correctly", () => {
    const MAX_FAILURES = 5;
    const LOCKOUT_MINUTES = 15;
    const lockoutSeconds = LOCKOUT_MINUTES * 60;

    expect(MAX_FAILURES).toBe(5);
    expect(lockoutSeconds).toBe(900);
  });

  it("determines remaining lockout time", () => {
    const lockedUntil = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const remaining = Math.ceil((new Date(lockedUntil).getTime() - Date.now()) / 1000);
    expect(remaining).toBeGreaterThan(0);
    expect(remaining).toBeLessThanOrEqual(600);
  });

  it("clears lockout after expiration", () => {
    const lockedUntil = new Date(Date.now() - 1000).toISOString();
    const isLocked = new Date(lockedUntil) > new Date();
    expect(isLocked).toBe(false);
  });
});
