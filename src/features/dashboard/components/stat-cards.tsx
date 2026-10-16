import * as React from "react";
import { RotateCcw, CheckCircle2, ShieldCheck } from "lucide-react";

export function StatCards() {
  const stats = [
    {
      id: "in-progress",
      label: "In progress",
      value: "4 Active Tasks",
      icon: RotateCcw,
      iconBg: "bg-purple-50",
      iconBorder: "border-purple-100",
      iconColor: "text-purple-600",
    },
    {
      id: "completed",
      label: "Completed",
      value: "18 Milestones",
      icon: CheckCircle2,
      iconBg: "bg-emerald-50",
      iconBorder: "border-emerald-100",
      iconColor: "text-emerald-600",
    },
    {
      id: "verified",
      label: "Verified Records",
      value: "12 Documents",
      icon: ShieldCheck,
      iconBg: "bg-teal-50",
      iconBorder: "border-teal-100",
      iconColor: "text-teal-700",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
      {stats.map((stat) => {
        const Icon = stat.icon;
        return (
          <div
            key={stat.id}
            className="flex items-center gap-4 rounded-2xl bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100/90 transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
          >
            <div
              className={`flex size-11 shrink-0 items-center justify-center rounded-full border ${stat.iconBg} ${stat.iconBorder} ${stat.iconColor}`}
            >
              <Icon className="size-5" />
            </div>
            <div>
              <div className="text-xs font-medium text-slate-400">
                {stat.label}
              </div>
              <div className="mt-0.5 text-base font-bold text-slate-900">
                {stat.value}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
