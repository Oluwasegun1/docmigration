import { BookOpen, ExternalLink, ShieldCheck, HelpCircle } from "lucide-react";
import type { ResourceView } from "@/features/dashboard/model";

export interface RecommendedResourcesProps {
  resources: ResourceView[] | null;
}

const TYPE_LABELS: Record<ResourceView["type"], string> = {
  regulator_guidance: "Official Guidance",
  application_portal: "Application Portal",
  examination: "Examination Provider",
  language_test: "Language Assessment",
  immigration: "Visa & Immigration",
  fees: "Official Fees",
  other: "Regulatory Resource",
};

export function RecommendedResources({ resources }: RecommendedResourcesProps) {
  return (
    <section
      aria-labelledby="resources-heading"
      id="resources"
      className="space-y-4"
    >
      <div className="flex items-center gap-2">
        <BookOpen className="size-5 text-teal-700" />
        <h2
          id="resources-heading"
          className="text-lg font-bold text-slate-900 sm:text-xl"
        >
          Recommended Official Resources
        </h2>
      </div>

      {resources === null || resources.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-start gap-3">
            <HelpCircle className="mt-0.5 size-5 shrink-0 text-slate-400" />
            <div className="space-y-1 text-sm">
              <p className="font-semibold text-slate-800">
                Official regulatory resources will appear here
              </p>
              <p className="text-slate-500">
                In accordance with our honest source-verification rules,
                external regulatory links and guidelines are displayed only
                after they have been reviewed and human-verified against
                official statutory regulators (e.g. GMC, Medical Council of
                Ireland).
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {resources.map((res) => (
            <div
              key={res.id}
              className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-2xs transition-colors hover:border-slate-300"
            >
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-1 text-xs">
                  <span className="font-medium text-teal-800">
                    {TYPE_LABELS[res.type] || res.type}
                  </span>
                  <span className="text-slate-400">{res.destinationName}</span>
                </div>

                <h3 className="text-base font-semibold text-slate-900">
                  {res.title}
                </h3>

                <p className="text-xs text-slate-500">
                  Published by:{" "}
                  <span className="font-medium text-slate-700">
                    {res.regulatorName}
                  </span>
                </p>

                {res.verifiedDate && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-800">
                    <ShieldCheck className="size-3.5 text-emerald-600" />
                    <span>Verified on {res.verifiedDate}</span>
                  </div>
                )}
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <a
                  href={res.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-900 hover:underline"
                >
                  <span>Open official source</span>
                  <ExternalLink className="size-3" />
                  <span className="sr-only">(opens in new tab)</span>
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
