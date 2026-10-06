import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { scanBuffer } from "@/lib/virus-scan";

describe("media scanner", () => {
  const originalClam = process.env.CLAMAV_HOST;
  const originalPort = process.env.CLAMAV_PORT;
  const originalVT = process.env.VIRUSTOTAL_API_KEY;

  beforeEach(() => {
    delete process.env.CLAMAV_HOST;
    delete process.env.CLAMAV_PORT;
    delete process.env.VIRUSTOTAL_API_KEY;
  });

  afterEach(() => {
    if (originalClam === undefined) delete process.env.CLAMAV_HOST;
    else process.env.CLAMAV_HOST = originalClam;
    if (originalPort === undefined) delete process.env.CLAMAV_PORT;
    else process.env.CLAMAV_PORT = originalPort;
    if (originalVT === undefined) delete process.env.VIRUSTOTAL_API_KEY;
    else process.env.VIRUSTOTAL_API_KEY = originalVT;
  });

  it("never reports clean when no scanner is configured", async () => {
    const result = await scanBuffer(new ArrayBuffer(4), "test.bin");
    expect(result.clean).toBe(false);
    expect(result.scanner).toBe("none-error");
    expect(result.threat).toBe("scanner_unavailable");
  });
});
