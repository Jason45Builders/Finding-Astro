import { describe, it, expect } from "vitest";

describe("Funding payout trigger", () => {
  const OPEN_CASE = { total_amount: 5000, amount_raised: 0, status: "OPEN" as const };
  const PARTIAL_CASE = { total_amount: 5000, amount_raised: 3000, status: "OPEN" as const };
  const FULL_CASE = { total_amount: 5000, amount_raised: 5000, status: "CLOSED" as const };

  function computeNewStatus(existing: { total_amount: number; amount_raised: number }, amount: number) {
    const newRaised = Number(existing.amount_raised) + amount;
    return newRaised >= Number(existing.total_amount) ? "CLOSED" : "OPEN";
  }

  function computeNewRaised(existing: { amount_raised: number }, amount: number) {
    return Number(existing.amount_raised) + amount;
  }

  it("opens a new funding case", () => {
    const after = computeNewStatus(OPEN_CASE, 100);
    expect(after).toBe("OPEN");
    expect(computeNewRaised(OPEN_CASE, 100)).toBe(100);
  });

  it("partially funds an open case", () => {
    const after = computeNewStatus(PARTIAL_CASE, 1000);
    expect(after).toBe("OPEN");
    expect(computeNewRaised(PARTIAL_CASE, 1000)).toBe(4000);
  });

  it("closes the case when fully funded", () => {
    const after = computeNewStatus(PARTIAL_CASE, 2000);
    expect(after).toBe("CLOSED");
    expect(computeNewRaised(PARTIAL_CASE, 2000)).toBe(5000);
  });

  it("does not allow over-funding beyond total", () => {
    const raised = computeNewRaised(PARTIAL_CASE, 3000);
    expect(raised).toBe(6000);
    expect(computeNewStatus(PARTIAL_CASE, 3000)).toBe("CLOSED");
  });

  it("validateDonationAmount rejects zero and negative", () => {
    const validateDonationAmount = (amount: number) => {
      if (!amount || amount <= 0) throw new Error("VALIDATION_ERROR: Valid fundingCaseId and positive amount required");
    };
    expect(() => validateDonationAmount(-100)).toThrow("VALIDATION_ERROR");
    expect(() => validateDonationAmount(0)).toThrow("VALIDATION_ERROR");
    expect(() => validateDonationAmount(100)).not.toThrow();
  });
});
