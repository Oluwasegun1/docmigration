import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronDown, AlertCircle, ArrowLeft } from "lucide-react";
import { requireUser } from "@/lib/auth/require-user";
import { loadMatchesForUser } from "@/lib/matches/load";
import { StatusNotice } from "@/components/shared/status-notice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  STATUS_LABELS,
  GUIDANCE_DISCLAIMER,
  FIELD_LABELS,
} from "@/lib/matching/copy";
import { AnswersSummary } from "./components/answers-summary";
import { MatchCard } from "./components/match-card";
import { CheckAgainButton } from "./components/check-again-button";
import type { MatchResult } from "@/lib/matching/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Review Pathway Matches | Migration Hub",
  description:
    "Review your deterministic pathway matches based on your reported profile answers.",
};

function formatCountSummary(matches: MatchResult[]): string {
  const potentialMatches = matches.filter((m) => m.status === "potential_match").length;
  const moreInfo = matches.filter((m) => m.status === "more_info_needed").length;
  const blockers = matches.filter((m) => m.status === "potential_blocker").length;
  const unmet = matches.filter((m) => m.status === "requirement_unmet").length;

  const parts: string[] = [];
  if (potentialMatches > 0) {
    parts.push(`${potentialMatches} potential match${potentialMatches > 1 ? "es" : ""}`);
  }
  if (moreInfo > 0) {
    parts.push(`${moreInfo} need${moreInfo === 1 ? "s" : ""} more information`);
  }
  if (blockers > 0) {
    parts.push(`${blockers} potential blocker${blockers > 1 ? "s" : ""}`);
  }
  if (unmet > 0) {
    parts.push(`${unmet} requirement appear${unmet === 1 ? "s" : ""} unmet`);
  }

  if (parts.length === 0) return "No pathways evaluated";
  return parts.join(", ");
}

