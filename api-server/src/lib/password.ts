import { randomBytes, pbkdf2Sync, timingSafeEqual } from "node:crypto";

const ITERATIONS = 120_000;
const KEYLEN = 32;
const DIGEST = "sha256";

/** Stored format: pbkdf2$<iter>$<saltB64>$<hashB64> */
export function hashPassword(plain: string): string {
  const salt = randomBytes(16);
  const hash = pbkdf2Sync(plain, salt, ITERATIONS, KEYLEN, DIGEST);
  return `pbkdf2$${ITERATIONS}$${salt.toString("base64")}$${hash.toString("base64")}`;
}

export function verifyPassword(plain: string, stored: string): boolean {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iter = Number(parts[1]);
  const salt = Buffer.from(parts[2], "base64");
  const expected = Buffer.from(parts[3], "base64");
  if (!Number.isFinite(iter) || salt.length === 0 || expected.length === 0) return false;
  const hash = pbkdf2Sync(plain, salt, iter, expected.length, DIGEST);
  return timingSafeEqual(hash, expected);
}
