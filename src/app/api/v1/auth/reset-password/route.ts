import { toErrorResponse } from "@/lib/errors";
import { authService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const token = body.token;
    const password = body.password;

    const result = await authService.resetPassword(token, password);
    return Response.json({ data: result });
  } catch (err) {
    return toErrorResponse(err);
  }
}
