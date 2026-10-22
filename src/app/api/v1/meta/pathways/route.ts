import { NextResponse } from "next/server";
import { pathwayService } from "@/lib/api/services";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const profession = url.searchParams.get("profession") || undefined;
    const origin = url.searchParams.get("origin") || undefined;
    const destination = url.searchParams.get("destination") || undefined;

    const pathways = await pathwayService.listPathways({
      profession,
      origin,
      destination,
    });

    const response = NextResponse.json({
      data: pathways.map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        profession: p.professionRel,
        origin: p.originRel,
        destination: p.destRel,
        regulator: p.regulatorRel,
        status: p.status,
        latestVersion: p.versions[0]
          ? {
              id: p.versions[0].id,
              version: p.versions[0].version,
              status: p.versions[0].status,
              publishedAt: p.versions[0].publishedAt,
              criteriaCount: p.versions[0].criteria.length,
              taskCount: p.versions[0].templates.length,
            }
          : null,
      })),
    });

    // Public cacheable for 5 minutes
    response.headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=600");
    return response;
  } catch (error) {
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : "Failed to load pathways" } },
      { status: 500 },
    );
  }
}
