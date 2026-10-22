"use client";

import * as React from "react";
import Link from "next/link";
import {
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ExternalLink,
  DollarSign,
  ShieldCheck,
  Lock,
  Check,
} from "lucide-react";
import type { PlanSummaryPayload, PlanTaskModel } from "@/modules/engine/plan/types";

interface PlanSummaryViewProps {
  planId: string;
  initialSummary: PlanSummaryPayload;
  allTasks?: PlanTaskModel[];
}

export function PlanSummaryView({ planId, initialSummary, allTasks = [] }: PlanSummaryViewProps) {
  const [summary, setSummary] = React.useState<PlanSummaryPayload>(initialSummary);
  const [tasks, setTasks] = React.useState<PlanTaskModel[]>(allTasks);
  const [activeTab, setActiveTab] = React.useState<"summary" | "all_tasks">("summary");
  const [updatingTaskId, setUpdatingTaskId] = React.useState<string | null>(null);

  // Refresh summary data
  const refreshSummary = async () => {
    try {
      const [sumRes, planRes] = await Promise.all([
        fetch(`/api/v1/plans/${planId}/summary`),
        fetch(`/api/v1/plans/${planId}`),
      ]);
      const sumJson = await sumRes.json();
      const planJson = await planRes.json();

      if (sumJson.data) setSummary(sumJson.data);
      if (planJson.data?.tasks) setTasks(planJson.data.tasks);
    } catch (err) {
      console.error("Failed to refresh summary", err);
    }
  };

  const handleUpdateTaskStatus = async (taskId: string, newStatus: string) => {
    setUpdatingTaskId(taskId);
    try {
      await fetch(`/api/v1/plans/${planId}/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      await refreshSummary();
    } catch (err) {
      console.error("Failed to update task", err);
    } finally {
      setUpdatingTaskId(null);
    }
  };

  const meta = summary.pathway;
  const progress = summary.progress;
  const hasNeedsChecking =
    summary.needsChecking.notSureTasks.length > 0 ||
    summary.needsChecking.missingProfileFields.length > 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      {/* 1. Pathway Header & Official Disclaimer */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
                Migration Roadmap Baseline (FR-6)
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                Version pinned: v{meta.pinnedVersion}
              </span>
              <span className="text-xs text-slate-400">
                Policy verified: {meta.lastVerifiedDate}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{meta.name}</h1>
          </div>

          {/* Assessment Outcome Chip */}
          <div className="shrink-0">
            {meta.assessmentStatus === "potential_match" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                <CheckCircle2 className="size-3.5" />
                <span>{meta.assessmentStatusLabel}</span>
              </span>
            )}
            {meta.assessmentStatus === "potential_blocker" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
                <AlertTriangle className="size-3.5" />
                <span>{meta.assessmentStatusLabel}</span>
              </span>
            )}
            {meta.assessmentStatus === "more_information_needed" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
                <HelpCircle className="size-3.5" />
                <span>{meta.assessmentStatusLabel}</span>
              </span>
            )}
            {meta.assessmentStatus === "unmet" && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-3 py-1 text-xs font-bold text-rose-800">
                <XCircle className="size-3.5" />
                <span>{meta.assessmentStatusLabel}</span>
              </span>
            )}
          </div>
        </div>

        {/* Regulatory Disclaimer Banner */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600 flex items-start gap-2.5">
          <ShieldCheck className="size-4 text-teal-800 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-slate-800">Statutory Notice:</strong> {meta.disclaimer}
          </p>
        </div>
      </div>

      {/* 2. Side-by-side Progress Meter (PRD Non-conflation Rule) */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-xs space-y-4">
        <h2 className="text-base font-bold text-slate-900">Your Progress Status</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left: User-reported Done */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Self-Reported Progress</span>
              <span className="font-bold text-teal-800">{progress.percentComplete}%</span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-teal-700 transition-all duration-300"
                style={{ width: `${progress.percentComplete}%` }}
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {progress.reportLabel}
            </p>
          </div>

          {/* Right: Confirmed Milestones */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Verified Milestones</span>
              <span className="font-bold text-emerald-800">
                {progress.externallyConfirmedMilestones} confirmed
              </span>
            </div>
            <div className="h-2.5 w-full rounded-full bg-slate-200 overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300"
                style={{
                  width: `${
                    progress.applicableTotal > 0
                      ? Math.round(
                          (progress.externallyConfirmedMilestones / progress.applicableTotal) * 100,
                        )
                      : 0
                  }%`,
                }}
              />
            </div>
            <p className="text-xs text-slate-500 font-medium">
              {progress.confirmedLabel}
            </p>
          </div>
        </div>
      </div>

      {/* 6. Money Warning Banner (First Irreversible Payment) */}
      {summary.moneyWarning && (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-5 shadow-xs flex items-start gap-4">
          <div className="size-9 rounded-xl bg-amber-200/80 flex items-center justify-center shrink-0 text-amber-900 mt-0.5">
            <DollarSign className="size-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-amber-950">
              Irreversible Expense Warning: {summary.moneyWarning.title}
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              {summary.moneyWarning.warningMessage}
            </p>
          </div>
        </div>
      )}

      {/* 7. Skipped Intake Tasks Banner */}
      {summary.notAskedYet && summary.notAskedYet.count > 0 && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 shadow-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <HelpCircle className="size-5 text-blue-700 shrink-0" />
            <p className="text-xs text-blue-900 font-medium">
              You skipped <strong>{summary.notAskedYet.count}</strong> questions during intake.
              Complete them anytime to make your roadmap more accurate.
            </p>
          </div>
          <Link
            href={`/plans/${planId}/intake`}
            className="shrink-0 rounded-xl bg-blue-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-900"
          >
            Continue Intake
          </Link>
        </div>
      )}

      {/* Navigation Tabs (Summary vs All Tasks) */}
      <div className="flex border-b border-slate-200 text-sm font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab("summary")}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === "summary"
              ? "border-teal-800 text-teal-850"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          Baseline Overview
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("all_tasks")}
          className={`py-3 px-4 border-b-2 transition-colors ${
            activeTab === "all_tasks"
              ? "border-teal-800 text-teal-850"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          All Pathway Tasks ({tasks.length})
        </button>
      </div>

      {activeTab === "summary" ? (
        <div className="space-y-6">
          {/* 3. Next Up (Top 3 Ready Tasks) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Next Up (Ready to Start)</h3>
                <p className="text-xs text-slate-500">
                  Unblocked tasks with all prerequisites met.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-800">
                {summary.nextUp.length} Tasks Ready
              </span>
            </div>

            {summary.nextUp.length > 0 ? (
              <div className="space-y-3">
                {summary.nextUp.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-slate-300 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-700">
                          {task.category}
                        </span>
                        {task.isIrreversiblePayment && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            Fee Required
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                      {task.sourceUrl && (
                        <a
                          href={task.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] text-teal-800 hover:underline font-medium"
                        >
                          <span>Official regulator requirements</span>
                          <ExternalLink className="size-3" />
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        disabled={updatingTaskId === task.id}
                        onClick={() => handleUpdateTaskStatus(task.id, "in_progress")}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Start Task
                      </button>
                      <button
                        type="button"
                        disabled={updatingTaskId === task.id}
                        onClick={() => handleUpdateTaskStatus(task.id, "done")}
                        className="inline-flex items-center gap-1 rounded-xl bg-teal-800 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-teal-900"
                      >
                        <Check className="size-3" />
                        <span>Mark Done</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">
                No ready tasks pending right now.
              </p>
            )}
          </div>

          {/* 4. Blocked Tasks */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900">Blocked Tasks</h3>
                <p className="text-xs text-slate-500">
                  These tasks cannot be completed until their preceding requirements are finished.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                {summary.blocked.length} Blocked
              </span>
            </div>

            {summary.blocked.length > 0 ? (
              <div className="space-y-3">
                {summary.blocked.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-xl border border-slate-200 bg-slate-50/40 p-4 space-y-2 opacity-80"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Lock className="size-3.5 text-slate-400" />
                        <span>{task.title}</span>
                      </h4>
                      <span className="text-[11px] font-medium text-slate-500 uppercase">
                        {task.category}
                      </span>
                    </div>

                    {/* Blocked by names */}
                    <div className="rounded-lg bg-amber-50/80 border border-amber-200/70 p-2 text-xs text-amber-900">
                      <strong className="font-semibold text-amber-950">Blocked by: </strong>
                      <span>
                        {task.blockedByTitles && task.blockedByTitles.length > 0
                          ? task.blockedByTitles.join(", ")
                          : "Prerequisite tasks"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">
                Great news! You have no blocked tasks at this stage.
              </p>
            )}
          </div>

          {/* 5. Needs Checking (Not Sure Answers + Missing Criteria Facts) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Needs Checking</h3>
              <p className="text-xs text-slate-500">
                Items you were not sure about during intake or missing qualification details.
              </p>
            </div>

            {hasNeedsChecking ? (
              <div className="space-y-3">
                {summary.needsChecking.notSureTasks.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                        <HelpCircle className="size-3.5" />
                        <span>{item.title}</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Marked as &quot;Not sure / need to check&quot; during intake.
                      </p>
                    </div>

                    <div className="shrink-0">
                      <button
                        type="button"
                        onClick={() => handleUpdateTaskStatus(item.id, "done")}
                        className="rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        Confirm Done
                      </button>
                    </div>
                  </div>
                ))}

                {summary.needsChecking.missingProfileFields.map((field) => (
                  <div
                    key={field}
                    className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-blue-900">
                        <HelpCircle className="size-3.5" />
                        <span>Missing profile fact: {field}</span>
                      </div>
                      <p className="text-xs text-slate-600">
                        Required by criteria to evaluate your match.
                      </p>
                    </div>

                    <div className="shrink-0">
                      <Link
                        href="/onboarding/profile"
                        className="rounded-xl bg-teal-800 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-900"
                      >
                        Update Profile Fact
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500 py-3 text-center">
                Everything is checked! No unverified items.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* All Tasks Tab */
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">All Pathway Tasks</h3>
            <span className="text-xs text-slate-500">{tasks.length} total tasks</span>
          </div>

          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                      {task.category}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        task.status === "done"
                          ? "bg-emerald-100 text-emerald-800"
                          : task.status === "in_progress"
                          ? "bg-blue-100 text-blue-800"
                          : task.status === "waiting_on_external_party"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {task.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={task.status}
                    disabled={updatingTaskId === task.id}
                    onChange={(e) => handleUpdateTaskStatus(task.id, e.target.value)}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 focus:border-teal-700"
                  >
                    <option value="not_started">Not Started</option>
                    <option value="in_progress">In Progress</option>
                    <option value="waiting_on_external_party">Waiting on third party</option>
                    <option value="done">Done</option>
                    <option value="not_applicable">Not Applicable</option>
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
