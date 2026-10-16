import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { readPublicEnv } from "@/lib/env/public";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

export type SessionState =
  | { status: "unconfigured"; missing: string[] }
  | { status: "anonymous" }
  | {
      status: "authenticated";
      user: { id: string; email: string | null };
      supabase: ServerClient;
    };

/**
 * Per-request session lookup. Uses getUser(), which validates the token with
 * Supabase, never trusting an unverified cookie.
 */
export const getSession = cache(async (): Promise<SessionState> => {
  const env = readPublicEnv();
  if (!env.ok) return { status: "unconfigured", missing: env.missing };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) return { status: "anonymous" };
  return {
    status: "authenticated",
    user: { id: data.user.id, email: data.user.email ?? null },
    supabase,
  };
});
