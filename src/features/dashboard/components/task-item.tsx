"use client";

import * as React from "react";
import {
  CheckCircle2,
  Lock,
  Calendar,
  AlertCircle,
  Loader2,
  MapPin,
} from "lucide-react";
import { StatusChip, type StatusTone } from "@/components/shared/status-chip";
import { completeTaskAction } from "@/features/tasks/actions";
import type { TaskView } from "@/features/dashboard/model";

export interface TaskItemProps {
  task: TaskView;
}

const STATUS_CONFIG: Record<
  TaskView["displayStatus"],
  { label: string; tone: StatusTone }
> = {
  not_started: { label: "Not started", tone: "pending" },
  in_progress: { label: "In progress", tone: "estimate" },
  waiting: { label: "Waiting", tone: "conditional" },
  blocked: { label: "Blocked", tone: "critical" },
  completed: { label: "Completed", tone: "confirmed" },
};

export function TaskItem({ task }: TaskItemProps) {
  const [isPending, startTransition] = React.useTransition();
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const isCompleted = task.displayStatus === "completed";
  const statusCfg = STATUS_CONFIG[task.displayStatus];

  const handleComplete = () => {
    if (!task.canComplete || isCompleted || isPending) return;
    setErrorMessage(null);
    startTransition(async () => {
      const res = await completeTaskAction(task.id);
      if (!res.ok) {
        setErrorMessage(res.message);
      }
    });
  };

  return (
    <li className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs transition-colors hover:border-slate-300 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={statusCfg.tone} label={statusCfg.label} />
            <span className="inline-flex items-center gap-1 text-xs text-slate-500">
              <MapPin className="size-3 text-slate-400" />
              <span>
                {task.destinationName} · {task.pathwayName}
              </span>
            </span>
          </div>

          <h3 className="text-base font-semibold text-slate-900">
            {task.title}
          </h3>

          {task.description && (
            <p className="text-sm text-slate-600">{task.description}</p>
          )}
        </div>

        {/* Action Button */}
        <div className="shrink-0">
          {isCompleted ? (
            <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="size-4 text-emerald-600" />
              <span>Done</span>
            </div>
          ) : task.canComplete ? (
            <button
              type="button"
              disabled={isPending}
              onClick={handleComplete}
              aria-label={`Mark task completed: ${task.title}`}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:border-teal-700 hover:bg-teal-50 hover:text-teal-900 focus-visible:outline-2 focus-visible:outline-teal-700 disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 className="size-3.5 animate-spin" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-3.5 text-slate-400" />
                  <span>Mark complete</span>
                </>
              )}
            </button>
          ) : (
            <div
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-500"
              title="This task cannot be marked done until preceding dependencies are completed"
            >
              <Lock className="size-3.5" />
              <span>Prerequisites pending</span>
            </div>
          )}
        </div>
      </div>

      {/* Dependencies Warning if blocked */}
      {task.blockedByTitles.length > 0 && !isCompleted && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50/70 p-2.5 text-xs text-amber-900">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0 text-amber-700" />
          <div>
            <span className="font-semibold">Prerequisites required:</span>{" "}
            Finish{" "}
            <span className="italic">{task.blockedByTitles.join(", ")}</span>{" "}
            before marking this task completed.
          </div>
        </div>
      )}

      {/* Due date & Metadata */}
      {task.dueDate && (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Calendar className="size-3.5 text-slate-400" />
          <span className={task.overdue ? "font-semibold text-rose-700" : ""}>
            {task.overdue
              ? `Overdue since ${task.dueDate}`
              : `Target: ${task.dueDate}`}
          </span>
        </div>
      )}

      {/* Inline error if complete action failed */}
      {errorMessage && (
        <div
          role="alert"
          className="flex items-center gap-2 rounded-lg border border-rose-200 bg-rose-50 p-2.5 text-xs text-rose-800"
        >
          <AlertCircle className="size-3.5 shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}
    </li>
  );
}
