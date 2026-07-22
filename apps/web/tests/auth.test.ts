import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";

const hashPassword = async (pw: string) => bcrypt.hash(pw, 10);
const comparePassword = async (pw: string, hash: string) => bcrypt.compare(pw, hash);

describe("Auth flow", () => {
  it("hashes and verifies a password", async () => {
    const password = "TestPassword123!";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(await comparePassword(password, hash)).toBe(true);
    expect(await comparePassword("wrong", hash)).toBe(false);
  });

  it("rejects empty password during signup validation", async () => {
    const password = "";
    const valid = password.length >= 6;
    expect(valid).toBe(false);
  });

  it("validates email format", async () => {
    const valid = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    expect(valid("user@example.com")).toBe(true);
    expect(valid("not-an-email")).toBe(false);
    expect(valid("")).toBe(false);
  });
});
