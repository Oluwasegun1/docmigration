import { AuthHeader } from "@/components/layout/AuthHeader";

export default function WaitlistLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6"
    >
      <div className="w-full max-w-md mx-auto space-y-6 animate-pulse">
        <AuthHeader />

        <div className="space-y-3 pt-2">
          <div className="h-8 w-64 rounded-lg bg-[#E2ECE7]" />
          <div className="h-4 w-full rounded bg-[#E2ECE7]/60" />
        </div>

        <div className="h-10 w-44 rounded-full bg-[#E2ECE7]/70" />

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <div className="h-4 w-32 rounded bg-[#E2ECE7]/70" />
            <div className="h-12 w-full rounded-xl border border-[#C5D3CD]/70 bg-white" />
          </div>

          <div className="flex items-center gap-2">
            <div className="size-4 rounded bg-[#E2ECE7]" />
            <div className="h-3 w-52 rounded bg-[#E2ECE7]/60" />
          </div>

          <div className="space-y-3 pt-2">
            <div className="h-12 w-full rounded-xl bg-[#164E43]/20" />
            <div className="h-12 w-full rounded-xl border border-[#9EB0A8]/40 bg-white/50" />
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto pt-8 text-center">
        <div className="h-3 w-48 rounded bg-[#E2ECE7]/60 mx-auto" />
      </div>

      <span className="sr-only">Loading waitlist form...</span>
    </div>
  );
}
