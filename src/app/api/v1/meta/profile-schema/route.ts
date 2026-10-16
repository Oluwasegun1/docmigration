import { metaResponse, parseQuery } from "@/lib/api/meta";
import { profileSchemaService, referenceService } from "@/lib/api/services";
import { profileSchemaQuery } from "@/modules/reference/schemas";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return metaResponse(async () => {
    const q = parseQuery(profileSchemaQuery, request);
    // Hidden, waitlist and unknown professions all look the same: not found.
    await referenceService.requireOpenProfession(q.profession);
    return profileSchemaService.resolve({
      profession: q.profession,
      origin: q.origin ?? null,
      locale: q.locale,
    });
  });
}
