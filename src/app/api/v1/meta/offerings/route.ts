import { metaResponse } from "@/lib/api/meta";
import { referenceService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

/** Public view of the launch matrix: live and beta rows only. Never includes internal notes. */
export function GET() {
  return metaResponse(() => referenceService.listOfferings());
}
