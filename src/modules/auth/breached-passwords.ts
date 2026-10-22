import "server-only";

/**
 * Top most common / breached passwords loaded server-side only.
 * Never shipped to the client and never makes external network calls.
 */
const COMMON_PASSWORDS = new Set([
  "1234567890",
  "password123",
  "password1234",
  "password12345",
  "qwertyuiop",
  "12345678901",
  "admin12345",
  "welcome123",
  "welcome1234",
  "iloveyou123",
  "changeme123",
  "letmein1234",
  "migration123",
  "migrationhub",
  "doctor12345",
  "nigeria12345",
  "sunshine123",
  "princess123",
  "football123",
  "monkey12345",
  "shadow12345",
  "master12345",
  "dragon12345",
  "trustno1123",
]);

export function isBreachedOrCommonPassword(password: string): boolean {
  return COMMON_PASSWORDS.has(password.toLowerCase().trim());
}
