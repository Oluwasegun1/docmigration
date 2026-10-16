import Link from "next/link";
import { AlertCircle, ArrowUpRight, PlusCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusChip } from "@/components/shared/status-chip";
import type { PlanView, Progress, TaskView } from "@/features/dashboard/model";

export interface MigrationProgressProps {
  primaryPlan: PlanView | null;
  progress: Progress | null;
  nextTask: TaskView | null;
}

export function MigrationProgress({
  primaryPlan,
  progress,
  nextTask,
}: MigrationProgressProps) {
  if (!primaryPlan) {
    return (
      <section
        aria-labelledby="migration-progress-heading"
        className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2
              id="migration-progress-heading"
              className="text-base font-semibold text-slate-900"
            >
              Active Migration Plan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              No active migration plan created yet. Select a destination to
              generate your personalized sequence of steps.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/destinations">
              <PlusCircle className="size-4" />
              <span>Create your migration plan</span>
            </Link>
          </Button>
        </div>
      </section>
    );
  }

  const percent = progress?.percent ?? 0;

  return (
    <section
      aria-labelledby="migration-progress-heading"
      className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
    >
      <div className="flex flex-col gap-5">
        {/* Top Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
                Active Pathway
              </span>
              <StatusChip
                tone={primaryPlan.status === "active" ? "confirmed" : "pending"}
                label={
                  primaryPlan.status === "active"
                    ? "In Progress"
                    : primaryPlan.status
                }
              />
            </div>
            <h2
              id="migration-progress-heading"
              className="mt-1 text-lg font-bold text-slate-900 sm:text-xl"
            >
              {primaryPlan.destinationName}: {primaryPlan.pathwayName}
            </h2>
            <p className="text-xs text-slate-500 sm:text-sm">
              Professional Category:{" "}
              <span className="font-medium text-slate-700 capitalize">
                {primaryPlan.profession}
              </span>
              {primaryPlan.regulatorName && (
                <>
                  {" "}
                  · Regulator:{" "}
                  <span className="font-medium text-slate-700">
                    {primaryPlan.regulatorName}
                  </span>
                </>
              )}
            </p>
          </div>

          <div className="text-right">
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {progress?.completed ?? 0}
              <span className="text-base font-normal text-slate-500">
                {" "}
                / {progress?.total ?? 0} tasks
              </span>
            </div>
            <div className="text-xs font-medium text-teal-800">
              {percent}% tasks completed
            </div>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="space-y-1.5">
          <div
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`${percent}% of tasks completed in ${primaryPlan.pathwayName}`}
            className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
          >
            <div
              className="h-full rounded-full bg-teal-700 transition-all duration-300"
              style={{ width: `${percent}%` }}
            />
          </div>
        </div>

        {/* Next Task Highlight & Disclaimers */}
        <div className="grid gap-3 pt-1 text-sm sm:grid-cols-2">
          <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3.5">
            <span className="text-xs font-semibold tracking-wide text-slate-500 uppercase">
              Next Incomplete Task
            </span>
            <div className="mt-1 font-medium text-slate-900">
              {nextTask ? (
                <a
                  href="#my-tasks"
                  className="inline-flex items-center gap-1 hover:text-teal-800 hover:underline"
                >
                  <span>{nextTask.title}</span>
                  <ArrowUpRight className="size-3.5" />
                </a>
              ) : (
                <span className="text-slate-500">
                  All planned tasks are complete
                </span>
              )}
            </div>
          </div>

          {/* Explicit Honest Separation Notice */}
          <div className="flex items-start gap-2.5 rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-600">
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-slate-400" />
            <div>
              <p className="font-semibold text-slate-700">
                Honest Tracking Notice
              </p>
              <p className="mt-0.5 text-slate-500">
                Task completion tracks your personal checklist progress. It does
                not constitute official licensing, registration, or regulatory
                approval.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
