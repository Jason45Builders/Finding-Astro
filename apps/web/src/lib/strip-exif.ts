export async function stripExifGps(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(buffer);

  if (bytes[0] !== 0xFF || bytes[1] !== 0xD8) return buffer;

  let offset = 2;
  let foundExif = false;
  while (offset < bytes.length - 1) {
    if (bytes[offset] !== 0xFF) break;
    const marker = bytes[offset + 1];
    if (marker === 0xD9) break;
    if (marker === 0xE1) {
      foundExif = true;
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

  if (!foundExif && bytes.length > 20) {
    console.warn("[stripExif] JPEG without APP1/EXIF segment — GPS data may still be present in other markers");
  }

  return buffer;
}

export async function prepareImageUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  const buffer = await file.arrayBuffer();

  if (file.type === "image/jpeg" || file.type === "image/jpg") {
    const stripped = await stripExifGps(buffer);
    if (stripped.byteLength === buffer.byteLength) return file;
    return new File([stripped], file.name, { type: file.type, lastModified: file.lastModified });
  }

  const bitmap = await createImageBitmap(file);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;

  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();

  const mimeType = file.type === "image/png" ? "image/png" : "image/jpeg";
  const blob = await canvas.convertToBlob({ type: mimeType, quality: 0.92 });
  const strippedBuffer = await blob.arrayBuffer();

  return new File([strippedBuffer], file.name.replace(/\.[^.]+$/, mimeType === "image/png" ? ".png" : ".jpg"), { type: mimeType, lastModified: file.lastModified });
}
