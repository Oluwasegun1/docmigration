"use client";

import * as React from "react";
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ArrowRight,
  Shield,
  Layers,
  MapPin,
  Stethoscope,
  CheckSquare,
  Square,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { AssessmentEvaluation } from "@/modules/engine/rules/types";
import { CriteriaDrawer } from "./criteria-drawer";
import {
  type AssessmentItemView,
  type CriterionItem,
  toAssessmentItemView,
} from "@/features/pathways/model";

export type { AssessmentItemView, CriterionItem };
export { toAssessmentItemView };

interface PathwayCardProps {
  assessment: AssessmentItemView;
  onSelectPathway: (pathwayVersionId: string) => Promise<void>;
  onRefresh?: () => Promise<void>;
  isSelecting?: boolean;
  isSelectedForCompare?: boolean;
  onToggleCompare?: (pathwayId: string) => void;
  canCompare?: boolean;
}

export function PathwayCard({
  assessment,
  onSelectPathway,
  onRefresh,
  isSelecting = false,
  isSelectedForCompare = false,
  onToggleCompare,
  canCompare = true,
}: PathwayCardProps) {
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const { pathway, version, evaluation } = assessment;
  const outcome = evaluation.outcome;
  const outcomeLabel = evaluation.outcomeLabel;

  const metCount = evaluation.criteriaResults.filter((c) => c.status === "met").length;
  const notMetCount = evaluation.criteriaResults.filter((c) => c.status === "not_met").length;
  const unknownCount = evaluation.criteriaResults.filter((c) => c.status === "unknown").length;

  return (
    <>
      <Card className="hover:border-slate-300 transition-all flex flex-col justify-between">
        <div className="space-y-4">
          {/* Top Row: Meta Badges + Deterministic Status Badge */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <MapPin className="size-3 text-slate-500" />
                <span>{pathway.destination?.name || pathway.destinationCountry || "Destination"}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                <Stethoscope className="size-3 text-slate-500" />
                <span>{pathway.profession?.name || "Profession"}</span>
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                <Layers className="size-3 text-slate-400" />
                <span>v{version.version}</span>
              </span>
            </div>

            {/* 4-Status Deterministic Evaluation Badge (Ground Rule 1) */}
            <div>
              {outcome === "potential_match" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                  <CheckCircle2 className="size-3.5" />
                  <span>Potential match</span>
                </span>
              )}
              {outcome === "potential_blocker" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                  <AlertTriangle className="size-3.5" />
                  <span>Potential blocker</span>
                </span>
              )}
              {outcome === "more_information_needed" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                  <HelpCircle className="size-3.5" />
                  <span>More information needed</span>
                </span>
              )}
              {outcome === "unmet" && (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                  <XCircle className="size-3.5" />
                  <span>Requirement appears unmet</span>
                </span>
              )}
            </div>
          </div>

          {/* Pathway Name & Regulator */}
          <div>
            <h3 className="text-xl font-bold tracking-tight text-slate-900">{pathway.name}</h3>
            <p className="mt-1 text-xs font-medium text-slate-500 flex items-center gap-1.5">
              <Shield className="size-3.5 text-teal-800" />
              <span>Regulated by: {pathway.regulator?.name || "Official Authority"}</span>
            </p>
          </div>

          {/* Factual Screening Summary (No score, no percentage bar - Ground Rule 2) */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2 text-xs">
            <div className="flex flex-wrap items-center justify-between gap-1 text-slate-600 font-medium">
              <span>Official requirements screened:</span>
              <span className="font-semibold text-slate-900">
                {metCount} met
                {unknownCount > 0 ? `, ${unknownCount} info needed` : ""}
                {notMetCount > 0 ? `, ${notMetCount} unmet` : ""}
              </span>
            </div>

            {evaluation.missingFields.length > 0 && (
              <p className="text-xs text-blue-700">
                To complete screening, we need: {evaluation.missingFields.join(", ")}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls & Compare */}
        <div className="mt-6 pt-4 border-t border-slate-100 space-y-3">
          {onToggleCompare && (
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => onToggleCompare(pathway.id)}
                disabled={!isSelectedForCompare && !canCompare}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                {isSelectedForCompare ? (
                  <CheckSquare className="size-4 text-teal-700" />
                ) : (
                  <Square className="size-4 text-slate-400" />
                )}
                <span>Compare side by side</span>
              </button>

              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="text-xs font-semibold text-teal-800 hover:text-teal-950 underline"
              >
                Review criteria
              </button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5">
            {!onToggleCompare && (
              <Button
                variant="outline"
                size="md"
                onClick={() => setDrawerOpen(true)}
                className="text-xs"
              >
                Review criteria
              </Button>
            )}

            <Button
              variant="primary"
              size="md"
              disabled={isSelecting}
              onClick={() => onSelectPathway(version.id)}
              className="flex-1"
            >
              <span>{isSelecting ? "Generating plan..." : "Choose pathway & build plan"}</span>
              <ArrowRight className="size-3.5" />
            </Button>
          </div>
        </div>
      </Card>

      <CriteriaDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        pathwayName={pathway.name}
        regulatorName={pathway.regulator?.name || "Official Authority"}
        outcome={outcome}
        outcomeLabel={outcomeLabel}
        criteria={evaluation.criteriaResults}
        missingFields={evaluation.missingFields}
        onFactSaved={onRefresh}
      />
    </>
  );
}
