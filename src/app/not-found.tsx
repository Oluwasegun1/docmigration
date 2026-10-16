import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Compass404 } from "@/components/not-found/compass-404";
import { HeadlineVariant } from "@/components/not-found/headline-variant";
import { GoBackButton } from "@/components/not-found/go-back-button";
import { PathSuggestion } from "@/components/not-found/path-suggestion";
import { RouteNavigation } from "@/components/not-found/route-navigation";
import { ParallaxContainer } from "@/components/not-found/parallax-container";

export const metadata: Metadata = {
  title: "Page not found",
  robots: {
    index: false,
    follow: false,
  },
};

// Copy strings constants for internationalisation portability
export const NOT_FOUND_COPY = {
  brand: "Healthcare Migration Hub",
  headline: "We couldn't find that page.",
  defaultSupport:
    "The page may have moved, the link may be out of date, or the address may have a typo.",
  primaryAction: "Back to Home",
  secondaryAction: "Go Back",
  stopsHeading: "Where would you like to go?",
  missingDestination: "Not on the map",
  tapMessage: "That one isn't on the map yet.",
} as const;

export default function NotFound() {
  return (
    <main
      id="main"
      className="relative flex min-h-dvh flex-col justify-between bg-surface px-4 py-8 sm:px-6 sm:py-12 text-slate-900"
    >
      {/* 1. Header with existing logo / wordmark linked to homepage */}
      <header className="mx-auto w-full max-w-4xl flex items-center justify-between pb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm sm:text-base font-semibold text-slate-900 hover:text-teal-800 transition-colors focus-visible:outline-2 focus-visible:outline-teal-700 rounded-md p-1 -m-1"
        >
          <div className="flex size-7 items-center justify-center rounded-md bg-teal-700 text-white">
            <Compass className="size-4" aria-hidden="true" />
          </div>
          <span>{NOT_FOUND_COPY.brand}</span>
        </Link>
      </header>

      {/* Main Content Card (centred column of ~720px with generous whitespace) */}
      <ParallaxContainer className="mx-auto w-full max-w-2xl text-center py-6 sm:py-10">
        {/* 2. Large 404 with Compass zero */}
        <div className="mb-4 sm:mb-6">
          <Compass404 />
        </div>

        {/* 3. Headline & Support Line */}
        <div className="space-y-3 px-2">
          <h1 className="animate-notfound-fade-1 text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-slate-900">
            {NOT_FOUND_COPY.headline}
          </h1>

          <div className="animate-notfound-fade-2 min-h-[44px]">
            <HeadlineVariant />
          </div>
        </div>

        {/* Did-you-mean suggestion (safe client match based on window.location.pathname) */}
        <div className="mt-4 min-h-[30px]">
          <PathSuggestion />
        </div>

        {/* 4. Action Buttons: Primary (Back to Home) and Secondary (Go Back) */}
        <div className="animate-notfound-fade-3 mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 max-w-sm sm:max-w-md mx-auto">
          <Button
            asChild
            size="lg"
            className="w-full sm:w-auto min-h-[44px] group shadow-sm transition-all motion-safe:active:scale-[0.98]"
          >
            <Link href="/" className="inline-flex items-center justify-center gap-2">
              <span>{NOT_FOUND_COPY.primaryAction}</span>
              <ArrowRight
                className="size-4 transition-transform motion-safe:group-hover:translate-x-[3px]"
                aria-hidden="true"
              />
            </Link>
          </Button>

          <div className="w-full sm:w-auto">
            <GoBackButton />
          </div>
        </div>
      </ParallaxContainer>

      {/* 5. Dotted Route & Stops Navigation */}
      <section className="mx-auto w-full max-w-3xl pt-4 pb-6">
        <RouteNavigation />
      </section>

      {/* Footer reassurance / reassurance banner */}
      <footer className="mx-auto w-full max-w-4xl border-t border-slate-100 pt-4 text-center text-xs text-slate-400">
        <span>Healthcare Migration Hub · Standard Medical Registration Pathways</span>
      </footer>
    </main>
  );
}
