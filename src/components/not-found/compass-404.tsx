import * as React from "react";

export function Compass404() {
  return (
    <div
      className="flex items-center justify-center select-none"
      aria-hidden="true"
    >
      <div className="flex items-center gap-1 sm:gap-2">
        {/* Left "4" */}
        <span className="font-mono text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-slate-800">
          4
        </span>

        {/* Compass as "0" */}
        <div className="relative flex size-20 sm:size-24 md:size-28 items-center justify-center">
          <svg
            viewBox="0 0 100 100"
            className="size-full overflow-visible drop-shadow-xs"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            {/* Outer dial ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-slate-200 fill-slate-50/60"
              strokeWidth="2"
            />
            {/* Inner dashed ring */}
            <circle
              cx="50"
              cy="50"
              r="38"
              className="stroke-teal-700/30"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />

            {/* Cardinal tick marks */}
            {/* North */}
            <line x1="50" y1="8" x2="50" y2="15" className="stroke-teal-800" strokeWidth="2" strokeLinecap="round" />
            {/* South */}
            <line x1="50" y1="85" x2="50" y2="92" className="stroke-slate-400" strokeWidth="1.5" strokeLinecap="round" />
            {/* East */}
            <line x1="85" y1="50" x2="92" y2="50" className="stroke-slate-400" strokeWidth="1.5" strokeLinecap="round" />
            {/* West */}
            <line x1="8" y1="50" x2="15" y2="50" className="stroke-slate-400" strokeWidth="1.5" strokeLinecap="round" />

            {/* Subtle cardinal labels */}
            <text x="50" y="24" textAnchor="middle" className="fill-teal-800 font-sans text-[8px] font-bold">N</text>
            <text x="50" y="82" textAnchor="middle" className="fill-slate-400 font-sans text-[7px] font-medium">S</text>
            <text x="78" y="52.5" textAnchor="middle" className="fill-slate-400 font-sans text-[7px] font-medium">E</text>
            <text x="22" y="52.5" textAnchor="middle" className="fill-slate-400 font-sans text-[7px] font-medium">W</text>

            {/* Compass Needle - swinging from 0deg and settling at 220deg pointing home */}
            <g
              className="animate-notfound-compass"
              style={{
                transform: "rotate(220deg)",
                transformOrigin: "50px 50px",
              }}
            >
              {/* North Pointer (Teal - active pointer) */}
              <polygon
                points="50,16 54.5,50 50,47 45.5,50"
                className="fill-teal-700 filter drop-shadow-xs"
              />
              {/* South Pointer (Muted) */}
              <polygon
                points="50,84 54.5,50 50,47 45.5,50"
                className="fill-slate-300"
              />
              {/* Needle center ridge for 3D bevel look */}
              <polygon points="50,16 50,47 45.5,50" className="fill-teal-800/30" />
              <polygon points="50,84 50,47 45.5,50" className="fill-slate-400/30" />

              {/* Center pivot pin */}
              <circle cx="50" cy="50" r="4.5" className="fill-white stroke-teal-800" strokeWidth="2" />
              <circle cx="50" cy="50" r="1.5" className="fill-teal-800" />
            </g>
          </svg>
        </div>

        {/* Right "4" */}
        <span className="font-mono text-7xl sm:text-8xl md:text-9xl font-black tracking-tighter text-slate-800">
          4
        </span>
      </div>
    </div>
  );
}
