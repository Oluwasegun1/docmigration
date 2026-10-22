"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ArrowRight,
  ExternalLink,
  PlusCircle,
  ChevronDown,
  Clock,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  STATUS_LABELS,
  CRITERION_OUTCOMES,
  ROUTE_TYPE_LABELS,
  FIELD_LABELS,
  formatCriteriaSummary,
  formatUserReported,
  formatReason,
} from "@/lib/matching/copy";
import { InlineAnswerDialog } from "./inline-answer-dialog";
import { startPlanAction } from "../actions";
import type { MatchResult, MatchProfile, AnswerKey } from "@/lib/matching/types";

interface MatchCardProps {
  match: MatchResult;
  profile: MatchProfile;
  onRefresh: () => void;
}

export function MatchCard({ match, profile, onRefresh }: MatchCardProps) {
  const router = useRouter();
  const [activeMissingField, setActiveMissingField] = React.useState<string | null>(null);
  const triggerButtonRefs = React.useRef<Record<string, HTMLButtonElement | null>>({});
  const [isStartingPlan, setIsStartingPlan] = React.useState(false);
  const [planError, setPlanError] = React.useState<string | null>(null);

  const metCount = match.criteria.filter((c) => c.outcome === "met").length;
  const unknownCount = match.criteria.filter((c) => c.outcome === "unknown").length;
  const totalCount = match.criteria.length;

  const statusLabel = STATUS_LABELS[match.status];

  const handleStartPlan = async () => {
    setIsStartingPlan(true);
    setPlanError(null);
    const res = await startPlanAction(match.pathwayVersionId);
    setIsStartingPlan(false);

    if (res.success && res.planId) {
      router.push(`/plan?id=${res.planId}`);
    } else {
      setPlanError(res.message || "Failed to start plan.");
    }
  };

  const getStatusIcon = (status: MatchResult["status"]) => {
    switch (status) {
      case "potential_match":
        return <CheckCircle2 className="size-4 shrink-0 text-emerald-700" aria-hidden />;
      case "more_info_needed":
        return <HelpCircle className="size-4 shrink-0 text-blue-700" aria-hidden />;
      case "potential_blocker":
        return <AlertTriangle className="size-4 shrink-0 text-amber-700" aria-hidden />;
      case "requirement_unmet":
        return <XCircle className="size-4 shrink-0 text-red-700" aria-hidden />;
    }
  };

  const getStatusChipClass = (status: MatchResult["status"]) => {
    switch (status) {
      case "potential_match":
        return "bg-emerald-50 text-emerald-900 border-emerald-200";
      case "more_info_needed":
        return "bg-blue-50 text-blue-900 border-blue-200";
      case "potential_blocker":
        return "bg-amber-50 text-amber-900 border-amber-200";
      case "requirement_unmet":
        return "bg-red-50 text-red-900 border-red-200";
    }
  };

  return (
    <article
      aria-labelledby={`pathway-title-${match.pathwayId}`}
      className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm transition-all hover:border-slate-300"
    >
      {/* Route type & title */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-teal-800">
            {ROUTE_TYPE_LABELS[match.routeType] || match.routeType}
          </span>
          <h3
            id={`pathway-title-${match.pathwayId}`}
            className="text-lg font-bold text-slate-900 mt-0.5"
          >
            {match.title}
          </h3>
        </div>

        {/* Status chip with text and icon (Part 8: never color alone) */}
        <div
          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border text-xs font-semibold shrink-0 self-start ${getStatusChipClass(
            match.status
          )}`}
        >
          {getStatusIcon(match.status)}
          <span>{statusLabel}</span>
        </div>
      </div>

      {/* Summary (counts, not model scores) */}
      <p className="mt-3 text-xs text-slate-600 font-medium">
        {formatCriteriaSummary(metCount, totalCount, unknownCount)}
      </p>

      {/* Timeline note (neutral wording, never a status change) */}
      {match.timelineNote && (
        <div className="mt-3 flex items-center gap-2 text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
          <Clock className="size-4 shrink-0 text-slate-400" aria-hidden />
          <span>{match.timelineNote}</span>
        </div>
      )}

      {/* Missing answers action bar (What we still need) */}
      {match.missing.length > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-blue-50/60 border border-blue-100">
          <h4 className="text-xs font-semibold text-blue-950 flex items-center gap-1.5">
            <HelpCircle className="size-3.5 text-blue-700" aria-hidden />
            What we still need to assess this pathway:
          </h4>
          <div className="mt-2 flex flex-wrap gap-2">
            {match.missing.map((key) => {
              const label = FIELD_LABELS[key] || key;
              return (
                <button
                  key={key}
                  ref={(el) => {
                    triggerButtonRefs.current[key] = el;
                  }}
                  type="button"
                  onClick={() => setActiveMissingField(key)}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md bg-white border border-blue-200 text-blue-900 hover:bg-blue-50 focus-visible:outline-2 focus-visible:outline-teal-700 transition-colors"
                >
                  <PlusCircle className="size-3.5 text-blue-700" aria-hidden />
                  Add answer: {label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Why this status: Native <details> disclosure */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <details className="group">
          <summary className="flex cursor-pointer items-center justify-between text-xs font-semibold text-slate-800 list-none rounded focus-visible:outline-2 focus-visible:outline-teal-700 py-1">
            <span>Why this status ({match.criteria.length} requirements checked)</span>
            <ChevronDown
              className="size-4 text-slate-400 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </summary>

          <div className="mt-3 space-y-3 pt-2">
            {match.criteria.map((c) => {
              const primaryField = c.usedAnswers[0];
              const userVal = primaryField ? profile[primaryField] : null;

              return (
                <div
                  key={c.requirementId}
                  className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="font-semibold text-slate-900">{c.label}</span>
                    <span
                      className={`inline-flex items-center gap-1 font-semibold text-[11px] px-2 py-0.5 rounded-full ${
                        c.outcome === "met"
                          ? "bg-emerald-100 text-emerald-800"
                          : c.outcome === "not_met"
                          ? "bg-red-100 text-red-800"
                          : "bg-blue-100 text-blue-800"
                      }`}
                    >
                      {CRITERION_OUTCOMES[c.outcome]}
                    </span>
                  </div>

                  <p className="text-slate-600">
                    {formatReason(c.reason.code, c.reason.params)}
                  </p>

                  <p className="text-slate-500 font-mono text-[11px]">
                    {formatUserReported(userVal)}
                  </p>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-[11px] text-slate-500">
                    <a
                      href={c.source.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 hover:text-teal-800 underline focus-visible:outline-2 focus-visible:outline-teal-700"
                    >
                      Official source for this requirement
                      <ExternalLink className="size-3" aria-hidden />
                    </a>
                    <span>Verified on {c.source.verifiedAt}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      </div>

      {/* Plan error notice if any */}
      {planError && (
        <div role="alert" className="mt-3 text-xs p-2.5 bg-red-50 text-red-800 rounded border border-red-200">
          {planError}
        </div>
      )}

      {/* Action buttons (Part 5) */}
      <div className="mt-5 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
        <Link
          href={`/explore?pathway=${match.pathwayId}`}
          className="text-xs font-medium text-slate-600 hover:text-slate-900 underline focus-visible:outline-2 focus-visible:outline-teal-700 rounded py-1"
        >
          View pathway details
        </Link>

        {match.status === "requirement_unmet" ? (
          <Link
            href={`/explore?pathway=${match.pathwayId}#requirements`}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700"
          >
            See what is required
          </Link>
        ) : (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleStartPlan}
            disabled={isStartingPlan}
          >
            <span>{isStartingPlan ? "Setting up plan..." : "Start a plan from this pathway"}</span>
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>

      {/* Inline Answer Dialog modal */}
      {activeMissingField && (
        <InlineAnswerDialog
          fieldKey={activeMissingField}
          triggerButtonRef={{
            current: triggerButtonRefs.current[activeMissingField] || null,
          }}
          isOpen={true}
          onClose={() => setActiveMissingField(null)}
          onSaved={() => {
            setActiveMissingField(null);
            onRefresh();
          }}
        />
      )}
    </article>
  );
}
