"use client";

import * as React from "react";
import { Search, Bell } from "lucide-react";

export interface DashboardTopBarProps {
  userName?: string | null;
  profession?: string | null;
}

export function DashboardTopBar({ userName, profession }: DashboardTopBarProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
          {userName ? `Welcome back, ${userName.split(" ")[0]} 👋` : "Dashboard"}
        </h1>
        <p className="text-xs font-medium text-slate-400 mt-0.5">
          {profession
            ? `${profession} Registration & Pathway Progress`
            : "International Medical Registration & Pathway Progress"}
        </p>
      </div>

      {/* Right side: Search bar and Notification Bell */}
      <div className="flex items-center gap-3">
        {/* Pill Search Input */}
        <div className="relative flex-1 sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search pathways, exams, requirements..."
            className="w-full rounded-full border border-slate-200/90 bg-white py-2 pl-9.5 pr-4 text-xs sm:text-sm text-slate-700 placeholder:text-slate-400 shadow-2xs focus:border-teal-600 focus:outline-none focus:ring-1 focus:ring-teal-600 transition-all"
          />
        </div>

        {/* Notification Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative flex size-10 shrink-0 items-center justify-center rounded-full border border-slate-200/90 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <Bell className="size-4.5" />
          {/* Notification indicator dot */}
          <span className="absolute top-2 right-2 size-2 rounded-full bg-teal-700 ring-2 ring-white" />
        </button>
      </div>
    </div>
  );
}
