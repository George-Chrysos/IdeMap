// ============================================================
// IdeMap — Tiny nanoid replacement (no external dep needed)
// ============================================================

export function nanoid(size = 12): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  // Use globalThis.crypto which is available in both browser and Node 19+
  const cryptoApi: Pick<Crypto, "getRandomValues"> =
    typeof globalThis.crypto !== "undefined"
      ? globalThis.crypto
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      : (require("crypto") as { webcrypto: Crypto }).webcrypto;
  const values = cryptoApi.getRandomValues(new Uint8Array(size));
  for (let i = 0; i < size; i++) {
    result += chars[values[i] % chars.length];
  }
  return result;
}
