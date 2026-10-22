"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Info,
  DollarSign,
} from "lucide-react";
import type { IntakeGroupView } from "@/modules/intake/service";

const INTAKE_CHOICES = [
  {
    key: "done",
    label: "I've completed this",
    description: "You've finished this step and have the result or document.",
    badgeColor: "border-emerald-300 bg-emerald-50 text-emerald-900",
    activeColor: "border-emerald-600 bg-emerald-600 text-white",
  },
  {
    key: "in_progress",
    label: "Currently working on it",
    description: "You're actively studying, preparing, or filing for this step.",
    badgeColor: "border-blue-300 bg-blue-50 text-blue-900",
    activeColor: "border-blue-600 bg-blue-600 text-white",
  },
  {
    key: "waiting_on_external_party",
    label: "Waiting on someone else",
    description: "Awaiting university verification, regulator response, or authority action.",
    badgeColor: "border-purple-300 bg-purple-50 text-purple-900",
    activeColor: "border-purple-600 bg-purple-600 text-white",
  },
  {
    key: "not_started",
    label: "Haven't started yet",
    description: "You have not begun any preparation or paperwork for this step.",
    badgeColor: "border-slate-300 bg-slate-50 text-slate-800",
    activeColor: "border-slate-700 bg-slate-700 text-white",
  },
  {
    key: "not_applicable",
    label: "Doesn't apply to my situation",
    description: "You are exempt or this prerequisite is bypassed by your qualifications.",
    badgeColor: "border-zinc-300 bg-zinc-50 text-zinc-800",
    activeColor: "border-zinc-700 bg-zinc-700 text-white",
  },
  {
    key: "not_sure",
    label: "Not sure / need to check",
    description: "We'll flag this step so you can verify it without holding up your roadmap.",
    badgeColor: "border-amber-300 bg-amber-50 text-amber-900",
    activeColor: "border-amber-600 bg-amber-600 text-white",
  },
] as const;

interface ProgressIntakeFlowProps {
  planId: string;
  initialGroups: IntakeGroupView[];
}

