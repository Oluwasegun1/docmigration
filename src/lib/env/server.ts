import "server-only";
import { z } from "zod";

/**
 * Server-only environment. The `server-only` import makes the build fail if
 * this module is ever imported from a Client Component.
 */
const serverEnvSchema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  APP_ENV: z
    .enum(["development", "staging", "production"])
    .default("development"),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

export function requireServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    APP_ENV: process.env.APP_ENV || undefined,
  });
  if (!parsed.success) {
    const names = [
      ...new Set(
        parsed.error.issues.map((i) => String(i.path[0] ?? "unknown")),
      ),
    ];
    throw new Error(
      `Missing or invalid server environment variables: ${names.join(", ")}. See .env.example.`,
    );
  }
  return parsed.data;
}
