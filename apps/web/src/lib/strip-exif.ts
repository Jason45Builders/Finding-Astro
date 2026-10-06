function stripJpegMetadata(bytes: Uint8Array): ArrayBuffer {
  if (bytes.length < 4 || bytes[0] !== 0xff || bytes[1] !== 0xd8) return bytes.buffer;
  const out: number[] = [0xff, 0xd8];
  let offset = 2;
  while (offset < bytes.length) {
    if (bytes[offset] !== 0xff) { for (let i = offset; i < bytes.length; i++) out.push(bytes[i]); break; }
    const marker = bytes[offset + 1];
    if (marker === 0xd9) { out.push(0xff, 0xd9); break; }
    if (marker === 0xda) { for (let i = offset; i < bytes.length; i++) out.push(bytes[i]); break; }
    if (offset + 3 >= bytes.length) return bytes.buffer;
    const length = (bytes[offset + 2] << 8) | bytes[offset + 3];
    if (length < 2 || offset + 2 + length > bytes.length) return bytes.buffer;
    const metadata = marker === 0xe1 || marker === 0xe2 || marker === 0xed || marker === 0xee;
    if (!metadata) for (let i = offset; i < offset + 2 + length; i++) out.push(bytes[i]);
    offset += 2 + length;
  }
  return Uint8Array.from(out).buffer;
}

function stripPngMetadata(bytes: Uint8Array): ArrayBuffer {
  const sig = [0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a];
  if (bytes.length < 8 || !sig.every((v,i) => bytes[i] === v)) return bytes.buffer;
  const removed = new Set(["eXIf","tEXt","zTXt","iTXt","tIME"]);
  const out: number[] = [...sig]; let offset = 8;
  while (offset < bytes.length) {
    if (offset + 12 > bytes.length) return bytes.buffer;
    const length = (bytes[offset]<<24)|(bytes[offset+1]<<16)|(bytes[offset+2]<<8)|bytes[offset+3];
    if (length < 0 || offset + 12 + length > bytes.length) return bytes.buffer;
    const type = String.fromCharCode(...bytes.slice(offset+4,offset+8));
    if (!removed.has(type)) for (let i=offset;i<offset+12+length;i++) out.push(bytes[i]);
    offset += 12 + length;
  }
  return Uint8Array.from(out).buffer;
}

function stripWebpMetadata(bytes: Uint8Array): ArrayBuffer {
  if (bytes.length < 12 || String.fromCharCode(...bytes.slice(0,4)) !== "RIFF" || String.fromCharCode(...bytes.slice(8,12)) !== "WEBP") return bytes.buffer;
  const out: number[] = [...bytes.slice(0,12)]; let offset = 12;
  while (offset + 8 <= bytes.length) {
    const type = String.fromCharCode(...bytes.slice(offset,offset+4));
    const size = bytes[offset+4] | (bytes[offset+5]<<8) | (bytes[offset+6]<<16) | (bytes[offset+7]<<24);
    if (size < 0 || offset + 8 + size > bytes.length) return bytes.buffer;
    if (type !== "EXIF" && type !== "XMP ") for (let i=offset;i<offset+8+size+(size&1);i++) if (i<bytes.length) out.push(bytes[i]);
    offset += 8 + size + (size & 1);
  }
  const result=Uint8Array.from(out); const riffSize=result.length-8;
  result[4]=riffSize&255; result[5]=(riffSize>>>8)&255; result[6]=(riffSize>>>16)&255; result[7]=(riffSize>>>24)&255;
  return result.buffer;
}

export async function stripExifGps(buffer: ArrayBuffer): Promise<ArrayBuffer> {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xd8) return stripJpegMetadata(bytes);
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return stripPngMetadata(bytes);
  if (String.fromCharCode(...bytes.slice(0,4)) === "RIFF" && String.fromCharCode(...bytes.slice(8,12)) === "WEBP") return stripWebpMetadata(bytes);
  return buffer;
}

export async function prepareImageUpload(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  const buffer = await file.arrayBuffer();
  const stripped = await stripExifGps(buffer);
  if (stripped.byteLength === buffer.byteLength) return file;
  return new File([stripped], file.name, { type: file.type, lastModified: file.lastModified });
}