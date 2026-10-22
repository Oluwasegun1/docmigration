import { NextResponse } from "next/server";
import { getSessionToken } from "@/lib/auth/cookies";
import { accountService, authService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function GET() {
  return handleExport();
}

export async function POST() {
  return handleExport();
}

async function handleExport() {
  const token = await getSessionToken();
  if (!token) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Not signed in." } }, { status: 401 });
  }

  const user = await authService.getSessionUser(token);
  if (!user) {
    return NextResponse.json({ error: { code: "unauthenticated", message: "Session expired or invalid." } }, { status: 401 });
  }

  const exportData = await accountService.exportUserData(user.id);

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="migration-hub-data-${user.id}.json"`,
    },
  });
}
