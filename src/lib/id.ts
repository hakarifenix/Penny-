/** Unique identifier generation for records and recurring occurrences. */

/**
 * Generate a RFC4122 v4 UUID when available, with a random fallback for
 * older webviews. Used for transaction IDs, recurring occurrence keys, etc.
 */
export function newId(): string {
  const c = globalThis.crypto as Crypto | undefined;
  if (c && typeof c.randomUUID === "function") {
    return c.randomUUID();
  }
  if (c && typeof c.getRandomValues === "function") {
    const bytes = c.getRandomValues(new Uint8Array(16));
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  }
  // Last-resort pseudo-random ID (not cryptographically strong).
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Deterministic occurrence identifier for a recurring template on a given
 * scheduled date. Used to guarantee a recurring transaction is never posted
 * twice for the same occurrence.
 */
export function occurrenceId(templateId: string, scheduledDate: string): string {
  return `${templateId}::${scheduledDate}`;
}
