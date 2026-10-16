/**
 * Real public routes verified to exist in the application.
 */
export interface AppRoute {
  path: string;
  label: string;
  description?: string;
}

export const VERIFIED_PUBLIC_ROUTES: readonly AppRoute[] = [
  {
    path: "/",
    label: "Home",
    description: "Overview and pathway discovery starting point",
  },
  {
    path: "/destinations",
    label: "Explore Destinations",
    description: "Browse destination countries and official registration routes",
  },
  {
    path: "/dashboard",
    label: "Migration Dashboard",
    description: "Track your tasks, active plans, and next recommendations",
  },
] as const;

/**
 * Calculates Levenshtein distance between two strings.
 */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    new Array(n + 1).fill(0),
  );

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1, // deletion
          dp[i][j - 1] + 1, // insertion
          dp[i - 1][j - 1] + 1, // substitution
        );
      }
    }
  }

  return dp[m][n];
}

/**
 * Finds if exactly one verified route is close to the requested pathname.
 * Uses prefix matching or Levenshtein edit distance <= 2.
 * Ignores query strings and hashes, normalizes casing, and safely handles edge cases.
 */
export function findClosestRoute(rawPathname: string): AppRoute | null {
  if (!rawPathname) return null;

  // Extract path only, strip trailing slashes and normalize
  const cleanPath = rawPathname
    .split(/[?#]/)[0]
    .trim()
    .toLowerCase()
    .replace(/\/+$/, "") || "/";

  if (cleanPath === "/") return null; // Root path doesn't need suggestion

  const matches: { route: AppRoute; score: number }[] = [];

  for (const route of VERIFIED_PUBLIC_ROUTES) {
    if (route.path === "/") continue;

    const target = route.path.toLowerCase();

    // 1. Exact match (should have routed, but in case)
    if (cleanPath === target) return null;

    // 2. Direct edit distance match (<= 2)
    const dist = levenshteinDistance(cleanPath, target);
    if (dist <= 2) {
      matches.push({ route, score: dist });
      continue;
    }

    // 3. Significant prefix or substring match
    // e.g. "/destination" -> "/destinations", "/dash" -> "/dashboard"
    const strippedClean = cleanPath.replace(/^\//, "");
    const strippedTarget = target.replace(/^\//, "");

    if (
      strippedClean.length >= 3 &&
      (strippedTarget.startsWith(strippedClean) ||
        strippedClean.startsWith(strippedTarget))
    ) {
      matches.push({ route, score: 3 });
      continue;
    }
  }

  // Exactly one close match required to avoid ambiguous suggestions
  if (matches.length === 1) {
    return matches[0].route;
  }

  return null;
}
