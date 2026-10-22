"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronDown, Edit3 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { FIELD_LABELS, formatUserReported } from "@/lib/matching/copy";
import type { MatchProfile } from "@/lib/matching/types";

interface AnswersSummaryProps {
  profile: MatchProfile;
}

export function AnswersSummary({ profile }: AnswersSummaryProps) {
  const answerEntries: Array<{ key: keyof MatchProfile; label: string; value: unknown }> = [
    { key: "currentCountry", label: FIELD_LABELS.currentCountry, value: profile.currentCountry },
    { key: "destinationCountry", label: FIELD_LABELS.destinationCountry, value: profile.destinationCountry },
    { key: "graduationYear", label: FIELD_LABELS.graduationYear, value: profile.graduationYear },
    { key: "highestQualification", label: FIELD_LABELS.highestQualification, value: profile.highestQualification },
    { key: "internshipStatus", label: FIELD_LABELS.internshipStatus, value: profile.internshipStatus },
    { key: "careerStage", label: FIELD_LABELS.careerStage, value: profile.careerStage },
    { key: "experienceYears", label: FIELD_LABELS.experienceYears, value: profile.experienceYears },
    { key: "specialty", label: FIELD_LABELS.specialty, value: profile.specialty },
    { key: "currentWorkCountry", label: FIELD_LABELS.currentWorkCountry, value: profile.currentWorkCountry },
    { key: "timeline", label: FIELD_LABELS.timeline, value: profile.timeline },
  ];

  return (
    <Card className="p-4 sm:p-5 border-slate-200 bg-white">
      <details className="group">
        <summary className="flex cursor-pointer items-center justify-between text-sm font-semibold text-slate-900 list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 rounded-md">
          <span className="flex items-center gap-2">
            Your answers
            <span className="text-xs font-normal text-slate-500">
              (10 profile answers recorded)
            </span>
          </span>
          <div className="flex items-center gap-3">
            <Link
              href="/onboarding/profile"
              className="inline-flex items-center gap-1 text-xs font-medium text-teal-700 hover:text-teal-800 underline focus-visible:outline-2 focus-visible:outline-teal-700 rounded"
              onClick={(e) => e.stopPropagation()}
            >
              <Edit3 className="size-3.5" aria-hidden />
              Edit answers
            </Link>
            <ChevronDown
              className="size-4 text-slate-400 transition-transform group-open:rotate-180"
              aria-hidden
            />
          </div>
        </summary>

        <div className="mt-4 pt-4 border-t border-slate-100">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-xs">
            {answerEntries.map((entry) => (
              <div
                key={entry.key}
                className="flex flex-col py-1 border-b border-slate-50 sm:border-b-0"
              >
                <dt className="text-slate-500 font-medium">{entry.label}</dt>
                <dd className="text-slate-800 font-semibold mt-0.5">
                  {formatUserReported(entry.value)}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </details>
    </Card>
  );
}
