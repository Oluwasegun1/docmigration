import { readPublicEnv } from "@/lib/env/public";

export const dynamic = "force-dynamic";

/** Liveness plus honest configuration status. Reveals variable names only, never values. */
export function GET() {
  const env = readPublicEnv();
  return Response.json({
    status: "ok",
    supabaseConfigured: env.ok,
    ...(env.ok ? {} : { missing: env.missing }),
  });
}
