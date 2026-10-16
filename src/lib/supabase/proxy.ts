import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { readPublicEnv } from "@/lib/env/public";

/**
 * Refreshes the Supabase auth cookies on each request so Server Components
 * always see a valid session. Does nothing when Supabase is not configured.
 * Authorization is NOT decided here; every page and action re-checks the user.
 */
export async function updateSession(request: NextRequest) {
  const env = readPublicEnv();
  let response = NextResponse.next({ request });
  if (!env.ok) return response;

  const supabase = createServerClient(
    env.env.NEXT_PUBLIC_SUPABASE_URL,
    env.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  await supabase.auth.getUser();
  return response;
}
