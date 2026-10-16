"use client";

import * as React from "react";
import { HelpCircle } from "lucide-react";

export function MissingDestinationTap() {
  const [tapped, setTapped] = React.useState(false);
  const [wobble, setWobble] = React.useState(false);

  const handleTap = () => {
    setWobble(true);
    setTapped(true);
    setTimeout(() => setWobble(false), 400);
  };

  return (
    <div className="flex flex-col items-center">
      <button
        type="button"
        onClick={handleTap}
        aria-label="Missing destination: Not on the map"
        className={`group relative flex size-12 items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-slate-50 text-slate-500 transition-all hover:border-slate-600 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-teal-700 ${
          wobble ? "motion-safe:animate-wobble" : ""
        }`}
      >
        <span className="font-mono text-base font-bold">?</span>
        <span className="absolute -bottom-6 whitespace-nowrap text-[11px] font-medium text-slate-400 group-hover:text-slate-600">
          Not on map
        </span>
      </button>

      {/* Polite status message */}
      <div
        role="status"
        aria-live="polite"
        className="min-h-[24px] pt-7 text-xs font-medium text-slate-500"
      >
        {tapped && (
          <span className="inline-flex items-center gap-1.5 text-teal-800">
            <HelpCircle className="size-3.5" aria-hidden />
            <span>That one isn&apos;t on the map yet.</span>
          </span>
        )}
      </div>
    </div>
  );
}
