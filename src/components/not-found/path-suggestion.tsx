"use client";

import * as React from "react";
import Link from "next/link";
import { HelpCircle } from "lucide-react";
import { findClosestRoute } from "@/lib/navigation/routes";

const noopSubscribe = () => () => {};

export function PathSuggestion() {
  const pathname = React.useSyncExternalStore(
    noopSubscribe,
    () => (typeof window !== "undefined" ? window.location.pathname : ""),
    () => "",
  );

  const suggestion = React.useMemo(() => {
    if (!pathname) return null;
    return findClosestRoute(pathname);
  }, [pathname]);

  if (!suggestion) return null;

  return (
    <div
      role="region"
      aria-label="Path suggestion"
      className="inline-flex items-center gap-2 rounded-full border border-teal-200 bg-teal-50/80 px-4 py-1.5 text-xs sm:text-sm text-teal-950 shadow-2xs transition-all"
    >
      <HelpCircle className="size-4 shrink-0 text-teal-700" aria-hidden="true" />
      <span>
        Did you mean{" "}
        <Link
          href={suggestion.path}
          className="font-semibold underline decoration-teal-700/60 underline-offset-2 hover:decoration-teal-900 focus-visible:outline-2 focus-visible:outline-teal-700"
        >
          {suggestion.path}
        </Link>
        ?
      </span>
    </div>
  );
}
