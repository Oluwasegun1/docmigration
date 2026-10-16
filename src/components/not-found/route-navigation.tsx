"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Compass, MapPin, LayoutDashboard, HelpCircle } from "lucide-react";
import { VERIFIED_PUBLIC_ROUTES } from "@/lib/navigation/routes";

export function RouteNavigation() {
  const [tappedMissing, setTappedMissing] = React.useState(false);
  const [wobble, setWobble] = React.useState(false);

  const handleTapMissing = () => {
    setWobble(true);
    setTappedMissing(true);
    // 400ms finite wobble as per spec
    setTimeout(() => setWobble(false), 400);
  };

  const stopIcons = [
    <Compass key="home" className="size-4 text-teal-800" aria-hidden="true" />,
    <MapPin key="dest" className="size-4 text-teal-800" aria-hidden="true" />,
    <LayoutDashboard key="dash" className="size-4 text-teal-800" aria-hidden="true" />,
  ];

  return (
    <nav
      aria-label="Helpful pages"
      className="w-full max-w-3xl mx-auto px-4 sm:px-6"
    >
      <div className="mb-6 text-center">
        <h2 className="text-base sm:text-lg font-semibold text-slate-900">
          Where would you like to go?
        </h2>
        <p className="mt-1 text-xs sm:text-sm text-slate-500">
          Pick any verified pathway below to get moving again.
        </p>
      </div>

      {/* DESKTOP & TABLET: Horizontal Route & Stops (hidden on small phone) */}
      <div className="hidden md:block relative pt-4 pb-8">
        {/* Decorative Inline SVG Route Track (aria-hidden) */}
        <div className="relative w-full h-24" aria-hidden="true">
          <svg
            viewBox="0 0 720 80"
            className="w-full h-full overflow-visible"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <defs>
              {/* Mask that draws the dotted line from left to right */}
              <mask id="desktop-route-mask">
                <path
                  d="M 32 40 C 180 40, 240 70, 390 40 S 580 10, 688 40"
                  stroke="white"
                  strokeWidth="8"
                  fill="none"
                  pathLength="1"
                  strokeDasharray="1"
                  strokeDashoffset="0"
                  className="animate-notfound-route"
                />
              </mask>
            </defs>

            {/* Dotted pathway with theme colors */}
            <path
              d="M 32 40 C 180 40, 240 70, 390 40 S 580 10, 688 40"
              stroke="#0f766e"
              strokeWidth="2.5"
              strokeDasharray="4 6"
              strokeLinecap="round"
              mask="url(#desktop-route-mask)"
              className="opacity-70"
            />

            {/* Static background shadow guide */}
            <path
              d="M 32 40 C 180 40, 240 70, 390 40 S 580 10, 688 40"
              stroke="#cbd5e1"
              strokeWidth="1.5"
              strokeDasharray="2 6"
              className="opacity-40"
            />

            {/* Traveller Dot with Soft Halo */}
            <g className="animate-notfound-traveller-h">
              {/* Halo */}
              <circle cx="640" cy="40" r="10" className="fill-teal-500/20" />
              {/* Core dot */}
              <circle cx="640" cy="40" r="5" className="fill-teal-700 stroke-white" strokeWidth="2" />
            </g>
          </svg>
        </div>

        {/* Real Links as Stops along the horizontal route */}
        <ol className="grid grid-cols-4 gap-4 -mt-16 relative z-10">
          {VERIFIED_PUBLIC_ROUTES.map((route, index) => {
            const stopAnimationClasses = [
              "animate-notfound-stop-1",
              "animate-notfound-stop-2",
              "animate-notfound-stop-3",
            ];
            return (
              <li key={route.path} className={stopAnimationClasses[index]}>
                <Link
                  href={route.path}
                  className="group flex flex-col items-center text-center p-3 rounded-xl bg-white border border-slate-200/90 shadow-2xs transition-all duration-150 motion-safe:hover:-translate-y-0.5 hover:border-teal-700/60 hover:shadow-xs focus-visible:outline-2 focus-visible:outline-teal-700"
                >
                  <div className="flex size-11 items-center justify-center rounded-full bg-teal-50 border border-teal-200 group-hover:bg-teal-100/70 group-hover:border-teal-500 transition-colors">
                    {stopIcons[index]}
                  </div>
                  <span className="mt-2 text-sm font-semibold text-slate-800 group-hover:text-teal-900 group-hover:underline underline-offset-4">
                    {route.label}
                  </span>
                  <span className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                    {route.description}
                  </span>
                </Link>
              </li>
            );
          })}

          {/* 4th stop: Missing destination */}
          <li className="animate-notfound-stop-3">
            <button
              type="button"
              onClick={handleTapMissing}
              aria-label="Missing destination: Not on the map"
              className={`w-full group flex flex-col items-center text-center p-3 rounded-xl bg-slate-50/80 border border-dashed border-slate-300 transition-all duration-150 motion-safe:hover:-translate-y-0.5 hover:border-slate-500 focus-visible:outline-2 focus-visible:outline-teal-700 ${
                wobble ? "animate-notfound-wobble" : ""
              }`}
            >
              <div className="relative flex size-11 items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-white group-hover:border-slate-600 animate-notfound-pulse">
                <span className="font-mono text-sm font-bold text-slate-500">?</span>
              </div>
              <span className="mt-2 text-sm font-semibold text-slate-500 group-hover:text-slate-700">
                Not on the map
              </span>
              <span className="text-xs text-slate-400 mt-0.5">
                Route ends here
              </span>
            </button>
          </li>
        </ol>
      </div>

      {/* MOBILE: Vertical Route & Stops (<768px) */}
      <div className="block md:hidden relative">
        <div className="relative pl-10">
          {/* Vertical Inline SVG line running down the left */}
          <div className="absolute left-3.5 top-3 bottom-6 w-6 pointer-events-none" aria-hidden="true">
            <svg
              viewBox="0 0 24 380"
              className="w-full h-full"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="mobile-route-mask">
                  <path
                    d="M 12 10 L 12 360"
                    stroke="white"
                    strokeWidth="6"
                    pathLength="1"
                    strokeDasharray="1"
                    strokeDashoffset="0"
                    className="animate-notfound-route"
                  />
                </mask>
              </defs>
              <path
                d="M 12 10 L 12 360"
                stroke="#0f766e"
                strokeWidth="2.5"
                strokeDasharray="4 6"
                strokeLinecap="round"
                mask="url(#mobile-route-mask)"
                className="opacity-70"
              />
              <g className="animate-notfound-traveller-v">
                <circle cx="12" cy="330" r="8" className="fill-teal-500/20" />
                <circle cx="12" cy="330" r="4.5" className="fill-teal-700 stroke-white" strokeWidth="2" />
              </g>
            </svg>
          </div>

          <ol className="space-y-3">
            {VERIFIED_PUBLIC_ROUTES.map((route, index) => {
              const stopAnimationClasses = [
                "animate-notfound-stop-1",
                "animate-notfound-stop-2",
                "animate-notfound-stop-3",
              ];
              return (
                <li key={route.path} className={`relative ${stopAnimationClasses[index]}`}>
                  <Link
                    href={route.path}
                    className="group flex items-center justify-between min-h-[48px] p-3 rounded-lg bg-white border border-slate-200 shadow-2xs hover:border-teal-700/60 active:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-teal-50 border border-teal-200">
                        {stopIcons[index]}
                      </div>
                      <div className="text-left">
                        <div className="text-sm font-semibold text-slate-900 group-hover:text-teal-900 group-hover:underline underline-offset-2">
                          {route.label}
                        </div>
                        <div className="text-xs text-slate-500">
                          {route.description}
                        </div>
                      </div>
                    </div>
                    <ArrowRight className="size-4 text-slate-400 group-hover:text-teal-800 shrink-0 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                  </Link>
                </li>
              );
            })}

            {/* Mobile 4th stop: Missing Destination */}
            <li className="relative animate-notfound-stop-3">
              <button
                type="button"
                onClick={handleTapMissing}
                aria-label="Missing destination: Not on the map"
                className={`w-full group flex items-center justify-between min-h-[48px] p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 hover:border-slate-400 active:bg-slate-100 focus-visible:outline-2 focus-visible:outline-teal-700 transition-all ${
                  wobble ? "animate-notfound-wobble" : ""
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="relative flex size-9 shrink-0 items-center justify-center rounded-full border-2 border-dashed border-slate-400 bg-white animate-notfound-pulse">
                    <span className="font-mono text-xs font-bold text-slate-500">?</span>
                  </div>
                  <div className="text-left">
                    <div className="text-sm font-semibold text-slate-600">
                      Not on the map
                    </div>
                    <div className="text-xs text-slate-400">
                      Route ends here
                    </div>
                  </div>
                </div>
                <HelpCircle className="size-4 text-slate-400 shrink-0" aria-hidden="true" />
              </button>
            </li>
          </ol>
        </div>
      </div>

      {/* Polite Live Region for Missing Destination Tap Feedback */}
      <div
        role="status"
        aria-live="polite"
        className="mt-3 text-center min-h-[22px]"
      >
        {tappedMissing && (
          <span className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium text-teal-900 bg-teal-50 border border-teal-200 px-3 py-1 rounded-full">
            <HelpCircle className="size-3.5 text-teal-700" aria-hidden="true" />
            That one isn&apos;t on the map yet.
          </span>
        )}
      </div>
    </nav>
  );
}
