export async function stripExifGps(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(buffer);

  if (bytes.byteLength < 20 || bytes[0] !== 0xFF || bytes[1] !== 0xD8) {
    return buffer;
  }

  let offset = 2;
  while (offset < bytes.byteLength - 1) {
    if (bytes[offset] !== 0xFF) break;
    const marker = bytes[offset + 1];
    if (marker === 0xD9 || marker === 0xDA) break;

    if (marker === 0xE1) {
      if (offset + 3 >= bytes.byteLength) break;
      const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
      if (length < 2 || offset + 2 + length > bytes.byteLength) break;
      const before = bytes.slice(0, offset);
      const after = bytes.slice(offset + 2 + length);
      const combined = new Uint8Array(before.length + after.length);
      combined.set(before);
      combined.set(after);
      return combined.buffer;
    }

    if (offset + 3 >= bytes.byteLength) break;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2) break;
    offset += 2 + length;
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
