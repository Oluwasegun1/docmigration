import Link from "next/link";
import { Globe, ArrowUpRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/status-chip";
import type { DestinationView } from "@/features/dashboard/model";

export interface DestinationsSummaryProps {
  destinations: DestinationView[];
}

export function DestinationsSummary({
  destinations,
}: DestinationsSummaryProps) {
  return (
    <section aria-labelledby="my-destinations-heading" className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Globe className="size-5 text-teal-700" />
          <h2
            id="my-destinations-heading"
            className="text-lg font-bold text-slate-900 sm:text-xl"
          >
            My Destinations
          </h2>
        </div>
        <Button asChild variant="ghost" size="md">
          <Link href="/destinations" className="text-xs">
            Explore all
          </Link>
        </Button>
      </div>

      {destinations.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <Compass className="mx-auto size-8 text-slate-400" />
          <h3 className="mt-2 text-sm font-semibold text-slate-900">
            No destinations saved yet
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Select the countries you are considering to compare official
            licensing requirements side by side.
          </p>
          <div className="mt-4">
            <Button asChild variant="outline" size="md">
              <Link href="/destinations">Explore available destinations</Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {destinations.map((dest) => (
            <div
              key={dest.code}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-colors hover:border-slate-300"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="flex size-7 items-center justify-center rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                      {dest.code}
                    </div>
                    <span className="font-semibold text-slate-900">
                      {dest.name}
                    </span>
                  </div>
                  {dest.planStatus !== "none" && (
                    <StatusChip
                      tone={
                        dest.planStatus === "active" ? "confirmed" : "pending"
                      }
                      label={
                        dest.planStatus === "active"
                          ? "Active plan"
                          : dest.planStatus
                      }
                    />
                  )}
                </div>

                <div className="text-xs text-slate-600">
                  {dest.pathwayNames.length > 0 ? (
                    <div className="space-y-1">
                      <span className="text-[11px] font-medium text-slate-400 uppercase">
                        Pathways:
                      </span>
                      <p className="font-medium text-slate-800">
                        {dest.pathwayNames.join(", ")}
                      </p>
                    </div>
                  ) : (
                    <p className="text-slate-400">
                      General interest (no pathway chosen)
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <Link
                  href={`/destinations#${dest.code.toLowerCase()}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 hover:text-teal-900 hover:underline"
                >
                  <span>View pathway details</span>
                  <ArrowUpRight className="size-3" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
