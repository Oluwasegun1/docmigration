import { z } from "zod";
import { AppError, toErrorResponse } from "@/lib/errors";

/**
 * Reference data is public, user-free and identical for everyone, so it is cacheable at the
 * edge. The locale is part of the URL, which keeps the cache key correct.
 */
const META_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";

export function parseQuery<S extends z.ZodType>(schema: S, request: Request): z.infer<S> {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = schema.safeParse(params);
  if (!parsed.success) {
    throw new AppError(
      "validation_error",
      "Invalid query parameters.",
      parsed.error.issues.map((i) => ({ param: String(i.path[0] ?? ""), code: i.code })),
    );
  }
  return parsed.data;
}

/** Wraps a meta handler: cache headers on success, the shared error shape otherwise. */
export async function metaResponse(run: () => Promise<unknown>): Promise<Response> {
  try {
    const data = await run();
    return Response.json({ data }, { headers: { "Cache-Control": META_CACHE_CONTROL } });
  } catch (err) {
    const res = toErrorResponse(err);
    res.headers.set("Cache-Control", "no-store");
    return res;
  }
}
