"use client";

import * as React from "react";
import { X, ExternalLink, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusNotice } from "@/components/shared/status-notice";
import type { AssessmentItemView } from "@/features/pathways/model";

interface PathwayComparisonProps {
  isOpen: boolean;
  onClose: () => void;
  selectedAssessments: AssessmentItemView[];
  onSelectPathway: (pathwayVersionId: string) => Promise<void>;
  isSelectingVersionId?: string | null;
}

export function PathwayComparison({
  isOpen,
  onClose,
  selectedAssessments,
  onSelectPathway,
  isSelectingVersionId,
}: PathwayComparisonProps) {
  if (!isOpen || selectedAssessments.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-150">
      <div className="relative w-full max-w-6xl rounded-2xl bg-white shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4 bg-slate-50/80">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900">
              Compare Pathways Side by Side
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Compare requirements, official sources, and your reported answers across up to 3 routes.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            aria-label="Close comparison"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Guidance Notice */}
        <div className="px-6 pt-4">
          <StatusNotice
            tone="info"
            title="Guidance, not an official decision"
          >
            Migration Hub provides deterministic planning guidance based on published regulator rules and your reported profile facts. It does not decide eligibility or guarantee registration or visa approval.
          </StatusNotice>
        </div>

        {/* Comparison Content */}
        <div className="flex-1 overflow-x-auto overflow-y-auto px-6 py-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 min-w-[720px]">
            {selectedAssessments.map((item) => {
              const { pathway, version, evaluation } = item;
              const outcome = evaluation.outcome;

              return (
                <div
                  key={pathway.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Destination & Meta */}
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold text-slate-700">
                        {pathway.destination?.name || pathway.destinationCountry || "Official Destination"}
                      </span>
                      <span>v{version.version}</span>
                    </div>

                    {/* Title & Regulator */}
                    <div>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">
                        {pathway.name}
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                        <ShieldCheck className="size-3.5 text-teal-800 shrink-0" />
                        <span>Regulated by: {pathway.regulator?.name || "Official Authority"}</span>
                      </p>
                    </div>

                    {/* Status Chip (Ground rule 1) */}
                    <div>
                      {outcome === "potential_match" && (
                        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-300 px-3 py-1 text-xs font-bold text-emerald-900">
                          Potential match
                        </span>
                      )}
                      {outcome === "more_information_needed" && (
                        <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-300 px-3 py-1 text-xs font-bold text-blue-900">
                          More information needed
                        </span>
                      )}
                      {outcome === "potential_blocker" && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-300 px-3 py-1 text-xs font-bold text-amber-900">
                          Potential blocker
                        </span>
                      )}
                      {outcome === "unmet" && (
                        <span className="inline-flex items-center rounded-full bg-rose-50 border border-rose-300 px-3 py-1 text-xs font-bold text-rose-900">
                          Requirement appears unmet
                        </span>
                      )}
                    </div>

                    {/* Criteria list with "you reported" and official source link */}
                    <div className="space-y-3 pt-2 border-t border-slate-100">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Requirements ({evaluation.criteriaResults.length})
                      </h4>

                      <div className="space-y-3">
                        {evaluation.criteriaResults.map((c) => {
                          const isMet = c.status === "met";
                          const isUnmet = c.status === "not_met";

                          return (
                            <div
                              key={c.criterionId || c.key}
                              className="rounded-lg border border-slate-100 bg-slate-50/60 p-3 space-y-1.5 text-xs"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <span className="font-semibold text-slate-900">
                                  {c.title}
                                </span>
                                <span
                                  className={`shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                                    isMet
                                      ? "bg-emerald-100 text-emerald-800"
                                      : isUnmet
                                      ? "bg-rose-100 text-rose-800"
                                      : "bg-blue-100 text-blue-800"
                                  }`}
                                >
                                  {isMet
                                    ? "Met"
                                    : isUnmet
                                    ? "Requirement appears unmet"
                                    : "More information needed"}
                                </span>
                              </div>

                              {/* User reported fact (Ground rule 6) */}
                              <div className="text-slate-600">
                                <span className="font-medium text-slate-700">You reported: </span>
                                <span>
                                  {c.userValue !== null && c.userValue !== undefined && c.userValue !== ""
                                    ? String(c.userValue)
                                    : "Not yet reported"}
                                </span>
                              </div>

                              {/* Official Source Link & Verified Date (Ground rule 7) */}
                              <div className="pt-1.5 border-t border-slate-200/50 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                                <span>
                                  {c.source?.verifiedAt
                                    ? `Verified on ${c.source.verifiedAt}`
                                    : "Unpublished content"}
                                </span>
                                {c.source?.url ? (
                                  <a
                                    href={c.source.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-teal-800 hover:underline font-medium"
                                  >
                                    <span>Official Source</span>
                                    <ExternalLink className="size-3" />
                                  </a>
                                ) : (
                                  <span className="text-slate-400">Source not published</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  {/* Primary Selection Action */}
                  <div className="pt-4 border-t border-slate-100">
                    <Button
                      variant="primary"
                      size="md"
                      className="w-full"
                      disabled={isSelectingVersionId === version.id}
                      onClick={() => onSelectPathway(version.id)}
                    >
                      <span>
                        {isSelectingVersionId === version.id
                          ? "Generating plan..."
                          : "Choose this pathway"}
                      </span>
                      <ArrowRight className="size-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 flex justify-end">
          <Button variant="outline" size="md" onClick={onClose}>
            Close comparison
          </Button>
        </div>
      </div>
    </div>
  );
}