export function ProgressIntakeFlow({ planId, initialGroups }: ProgressIntakeFlowProps) {
  const router = useRouter();

  const [groups] = React.useState<IntakeGroupView[]>(initialGroups);
  const [currentGroupIndex, setCurrentGroupIndex] = React.useState(0);

  // Map of taskTemplateId -> answer state
  const [answers, setAnswers] = React.useState<
    Record<
      string,
      {
        answer: string;
        completedMonth?: string | null;
        note?: string | null;
      }
    >
  >(() => {
    const map: Record<string, { answer: string; completedMonth?: string | null; note?: string | null }> = {};
    for (const g of initialGroups) {
      for (const q of g.questions) {
        if (q.currentAnswer) {
          map[q.id] = {
            answer: q.currentAnswer.answer,
            completedMonth: q.currentAnswer.completedMonth,
            note: q.currentAnswer.note,
          };
        }
      }
    }
    return map;
  });

  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [isFinishing, setIsFinishing] = React.useState(false);

  // Debounced autosave
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const saveAnswersBatch = React.useCallback(
    async (
      answersToSave: Record<
        string,
        { answer: string; completedMonth?: string | null; note?: string | null }
      >,
    ) => {
      setSaveStatus("saving");
      try {
        const payload = Object.entries(answersToSave).map(([taskTemplateId, data]) => ({
          taskTemplateId,
          answer: data.answer,
          completedMonth: data.completedMonth ?? null,
          note: data.note ?? null,
        }));

        const res = await fetch(`/api/v1/plans/${planId}/intake`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: payload }),
        });

        if (!res.ok) {
          throw new Error("Failed to save intake answers.");
        }

        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus((c) => (c === "saved" ? "idle" : c));
        }, 2000);
      } catch (err) {
        setSaveStatus("error");
        console.error("Intake save error", err);
      }
    },
    [planId],
  );

  const handleSelectAnswer = (
    taskTemplateId: string,
    choiceKey: string,
    extra?: { completedMonth?: string; note?: string },
  ) => {
    const updated = {
      ...answers,
      [taskTemplateId]: {
        answer: choiceKey,
        completedMonth: extra?.completedMonth ?? answers[taskTemplateId]?.completedMonth ?? null,
        note: extra?.note ?? answers[taskTemplateId]?.note ?? null,
      },
    };
    setAnswers(updated);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      void saveAnswersBatch(updated);
    }, 500);
  };

  const currentGroup = groups[currentGroupIndex];
  const totalGroups = groups.length;

  const handleNext = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await saveAnswersBatch(answers);

    if (currentGroupIndex < totalGroups - 1) {
      setCurrentGroupIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      setIsFinishing(true);
      router.push(`/plans/${planId}`);
    }
  };

  const handlePrev = () => {
    if (currentGroupIndex > 0) {
      setCurrentGroupIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const handleSkipSection = async () => {
    if (currentGroupIndex < totalGroups - 1) {
      setCurrentGroupIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push(`/plans/${planId}`);
    }
  };

  const handleSaveAndFinishLater = async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await saveAnswersBatch(answers);
    router.push(`/plans/${planId}`);
  };

  if (!currentGroup) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <CheckCircle2 className="mx-auto size-12 text-emerald-600" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">Intake Complete</h2>
        <p className="mt-1 text-sm text-slate-500">All questions for this pathway have been answered.</p>
        <button
          onClick={() => router.push(`/plans/${planId}`)}
          className="mt-5 rounded-xl bg-teal-800 px-6 py-2.5 text-xs font-bold text-white hover:bg-teal-900"
        >
          View Roadmap Baseline
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Top Bar with autosave and exit */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
            <Sparkles className="size-3.5" />
            <span>Progress Intake Baseline (FR-5)</span>
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Where are you now?
          </h1>
          <p className="text-sm text-slate-500">
            Tell us what you have already done so we can build your accurate, unblocked roadmap.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="size-2 animate-ping rounded-full bg-teal-600" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              Saved
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveAndFinishLater}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            Save & finish later
          </button>
        </div>
      </div>

      {/* Group Progress Indicator */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>
            Section {currentGroupIndex + 1} of {totalGroups}: {currentGroup.groupTitle}
          </span>
          <span>{Math.round(((currentGroupIndex + 1) / totalGroups) * 100)}%</span>
        </div>
        <div className="flex gap-2">
          {groups.map((g, i) => (
            <button
              key={g.groupKey}
              type="button"
              onClick={() => setCurrentGroupIndex(i)}
              className={`h-2 flex-1 rounded-full transition-all ${
                i <= currentGroupIndex ? "bg-teal-800" : "bg-slate-200"
              }`}
              title={g.groupTitle}
            />
          ))}
        </div>
      </div>

      {/* Questions List for Current Group */}
      <div className="space-y-6">
        {currentGroup.questions.map((q, qIndex) => {
          const currentAnswer = answers[q.id]?.answer;

          // Out of order heuristic: if this question has prior questions in current group that are not completed
          const priorIncomplete = currentGroup.questions
            .slice(0, qIndex)
            .find((prior) => answers[prior.id]?.answer !== "done");
          const showOutOfOrderHint = currentAnswer === "done" && Boolean(priorIncomplete);

          return (
            <div
              key={q.id}
              className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7 shadow-xs space-y-4"
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase text-slate-600">
                    {q.category}
                  </span>
                  {q.isIrreversiblePayment && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-900">
                      <DollarSign className="size-3" />
                      <span>Irreversible Fee</span>
                    </span>
                  )}
                </div>
                <h3 className="text-base font-bold text-slate-900">{q.questionText}</h3>
                {q.bodyText && <p className="text-xs text-slate-500 leading-relaxed">{q.bodyText}</p>}
              </div>

              {/* 6 standard answer buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {INTAKE_CHOICES.map((choice) => {
                  const isSelected = currentAnswer === choice.key;

                  return (
                    <button
                      key={choice.key}
                      type="button"
                      onClick={() => handleSelectAnswer(q.id, choice.key)}
                      className={`flex flex-col items-start p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? `${choice.activeColor} shadow-xs ring-2 ring-teal-700/20`
                          : "border-slate-200 bg-white hover:bg-slate-50 text-slate-800"
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-bold text-xs">
                        <span>{choice.label}</span>
                      </div>
                      <span
                        className={`text-[11px] mt-1 leading-snug line-clamp-2 ${
                          isSelected ? "opacity-90" : "text-slate-500"
                        }`}
                      >
                        {choice.description}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Out-of-order non-blocking hint */}
              {showOutOfOrderHint && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3.5 text-xs text-amber-900 flex items-start gap-2.5">
                  <AlertTriangle className="size-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <p className="font-semibold text-amber-950">Heads up: Sequence Advisory</p>
                    <p className="leading-relaxed">
                      Usually, &quot;{priorIncomplete?.questionText}&quot; is completed before this step. Did
                      you complete this through another route, or is this an exemption? We will mark it
                      completed according to your report.
                    </p>
                  </div>
                </div>
              )}

              {/* Source Link */}
              {q.sourceUrl && (
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="flex items-center gap-1">
                    <Info className="size-3 text-slate-400" />
                    <span>Regulator step criteria</span>
                  </span>
                  <a
                    href={q.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-teal-800 hover:underline font-semibold"
                  >
                    <span>View Official Guideline</span>
                    <ExternalLink className="size-3" />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Flow Controls */}
      <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-6 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentGroupIndex === 0}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <ArrowLeft className="size-3.5 inline mr-1" />
            <span>Previous Section</span>
          </button>

          <button
            type="button"
            onClick={handleSkipSection}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
          >
            Skip section
          </button>
        </div>

        <button
          type="button"
          disabled={isFinishing}
          onClick={handleNext}
          className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-800 px-6 py-3 text-xs font-bold text-white shadow-xs hover:bg-teal-900 disabled:opacity-50 transition"
        >
          <span>
            {currentGroupIndex === totalGroups - 1
              ? isFinishing
                ? "Generating Baseline..."
                : "Generate My Baseline Roadmap"
              : "Next Section"}
          </span>
          <ArrowRight className="size-3.5" />
        </button>
      </div>
    </div>
  );
}
