import * as React from "react";
import Link from "next/link";
import { Compass, Globe, ChevronRight } from "lucide-react";

export interface PathwayProgressItem {
  id: string;
  title: string;
  subtitle: string;
  progress: number;
}

export interface MyCoursesCardProps {
  pathways?: PathwayProgressItem[];
}

export function MyCoursesCard({ pathways: externalPathways }: MyCoursesCardProps) {
  const defaultPathways = [
    {
      id: "uk-gmc",
      title: "United Kingdom — GMC Registration",
      subtitle: "PLAB / Standard Pathway · 10 milestones",
      progress: 50,
      icon: Compass,
    },
    {
      id: "aus-amc",
      title: "Australia — AMC Medical Pathway",
      subtitle: "Standard Pathway · 7 milestones",
      progress: 27,
      icon: Globe,
    },
  ];

  const items = (externalPathways && externalPathways.length > 0)
    ? externalPathways.map((p, idx) => ({
        ...p,
        icon: idx % 2 === 0 ? Compass : Globe,
      }))
    : defaultPathways;

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-slate-900">Active Pathways</h2>
          <span className="flex size-5 items-center justify-center rounded-full bg-teal-600 text-[11px] font-bold text-white">
            {items.length}
          </span>
        </div>
        <Link
          href="/destinations"
          className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-400 hover:text-teal-800 transition-colors"
        >
          <span>View all pathways</span>
          <ChevronRight className="size-3.5" />
        </Link>
      </div>

      {/* Pathway List Rows */}
      <div className="space-y-2.5">
        {items.map((pathway) => {
          const Icon = pathway.icon;
          return (
            <div
              key={pathway.id}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl bg-white p-3.5 sm:px-4 sm:py-3.5 border border-slate-100/90 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_4px_16px_rgba(0,0,0,0.04)]"
            >
              {/* Left: Icon & Info */}
              <div className="flex items-center gap-3.5">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 text-teal-800">
                  <Icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {pathway.title}
                  </h3>
                  <span className="text-xs font-medium text-slate-400">
                    {pathway.subtitle}
                  </span>
                </div>
              </div>

              {/* Right: Progress bar & Continue button */}
              <div className="flex items-center gap-4 sm:gap-6 justify-between sm:justify-end">
                {/* Progress bar and percentage */}
                <div className="flex items-center gap-3 w-36 sm:w-44">
                  <div className="h-2 flex-1 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-teal-600 transition-all duration-700"
                      style={{ width: `${pathway.progress}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-slate-700 w-8 text-right">
                    {pathway.progress}%
                  </span>
                </div>

                {/* Continue Button */}
                <Link
                  href="/plan"
                  className="rounded-xl border border-slate-200/90 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-colors"
                >
                  Continue
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
