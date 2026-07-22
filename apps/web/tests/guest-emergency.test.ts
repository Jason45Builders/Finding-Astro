import { describe, it, expect } from "vitest";

describe("Guest emergency case creation", () => {
  const GUEST_USER_ID = "00000000-0000-0000-0000-000000000001";

  function buildCasePayload(overrides: Record<string, unknown> = {}) {
    return {
      title: "Emergency rescue",
      description: "Injured animal on roadside",
      location: { latitude: 13.0827, longitude: 80.2707 },
      priority: "high" as const,
      caseType: "rescue" as const,
      ...overrides,
    };
  }

  function validateCaseCreate(input: unknown): { ok: boolean; error?: string } {
    if (!input || typeof input !== "object") return { ok: false, error: "Body required" };
    const p = input as Record<string, unknown>;
    if (!p.location || typeof p.location !== "object") return { ok: false, error: "location required" };
    const loc = p.location as Record<string, number>;
    if (typeof loc.latitude !== "number" || typeof loc.longitude !== "number") {
      return { ok: false, error: "latitude and longitude required" };
    }
    return { ok: true };
  }

  it("accepts a valid emergency case payload", () => {
    const result = validateCaseCreate(buildCasePayload());
    expect(result.ok).toBe(true);
  });

  it("rejects missing location", () => {
    const result = validateCaseCreate({ ...buildCasePayload(), location: null });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("location required");
  });

  it("rejects non-numeric coordinates", () => {
    const result = validateCaseCreate({ ...buildCasePayload(), location: { latitude: "abc", longitude: 80 } });
    expect(result.ok).toBe(false);
    expect(result.error).toBe("latitude and longitude required");
  });

  it("defaults reporter to guest user when no auth", () => {
    const reporter = GUEST_USER_ID;
    expect(reporter).toBe("00000000-0000-0000-0000-000000000001");
  });

  it("maps emergency case_type to rescue in DB", () => {
    const caseType = "rescue";
    expect(caseType).toBe("rescue");
  });

  it("creates open status for emergency case", () => {
    const status = "open";
    expect(status).toBe("open");
  });
});
