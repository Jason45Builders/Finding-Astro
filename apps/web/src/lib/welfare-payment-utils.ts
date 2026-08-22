export function isValidUpiId(value: string): boolean {
  if (!value || typeof value !== "string") return false;
  const trimmed = value.trim().toLowerCase();
  if (trimmed.length < 4 || trimmed.length > 50) return false;
  if (!trimmed.includes("@")) return false;
  const [handle, provider] = trimmed.split("@");
  if (!handle || handle.length < 1 || handle.length > 20) return false;
  if (!provider || provider.length < 2 || provider.length > 20) return false;
  const validChars = /^[a-z0-9._-]+$/;
  if (!validChars.test(handle)) return false;
  if (!validChars.test(provider)) return false;
  if (trimmed.startsWith("@") || trimmed.endsWith("@")) return false;
  if (trimmed.includes("..")) return false;
  return true;
}

export function generateReceiptNumber(): string {
  const now = new Date();
  const year = now.getFullYear();
  const seq = Math.floor(Math.random() * 900000) + 100000;
  return `FA-WG-${year}-${seq}`;
}
