import { toErrorResponse } from "@/lib/errors";
import { onboardingService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await onboardingService.joinWaitlist({
      userId: body.userId,
      email: body.email,
      professionId: body.professionId,
      professionFreeText: body.professionFreeText,
      originCountry: body.originCountry,
      destinationCountry: body.destinationCountry,
      consentGranted: Boolean(body.consentGranted),
      ipAddress: ip,
      userAgent,
    });

    return Response.json({ data: result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
