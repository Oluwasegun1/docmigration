import { AuthHeader } from "@/components/layout/AuthHeader";

export default function ResetPasswordLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6"
    >
      <div className="w-full max-w-md mx-auto space-y-6 animate-pulse">
        <AuthHeader />

        <div className="space-y-2 pt-2">
          <div className="h-8 w-60 rounded-lg bg-[#E2ECE7]" />
          <div className="h-4 w-72 rounded bg-[#E2ECE7]/60" />
        </div>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <div className="h-4 w-28 rounded bg-[#E2ECE7]/70" />
            <div className="h-12 w-full rounded-xl border border-[#C5D3CD]/70 bg-white" />
          </div>

          <div className="space-y-1.5">
            <div className="h-4 w-36 rounded bg-[#E2ECE7]/70" />
            <div className="h-12 w-full rounded-xl border border-[#C5D3CD]/70 bg-white" />
          </div>

          <div className="h-12 w-full rounded-xl bg-[#164E43]/20 mt-4" />
        </div>

        <div className="h-3 w-28 rounded bg-[#E2ECE7]/60 mx-auto" />
      </div>

      <span className="sr-only">Loading password reset form...</span>
    </div>
  );
}
