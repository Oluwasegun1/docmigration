import "server-only";
import { createHash, randomBytes } from "node:crypto";

/**
 * Generates a random cryptographic token and its SHA-256 hash.
 * The raw token is sent to the user (in an email link), while ONLY the hash
 * is stored in the database.
 */
export function generateToken(): { token: string; hash: string } {
  const token = randomBytes(32).toString("hex");
  const hash = hashToken(token);
  return { token, hash };
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
