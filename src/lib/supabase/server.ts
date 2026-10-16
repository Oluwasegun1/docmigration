import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { requirePublicEnv } from "@/lib/env/public";
import { requireServerEnv } from "@/lib/env/server";

/**
 * Per-request Supabase client for Server Components, Route Handlers and
 * Server Actions. Acts as the signed-in user, so RLS applies.
 */
export async function createClient() {
  const env = requirePublicEnv();
  const cookieStore = await cookies();
  return createServerClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component; session refresh is handled by middleware/proxy.
          }
        },
      },
    },
  );
}

/**
 * Service-role client. BYPASSES RLS. Use only inside server/services for
 * audited administrative operations, after an explicit role check.
 */
export function createAdminClient() {
  const publicEnv = requirePublicEnv();
  const serverEnv = requireServerEnv();
  return createSupabaseClient(
    publicEnv.NEXT_PUBLIC_SUPABASE_URL,
    serverEnv.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
