import { AuthHeader } from "@/components/layout/AuthHeader";
import { Mail } from "lucide-react";

export default function CheckEmailLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6"
    >
      <div className="w-full max-w-md mx-auto space-y-7 animate-pulse">
        <AuthHeader />

        <div className="space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#E2ECE7] flex items-center justify-center text-[#164E43]/40">
            <Mail className="w-7 h-7 stroke-[1.8]" />
          </div>

          <div className="space-y-2">
            <div className="h-8 w-56 rounded-lg bg-[#E2ECE7]" />
            <div className="h-4 w-full rounded bg-[#E2ECE7]/70" />
            <div className="h-4 w-3/4 rounded bg-[#E2ECE7]/60" />
          </div>

          <div className="h-3 w-4/5 rounded bg-[#E2ECE7]/50" />

          <div className="pt-2 space-y-3">
            <div className="h-12 w-full rounded-xl bg-[#164E43]/20" />
            <div className="h-11 w-full rounded-xl border border-[#D5DFDA] bg-white/60" />
          </div>

          <div className="p-4 rounded-2xl border border-[#D5DFDA] bg-white/60 space-y-2">
            <div className="h-3 w-32 rounded bg-[#E2ECE7]" />
            <div className="h-3 w-full rounded bg-[#E2ECE7]/50" />
          </div>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto pt-8 text-center">
        <div className="h-3 w-48 rounded bg-[#E2ECE7]/60 mx-auto" />
      </div>

      <span className="sr-only">Loading email confirmation...</span>
    </div>
  );
}
