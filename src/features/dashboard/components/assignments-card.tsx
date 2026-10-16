import * as React from "react";
import { Stethoscope } from "lucide-react";

export function AssignmentsCard() {
  return (
    <div className="space-y-2.5">
      <h2 className="text-base font-bold text-slate-900">Upcoming Milestone</h2>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-teal-50/80 via-emerald-50/30 to-white p-4 sm:p-5 border border-teal-100/70 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
        {/* Left: Medical Illustration & Details */}
        <div className="flex items-center gap-4">
          {/* Stethoscope/Medical illustration container */}
          <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-100 to-emerald-100 border border-teal-200/60 shadow-xs text-teal-800">
            <Stethoscope className="size-7" />
          </div>

          <div>
            <div className="inline-flex items-center gap-1.5 rounded-md bg-teal-100/80 px-2 py-0.5 text-[10px] font-bold text-teal-800 uppercase tracking-wide">
              <span>GMC UK</span>
              <span>·</span>
              <span>Licensing Exam</span>
            </div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-1">
              PLAB 1 / AMC Examination Review
            </h3>
            <p className="text-xs font-medium text-slate-400 mt-0.5">
              20 June 2026, 10:30 AM
            </p>
          </div>
        </div>

        {/* Center/Duration */}
        <div className="flex items-center gap-6 sm:gap-8 justify-between sm:justify-start">
          <div className="text-left sm:text-center">
            <span className="block text-[11px] font-medium text-slate-400">
              Duration
            </span>
            <span className="text-xs sm:text-sm font-semibold text-slate-700">
              02 h 45 m
            </span>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
            >
              Reschedule
            </button>
            <button
              type="button"
              className="rounded-xl bg-teal-700 px-4 py-2 text-xs font-semibold text-white hover:bg-teal-800 transition-colors shadow-2xs"
            >
              Start Review
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
