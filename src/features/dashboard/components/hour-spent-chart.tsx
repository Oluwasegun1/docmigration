"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";

export function HourSpentChart() {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100/90 h-full">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Preparation Time</h2>
          <span className="text-xs font-medium text-slate-400">126h 48m total recorded</span>
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs"
        >
          <span>Last 7 days</span>
          <ChevronDown className="size-3 text-slate-400" />
        </button>
      </div>

      {/* Interactive Chart Canvas */}
      <div className="relative mt-4 w-full">
        <svg
          viewBox="0 0 520 180"
          className="w-full h-44 overflow-visible"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Soft area gradient under the wave */}
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0f766e" stopOpacity="0.2" />
              <stop offset="85%" stopColor="#0f766e" stopOpacity="0.0" />
            </linearGradient>

            {/* Vertical column highlight for Friday */}
            <linearGradient id="fridayColGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f0fdfa" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#f0fdfa" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {/* Friday vertical highlight pillar */}
          <rect
            x="345"
            y="25"
            width="32"
            height="115"
            rx="16"
            fill="url(#fridayColGradient)"
          />

          {/* Area fill under curve */}
          <path
            d="M 20 100 
               C 60 70, 90 40, 130 50 
               C 170 60, 200 115, 245 105 
               C 285 95, 320 20, 361 40 
               C 395 55, 420 115, 460 95 
               C 485 85, 500 100, 510 105 
               L 510 140 L 20 140 Z"
            fill="url(#areaGradient)"
          />

          {/* Main Spline Curve */}
          <path
            d="M 20 100 
               C 60 70, 90 40, 130 50 
               C 170 60, 200 115, 245 105 
               C 285 95, 320 20, 361 40 
               C 395 55, 420 115, 460 95 
               C 485 85, 500 100, 510 105"
            stroke="#0f766e"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />

          {/* Active Highlighted Point on Friday (x: 361, y: 40) */}
          <circle cx="361" cy="40" r="7" fill="#0f766e" fillOpacity="0.2" />
          <circle cx="361" cy="40" r="4.5" fill="#0f766e" stroke="#ffffff" strokeWidth="2" />

          {/* Floating Tooltip Bubble directly above the point */}
          <g transform="translate(361, 22)">
            {/* Tooltip Background Capsule */}
            <rect
              x="-68"
              y="-32"
              width="136"
              height="28"
              rx="14"
              fill="#0f172a"
              className="drop-shadow-md"
            />
            {/* Tooltip caret */}
            <polygon points="-4,-4 4,-4 0,0" fill="#0f172a" />
            
            {/* Icon & Text inside bubble */}
            <circle cx="-50" cy="-18" r="5" fill="#0f766e" />
            <text
              x="-50"
              y="-15.5"
              textAnchor="middle"
              className="fill-white font-mono text-[7px]"
            >
              ✓
            </text>
            <text
              x="-38"
              y="-21"
              className="fill-slate-300 font-sans text-[7.5px] font-medium"
            >
              Friday 16 Oct, 2026
            </text>
            <text
              x="-38"
              y="-11"
              className="fill-white font-sans text-[9px] font-bold"
            >
              2h 15m · PLAB 1 Prep
            </text>
          </g>
        </svg>

        {/* X-Axis Day Labels */}
        <div className="grid grid-cols-7 text-center text-xs font-medium text-slate-400 mt-1">
          {days.map((day, idx) => (
            <span
              key={day}
              className={idx === 4 ? "font-bold text-teal-800" : ""}
            >
              {day}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
