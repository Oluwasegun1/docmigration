import * as React from "react";

export function PerformanceGauge() {
  const percentage = 72;
  const radius = 68;
  const strokeWidth = 14;
  const arcLength = Math.PI * radius; // Half circumference
  const strokeDashoffset = arcLength - (arcLength * percentage) / 100;

  return (
    <div className="flex flex-col justify-between rounded-2xl bg-white p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] border border-slate-100/90 h-full">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-slate-900">Readiness Score</h2>
      </div>

      {/* Radial Semi-Circle Gauge */}
      <div className="flex flex-col items-center justify-center my-auto pt-3">
        <div className="relative flex items-center justify-center">
          <svg
            viewBox="0 0 180 100"
            className="w-48 h-28 overflow-visible"
            fill="none"
          >
            {/* Background semi-circle track */}
            <path
              d="M 22 90 A 68 68 0 0 1 158 90"
              stroke="#e2e8f0"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              fill="none"
            />
            {/* Active progress arc (72%) */}
            <path
              d="M 22 90 A 68 68 0 0 1 158 90"
              stroke="#0f766e"
              strokeWidth={strokeWidth}
              strokeDasharray={arcLength}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="none"
              className="transition-all duration-1000 ease-out"
            />
          </svg>

          {/* Centered Percentage & Label */}
          <div className="absolute bottom-1 text-center">
            <span className="text-2xl font-black tracking-tight text-slate-900">
              {percentage}%
            </span>
            <span className="block text-[11px] font-medium text-slate-400 -mt-0.5">
              Pathway Readiness
            </span>
          </div>
        </div>

        {/* Motivational Status Line */}
        <p className="mt-3 text-xs font-medium text-slate-500 text-center">
          Your migration readiness is almost ready!
        </p>
      </div>

      {/* Action Button */}
      <div className="pt-3">
        <button
          type="button"
          className="w-full rounded-xl bg-teal-700 px-4 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-xs transition-colors hover:bg-teal-800 active:scale-[0.99]"
        >
          View Assessment
        </button>
      </div>
    </div>
  );
}
