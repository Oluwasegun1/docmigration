import { FileCheck, CheckCircle2, Clock, CalendarClock } from "lucide-react";
import type { DashboardModel } from "@/features/dashboard/model";

export interface OverviewCardsProps {
  model: DashboardModel;
}

export function OverviewCards({ model }: OverviewCardsProps) {
  const cards = [
    {
      title: "Active Plans",
      value: model.activePlans.length,
      detail:
        model.activePlans.length === 1
          ? model.activePlans[0].destinationName
          : model.activePlans.length > 1
            ? `${model.activePlans.length} countries selected`
            : "No active plans",
      icon: FileCheck,
      tone: "text-slate-900",
      iconTone: "text-teal-700 bg-teal-50",
    },
    {
      title: "Tasks Completed",
      value: model.tasksCompleted,
      detail:
        model.tasksCompleted > 0
          ? "Personal progress recorded"
          : "Get started with your plan",
      icon: CheckCircle2,
      tone: "text-emerald-800",
      iconTone: "text-emerald-700 bg-emerald-50",
    },
    {
      title: "Tasks Remaining",
      value: model.tasksRemaining,
      detail:
        model.tasksRemaining > 0
          ? `${model.tasksRemaining} actionable items`
          : "All tasks completed",
      icon: Clock,
      tone: "text-slate-900",
      iconTone: "text-slate-700 bg-slate-100",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <div
            key={c.title}
            className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-500 sm:text-sm">
                {c.title}
              </span>
              <div
                className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${c.iconTone}`}
              >
                <Icon className="size-4" />
              </div>
            </div>
            <div
              className={`mt-2 text-2xl font-bold tracking-tight ${c.tone} sm:text-3xl`}
            >
              {c.value}
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">{c.detail}</p>
          </div>
        );
      })}

      {/* Deadlines Card - Handled gracefully based on genuine deadline data */}
      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold text-slate-500 sm:text-sm">
            Upcoming Deadlines
          </span>
          <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700">
            <CalendarClock className="size-4" />
          </div>
        </div>
        {model.deadlines ? (
          <>
            <div className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              {model.deadlines.upcoming}
            </div>
            <p className="mt-1 truncate text-xs text-slate-500">
              {model.deadlines.overdue > 0 ? (
                <span className="font-semibold text-rose-700">
                  {model.deadlines.overdue} overdue ·{" "}
                </span>
              ) : null}
              {model.deadlines.nextDate
                ? `Next: ${model.deadlines.nextDate}`
                : "Active dates"}
            </p>
          </>
        ) : (
          <>
            <div className="mt-2 text-lg font-semibold text-slate-400 sm:text-xl">
              None set
            </div>
            <p className="mt-1 text-xs text-slate-400">
              No genuine target dates configured
            </p>
          </>
        )}
      </div>
    </div>
  );
}
