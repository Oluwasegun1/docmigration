import { metaResponse, parseQuery } from "@/lib/api/meta";
import { referenceService } from "@/lib/api/services";
import { countriesQuery } from "@/modules/reference/schemas";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  return metaResponse(async () => {
    const q = parseQuery(countriesQuery, request);
    return referenceService.listCountries(q);
  });
}
