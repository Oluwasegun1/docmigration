import { AuthHeader } from "@/components/layout/AuthHeader";
import { Loader2 } from "lucide-react";

export default function VerifyEmailLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6"
    >
      <div className="w-full max-w-md mx-auto space-y-6">
        <AuthHeader />

        <div className="p-8 rounded-2xl bg-white border border-[#D5DFDA] text-center space-y-4 shadow-sm animate-pulse">
          <div className="w-12 h-12 rounded-full bg-[#E2ECE7] flex items-center justify-center mx-auto text-[#164E43]">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
          <div className="h-6 w-48 rounded-lg bg-[#E2ECE7] mx-auto" />
          <div className="h-4 w-64 rounded bg-[#E2ECE7]/60 mx-auto" />
        </div>
      </div>

      <span className="sr-only">Verifying your email...</span>
    </div>
  );
}
