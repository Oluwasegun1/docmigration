"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Compass,
  RefreshCw,
  Send,
  HelpCircle,
  Columns3,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { StatusNotice } from "@/components/shared/status-notice";
import { PathwayCard } from "./pathway-card";
import { PathwayComparison } from "./pathway-comparison";
import type { AssessmentItemView } from "@/features/pathways/model";

interface ScreeningViewProps {
  initialAssessments: AssessmentItemView[];
  userProfession?: string;
  userOrigin?: string;
}

export function ScreeningView({
  initialAssessments,
  userProfession = "doctor",
  userOrigin = "NG",
}: ScreeningViewProps) {
  const router = useRouter();

  const [assessments, setAssessments] = React.useState<AssessmentItemView[]>(initialAssessments);
  const [loading, setLoading] = React.useState(false);
  const [selectingVersionId, setSelectingVersionId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // PS-7: Side-by-side comparison of up to 3 pathways
  const [selectedForCompare, setSelectedForCompare] = React.useState<string[]>([]);
  const [isCompareOpen, setIsCompareOpen] = React.useState(false);

  const fetchAssessments = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/me/assessments");
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to load assessments.");
      }
      setAssessments(json.data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error refreshing assessments.");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectPathway = async (pathwayVersionId: string) => {
    setSelectingVersionId(pathwayVersionId);
    setError(null);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `plan-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const res = await fetch("/api/v1/plans", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({ pathwayVersionId }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to create migration plan.");
      }

      const planId = body.data?.id;
      if (planId) {
        router.push(`/plans/${planId}/intake`);
      } else {
        router.push("/plan");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to select pathway.");
      setSelectingVersionId(null);
    }
  };

  const toggleCompare = (pathwayId: string) => {
    setSelectedForCompare((current) => {
      if (current.includes(pathwayId)) {
        return current.filter((id) => id !== pathwayId);
      }
      if (current.length >= 3) {
        return current;
      }
      return [...current, pathwayId];
    });
  };

  const selectedAssessmentItems = assessments.filter((a) =>
    selectedForCompare.includes(a.pathway.id),
  );

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-5">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
            <Compass className="size-3.5" />
            <span>Deterministic Matching Engine</span>
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Review your pathway matches
          </h1>
          <p className="text-sm text-slate-500">
            Ranked and explainable official routes based on the 10 facts you reported.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-center">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={() => void fetchAssessments()}
            disabled={loading}
            className="text-xs"
          >
            <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Re-evaluate</span>
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {error}
        </div>
      )}

      {/* Advisory & Sort Rules Explanation (Ground Rule 1 & 2) */}
      <div className="space-y-3">
        <StatusNotice
          tone="info"
          title="Guidance, not decisions"
        >
          This product provides planning guidance, never an official decision or guarantee of approval. Outcomes are computed deterministically from published regulator rules and your reported profile facts.
        </StatusNotice>

        <p className="text-xs text-slate-500 italic px-1">
          Ranking follows fixed, documented rules: match status tier, followed by your destination preferences and information completeness. No scores, percentages, probabilities, or match strength metrics are used.
        </p>
      </div>

      {/* Assessment Cards Grid */}
      {assessments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {assessments.map((a) => (
            <PathwayCard
              key={a.pathway.id}
              assessment={a}
              onSelectPathway={handleSelectPathway}
              onRefresh={fetchAssessments}
              isSelecting={selectingVersionId === a.version.id}
              isSelectedForCompare={selectedForCompare.includes(a.pathway.id)}
              onToggleCompare={toggleCompare}
              canCompare={selectedForCompare.length < 3}
            />
          ))}
        </div>
      ) : (
        <Card className="p-8 text-center space-y-4">
          <HelpCircle className="mx-auto size-12 text-slate-400" />
          <div className="space-y-1">
            <h2 className="text-lg font-bold text-slate-900">No Published Pathways Available Yet</h2>
            <p className="text-sm text-slate-500 max-w-md mx-auto">
              We do not yet have published regulatory pathways loaded for your origin country ({userOrigin})
              and profession ({userProfession}).
            </p>
          </div>
          <Link
            href={`/waitlist?profession=${encodeURIComponent(userProfession)}&origin=${encodeURIComponent(userOrigin)}`}
            className="inline-flex items-center gap-2 rounded-xl bg-teal-800 px-5 py-2.5 text-xs font-bold text-white shadow-xs hover:bg-teal-900"
          >
            <Send className="size-3.5" />
            <span>Join the Waitlist for this Route</span>
          </Link>
        </Card>
      )}

      {/* Waitlist footer banner */}
      <Card className="p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50/70 border-dashed">
        <div>
          <h4 className="text-sm font-bold text-slate-900">Looking for a different destination?</h4>
          <p className="text-xs text-slate-500 mt-0.5">
            Immigration content is informational only at MVP. We research and verify official pathways with regulators before publishing.
          </p>
        </div>
        <Link
          href="/waitlist"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shrink-0 self-start sm:self-auto"
        >
          <span>Request a Pathway</span>
        </Link>
      </Card>

      {/* Sticky Bottom Comparison Floating Bar (PS-7) */}
      {selectedForCompare.length > 0 && (
        <div className="fixed bottom-4 inset-x-4 max-w-2xl mx-auto z-40 bg-slate-900 text-white rounded-2xl shadow-xl px-5 py-3 flex items-center justify-between gap-4 border border-slate-800 animate-in slide-in-from-bottom duration-200">
          <div className="flex items-center gap-2 text-xs">
            <Columns3 className="size-4 text-teal-400 shrink-0" />
            <span>
              <strong>{selectedForCompare.length}</strong> of 3 pathways selected for comparison
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="md"
              onClick={() => setSelectedForCompare([])}
              className="h-8 px-2.5 text-xs text-slate-300 border-slate-700 bg-transparent hover:bg-slate-800 hover:text-white"
            >
              Clear
            </Button>
            <Button
              variant="primary"
              size="md"
              onClick={() => setIsCompareOpen(true)}
              className="h-8 px-4 text-xs bg-teal-600 hover:bg-teal-500 text-white font-bold"
            >
              Compare Side by Side
            </Button>
          </div>
        </div>
      )}

      {/* Side-by-Side Pathway Comparison Modal (PS-7) */}
      <PathwayComparison
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        selectedAssessments={selectedAssessmentItems}
        onSelectPathway={handleSelectPathway}
        isSelectingVersionId={selectingVersionId}
      />
    </div>
  );
}
