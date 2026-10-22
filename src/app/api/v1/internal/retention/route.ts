import { NextResponse } from "next/server";
import { accountService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  // Secret-protected endpoint for Vercel Cron or background triggers
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET || "internal-cron-secret";

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: { code: "forbidden", message: "Invalid cron secret." } }, { status: 403 });
  }

  const result = await accountService.purgeExpiredAccounts();

  return NextResponse.json({
    data: {
      ok: true,
      purgedCount: result.purgedCount,
      timestamp: new Date().toISOString(),
    },
  });
}
