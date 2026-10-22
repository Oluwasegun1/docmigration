import { toErrorResponse } from "@/lib/errors";
import { authService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body.email;
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "127.0.0.1";

    const result = await authService.forgotPassword(email, ip);
    return Response.json({ data: result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
