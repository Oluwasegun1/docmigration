import { createBrowserClient } from "@supabase/ssr";
import { requirePublicEnv } from "@/lib/env/public";

/** Supabase client for Client Components. Uses only the public key; RLS applies. */
export function createClient() {
  const env = requirePublicEnv();
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
