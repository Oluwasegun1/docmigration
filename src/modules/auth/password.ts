import "server-only";
import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { AppError } from "@/lib/errors";
import { isBreachedOrCommonPassword } from "./breached-passwords";

const scryptAsync = promisify(scrypt);

const KEY_LENGTH = 64;
const MIN_LENGTH = 10;
const MAX_LENGTH = 64;

export function validatePasswordStrength(password: string): void {
  if (!password || password.length < MIN_LENGTH) {
    throw new AppError("validation_error", "Password must be at least 10 characters long.");
  }
  if (password.length > MAX_LENGTH) {
    throw new AppError("validation_error", "Password must not exceed 64 characters.");
  }
  if (isBreachedOrCommonPassword(password)) {
    throw new AppError(
      "validation_error",
      "This password is too common or easily guessed. Please pick a less common sentence or phrase.",
    );
  }
}

/**
 * Hashes password using scrypt with random 16-byte salt.
 * Format: `<saltHex>:<hashHex>`
 */
export async function hashPassword(password: string): Promise<string> {
  validatePasswordStrength(password);
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a password against the stored salt:hash string using constant-time comparison.
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(":");
    if (!salt || !hash) return false;
    const derivedKey = (await scryptAsync(password, salt, KEY_LENGTH)) as Buffer;
    const originalKey = Buffer.from(hash, "hex");
    if (derivedKey.length !== originalKey.length) return false;
    return timingSafeEqual(derivedKey, originalKey);
  } catch {
    return false;
  }
}
