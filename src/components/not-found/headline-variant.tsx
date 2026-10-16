"use client";

import * as React from "react";

const DEFAULT_LINE =
  "The page may have moved, the link may be out of date, or the address may have a typo.";

const VARIANTS = [
  "Even well-planned routes have a wrong turn. Let's get you back on one.",
  "This path doesn't lead anywhere yet, but yours still does.",
  "Nothing is lost. Only this link is broken.",
] as const;

let chosenVariant: string | null = null;
function getClientVariant(): string {
  if (!chosenVariant) {
    chosenVariant = VARIANTS[Math.floor(Math.random() * VARIANTS.length)];
  }
  return chosenVariant;
}

const noopSubscribe = () => () => {};

export function HeadlineVariant() {
  const line = React.useSyncExternalStore(
    noopSubscribe,
    getClientVariant,
    () => DEFAULT_LINE,
  );

  return (
    <p className="mx-auto max-w-xl text-base sm:text-lg text-slate-600 transition-opacity duration-300">
      {line}
    </p>
  );
}
