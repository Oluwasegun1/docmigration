import { afterEach, describe, expect, it, vi } from "vitest";
import { readPublicEnv, requirePublicEnv } from "@/lib/env/public";

afterEach(() => vi.unstubAllEnvs());

describe("public env validation", () => {
  it("reports missing variables by name", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "");
    const result = readPublicEnv();
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
      expect(result.missing).toContain("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
    }
    expect(() => requirePublicEnv()).toThrow(/NEXT_PUBLIC_SUPABASE_URL/);
  });

  it("accepts valid configuration", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
    const result = readPublicEnv();
    expect(result.ok).toBe(true);
  });
});
