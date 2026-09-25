export function generateSecureToken(bytes = 32): string {
  const array = new Uint8Array(bytes);
  globalThis.crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function generateOpaqueId(length = 21): string {
  const array = new Uint8Array(Math.ceil((length * 3) / 4) + 4);
  globalThis.crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .slice(0, length);
}

export function isExpired(
  issuedAtSeconds: number,
  maxAgeSeconds: number,
): boolean {
  return Math.floor(Date.now() / 1000) - issuedAtSeconds > maxAgeSeconds;
}

export function tokenTtl(
  issuedAtSeconds: number,
  maxAgeSeconds: number,
): number {
  const elapsed = Math.floor(Date.now() / 1000) - issuedAtSeconds;
  return Math.max(0, maxAgeSeconds - elapsed);
}

export function timingSafeEqual(a: string, b: string): boolean {
  const aBytes = new TextEncoder().encode(a);
  const bBytes = new TextEncoder().encode(b);

  if (aBytes.length !== bBytes.length) {
    let diff = 1;
    for (let i = 0; i < aBytes.length; i++) diff |= aBytes[i] ^ 0;
    return diff === 0;
  }

  let diff = 0;
  for (let i = 0; i < aBytes.length; i++) {
    diff |= aBytes[i] ^ bBytes[i];
  }
  return diff === 0;
}