export default async function MatchesPage() {
  const { user } = await requireUser();
  if (!user) {
    redirect("/sign-in");
  }

  const loadData = await loadMatchesForUser(user.id);

  // 1. Edge State: Onboarding Incomplete (Part 6)
  if (loadData.state === "onboarding_incomplete") {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Review your pathway matches
        </h1>
        <StatusNotice tone="warning" title="Onboarding profile incomplete">
          <p className="text-xs text-amber-900 mt-1">
            We need your answers to all 7 required profile questions before we can
            screen matching pathways.
          </p>
          <div className="mt-3 space-y-1">
            <p className="text-xs font-semibold text-amber-950">Missing questions:</p>
            <ul className="list-disc pl-5 text-xs text-amber-900 space-y-0.5">
              {loadData.missingRequiredAnswers.map((k) => (
                <li key={k}>{FIELD_LABELS[k] || k}</li>
              ))}
            </ul>
          </div>
          <div className="mt-4">
            <Link href="/onboarding/profile">
              <Button variant="primary" size="md">
                Complete your profile questions
              </Button>
            </Link>
          </div>
        </StatusNotice>
      </div>
    );
  }

  // 2. Edge State: No Published Pathways for Pair (Part 6)
  if (
    loadData.state === "no_published_pathways" ||
    !loadData.evaluation ||
    loadData.evaluation.results.length === 0
  ) {
    const origin = loadData.profile?.currentCountry || "your country";
    const dest = loadData.profile?.destinationCountry || "your selected destination";

    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold text-slate-900">
          Review your pathway matches
        </h1>
        <p className="text-sm text-slate-600">
          Moving from {origin} to {dest}
        </p>
        <StatusNotice tone="info" title="No published pathways yet">
          <p className="text-xs text-teal-950 mt-1">
            We do not have published pathways from {origin} to {dest} yet.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link href="/destinations">
              <Button variant="outline" size="md">
                Explore destinations
              </Button>
            </Link>
            <Link href="/onboarding/profile">
              <Button variant="ghost" size="md">
                Edit answers
              </Button>
            </Link>
          </div>
        </StatusNotice>
      </div>
    );
  }

  const { profile, evaluation, savedAt } = loadData;
  if (!profile || !evaluation) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-4">
        <StatusNotice tone="warning" title="Could not load pathway matches">
          <p className="text-xs mt-1">Please try refreshing the page.</p>
        </StatusNotice>
      </div>
    );
  }

  const matches = evaluation.results;

  // Group cards into the 4 groups in strict precedence order
  const potentialMatches = matches.filter((m) => m.status === "potential_match");
  const moreInfoMatches = matches.filter((m) => m.status === "more_info_needed");
  const blockerMatches = matches.filter((m) => m.status === "potential_blocker");
  const unmetMatches = matches.filter((m) => m.status === "requirement_unmet");

  const allAreUnmet = unmetMatches.length === matches.length && matches.length > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
      {/* 1. Header (Part 5) */}
      <div className="space-y-1">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          Review your pathway matches
        </h1>
        <p className="text-sm font-medium text-slate-600">
          Moving from {profile.currentCountry} to {profile.destinationCountry}
        </p>
      </div>

      {/* 2. Standing Status Notice (Part 1 & Part 5) */}
      <StatusNotice tone="info" title={GUIDANCE_DISCLAIMER} />

      {/* 3. Your answers collapsed summary (Part 5) */}
      <AnswersSummary profile={profile} />

      {/* 4. One-line count of results in words (Part 5) */}
      <div className="py-2 border-b border-slate-200">
        <p className="text-sm font-semibold text-slate-800">
          {formatCountSummary(matches)}
        </p>
      </div>

      {/* Edge State: Every pathway is requirement unmet (Part 6) */}
      {allAreUnmet && (
        <Card className="p-4 bg-slate-50 border-slate-200">
          <p className="text-xs text-slate-700 font-medium">
            None of the published pathways fit your answers as they stand. Here is
            what each one asks for.
          </p>
        </Card>
      )}

      {/* 5. Match cards grouped under four headings (Part 5) */}
      <div className="space-y-8">
        {/* Group 1: Potential match */}
        {potentialMatches.length > 0 && (
          <section aria-labelledby="heading-potential-match" className="space-y-4">
            <h2
              id="heading-potential-match"
              className="text-base font-bold text-emerald-950 flex items-center gap-2"
            >
              <span className="size-2 rounded-full bg-emerald-600" aria-hidden />
              {STATUS_LABELS.potential_match} ({potentialMatches.length})
            </h2>
            <div className="space-y-4">
              {potentialMatches.map((m) => (
                <MatchCard
                  key={m.pathwayId}
                  match={m}
                  profile={profile}
                  onRefresh={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {/* Group 2: More information needed */}
        {moreInfoMatches.length > 0 && (
          <section aria-labelledby="heading-more-info" className="space-y-4">
            <h2
              id="heading-more-info"
              className="text-base font-bold text-blue-950 flex items-center gap-2"
            >
              <span className="size-2 rounded-full bg-blue-600" aria-hidden />
              {STATUS_LABELS.more_info_needed} ({moreInfoMatches.length})
            </h2>
            <div className="space-y-4">
              {moreInfoMatches.map((m) => (
                <MatchCard
                  key={m.pathwayId}
                  match={m}
                  profile={profile}
                  onRefresh={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {/* Group 3: Potential blocker */}
        {blockerMatches.length > 0 && (
          <section aria-labelledby="heading-blocker" className="space-y-4">
            <h2
              id="heading-blocker"
              className="text-base font-bold text-amber-950 flex items-center gap-2"
            >
              <span className="size-2 rounded-full bg-amber-600" aria-hidden />
              {STATUS_LABELS.potential_blocker} ({blockerMatches.length})
            </h2>
            <div className="space-y-4">
              {blockerMatches.map((m) => (
                <MatchCard
                  key={m.pathwayId}
                  match={m}
                  profile={profile}
                  onRefresh={() => {}}
                />
              ))}
            </div>
          </section>
        )}

        {/* Group 4: Requirement appears unmet (collapsed by default via <details> so users can learn why, Part 5) */}
        {unmetMatches.length > 0 && (
          <section aria-labelledby="heading-unmet" className="space-y-4">
            <details className="group" open={allAreUnmet}>
              <summary className="flex cursor-pointer items-center justify-between py-2 text-base font-bold text-red-950 list-none rounded focus-visible:outline-2 focus-visible:outline-teal-700">
                <span className="flex items-center gap-2">
                  <span className="size-2 rounded-full bg-red-600" aria-hidden />
                  {STATUS_LABELS.requirement_unmet} ({unmetMatches.length})
                </span>
                <ChevronDown
                  className="size-5 text-slate-400 transition-transform group-open:rotate-180"
                  aria-hidden
                />
              </summary>

              <div className="mt-4 space-y-4">
                {unmetMatches.map((m) => (
                  <MatchCard
                    key={m.pathwayId}
                    match={m}
                    profile={profile}
                    onRefresh={() => {}}
                  />
                ))}
              </div>
            </details>
          </section>
        )}
      </div>

      {/* 6. Footer line: Checked on date & Check again button (Part 5) */}
      <CheckAgainButton
        lastCheckedDate={savedAt || new Date().toISOString()}
        contentVersion={1}
      />
    </div>
  );
}
