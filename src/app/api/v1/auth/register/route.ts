import { toErrorResponse } from "@/lib/errors";
import { authService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";
    const userAgent = request.headers.get("user-agent") || undefined;

    const result = await authService.register({
      name: body.name ?? "",
      email: body.email ?? "",
      password: body.password ?? "",
      termsAccepted: Boolean(body.termsAccepted),
      researchConsent: Boolean(body.researchConsent),
      ipAddress: ip,
      userAgent,
    });

    return Response.json({ data: result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
