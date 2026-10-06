import { describe, expect, it } from "vitest";
import { stripExifGps } from "@/lib/strip-exif";

describe("media metadata sanitization", () => {
  it("removes JPEG APP1 metadata while preserving the image stream", async () => {
    const bytes = new Uint8Array([
      0xff,0xd8,
      0xff,0xe1,0x00,0x08,0x45,0x78,0x69,0x66,0x00,0x00,
      0xff,0xdb,0x00,0x04,0x00,0x00,
      0xff,0xda,0x00,0x02,
      0x01,0x02,0x03,
      0xff,0xd9,
    ]);
    const result = new Uint8Array(await stripExifGps(bytes.buffer));
    expect(Array.from(result)).not.toContain(0x45);
    expect(result[0]).toBe(0xff);
    expect(result[1]).toBe(0xd8);
    expect(result[result.length - 2]).toBe(0xff);
    expect(result[result.length - 1]).toBe(0xd9);
  });

  it("removes PNG textual metadata chunks", async () => {
    const signature = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
    const chunk = [0,0,0,3,0x74,0x45,0x58,0x74,0x61,0x62,0x63,0,0,0,0];
    const result = new Uint8Array(await stripExifGps(Uint8Array.from([...signature,...chunk]).buffer));
    expect(String.fromCharCode(...result)).not.toContain("tEXt");
    expect(result.slice(0,8)).toEqual(Uint8Array.from(signature));
  });
});
