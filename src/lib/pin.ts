/**
 * PIN protection helpers.
 *
 * The PIN is never stored raw. We derive a salted hash with PBKDF2-SHA256.
 * This guards casual app access only — it does NOT encrypt the database, and
 * the app never claims otherwise.
 */

const ITERATIONS = 120_000;
const KEY_BITS = 256;

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(hex.substr(i * 2, 2), 16);
  }
  return out;
}

function subtle(): SubtleCrypto {
  const c = globalThis.crypto;
  if (!c || !c.subtle) {
    throw new Error("Web Crypto is unavailable; PIN lock cannot be enabled.");
  }
  return c.subtle;
}

function randomBytes(length: number): Uint8Array {
  const c = globalThis.crypto;
  if (!c || typeof c.getRandomValues !== "function") {
    throw new Error("Secure randomness is unavailable; PIN lock cannot be enabled.");
  }
  const bytes = new Uint8Array(length);
  c.getRandomValues(bytes);
  return bytes;
}

/** Generate a random salt (hex). */
export function generatePinSalt(): string {
  return toHex(randomBytes(16));
}

/** Derive a salted PBKDF2 hash of the PIN (hex). */
export async function hashPin(pin: string, saltHex: string): Promise<string> {
  const subtleCrypto = subtle();
  const keyMaterial = await subtleCrypto.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await subtleCrypto.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: hexToBytes(saltHex) as unknown as BufferSource,
      iterations: ITERATIONS,
    },
    keyMaterial,
    KEY_BITS,
  );
  return toHex(new Uint8Array(bits));
}

/** Constant-time-ish comparison of two hex strings. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Verify a PIN against a stored salt + hash. */
export async function verifyPin(
  pin: string,
  saltHex: string,
  expectedHash: string,
): Promise<boolean> {
  try {
    const candidate = await hashPin(pin, saltHex);
    return safeEqual(candidate, expectedHash);
  } catch {
    return false;
  }
}

/** Validate PIN format (4-6 digits). */
export function isValidPinFormat(pin: string): boolean {
  return /^\d{4,6}$/.test(pin);
}
