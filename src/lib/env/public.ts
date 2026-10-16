import { z } from "zod";

/**
 * Public (browser-safe) environment. Next.js only inlines NEXT_PUBLIC_*
 * variables when referenced literally, so each is listed explicitly.
 * Never add secrets here.
 */
const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SITE_URL: z.url().default("http://localhost:3000"),
});

export type PublicEnv = z.infer<typeof publicEnvSchema>;

export type PublicEnvResult =
  { ok: true; env: PublicEnv } | { ok: false; missing: string[] };

export function readPublicEnv(): PublicEnvResult {
  const parsed = publicEnvSchema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL || undefined,
  });
  if (parsed.success) return { ok: true, env: parsed.data };
  const missing = [
    ...new Set(parsed.error.issues.map((i) => String(i.path[0] ?? "unknown"))),
  ];
  return { ok: false, missing };
}

/** Throws a descriptive error naming the variables (never their values). */
export function requirePublicEnv(): PublicEnv {
  const result = readPublicEnv();
  if (!result.ok) {
    throw new Error(
      `Missing or invalid environment variables: ${result.missing.join(", ")}. See .env.example and docs/development.md.`,
    );
  }
  return result.env;
}
