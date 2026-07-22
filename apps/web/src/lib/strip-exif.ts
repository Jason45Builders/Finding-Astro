export async function stripExifGps(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return buffer;

  let offset = 2;
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xFF) break;
    const marker = bytes[offset + 1];
    if (marker === 0xD9) break;
    if (marker === 0xE1) {
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      const segmentStart = offset;
      const segmentEnd = offset + 2 + length;
      const before = bytes.slice(0, segmentStart);
      const after = bytes.slice(segmentEnd);
      const combined = new Uint8Array(before.length + after.length);
      combined.set(before);
      combined.set(after);
      return combined.buffer;
    }
    if (marker === 0xDA) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    offset += 2 + length;
  }
  return buffer;
}
