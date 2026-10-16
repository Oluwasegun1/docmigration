"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { readPublicEnv } from "@/lib/env/public";

export async function signOutAction() {
  const env = readPublicEnv();
  if (env.ok) {
    try {
      const supabase = await createClient();
      await supabase.auth.signOut();
    } catch (err) {
      console.error(
        "Sign out error",
        err instanceof Error ? err.name : "unknown",
      );
    }
  }
  redirect("/");
}
