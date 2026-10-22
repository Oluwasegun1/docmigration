"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { AuthHeader } from "@/components/layout/AuthHeader";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"verifying" | "success" | "error">("verifying");
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setErrorMessage("No verification token was provided.");
      return;
    }

    async function verify() {
      try {
        const res = await fetch("/api/v1/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error?.message || "Verification link is invalid or expired.");
        }

        setStatus("success");
        setTimeout(() => {
          router.push(body.data?.nextStep || "/signup/about-you");
        }, 1200);
      } catch (err: unknown) {
        setStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Failed to verify email.");
      }
    }

    verify();
  }, [token, router]);

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        <AuthHeader />

        <div className="p-8 rounded-2xl bg-white border border-[#D5DFDA] text-center space-y-4 shadow-sm">
          {status === "verifying" && (
            <div className="space-y-3">
              <Loader2 className="w-10 h-10 animate-spin text-[#164E43] mx-auto" />
              <h1 className="text-xl font-bold text-[#11241F]">Verifying your email...</h1>
              <p className="text-sm text-[#4E625A]">Please wait while we confirm your account and sign you in.</p>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#E2ECE7] text-[#164E43] flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-[#11241F]">Email Confirmed!</h1>
              <p className="text-sm text-[#4E625A]">Taking you to the next step...</p>
            </div>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-700 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <h1 className="text-xl font-bold text-[#11241F]">Verification Failed</h1>
              <p className="text-sm text-red-700">{errorMessage}</p>
              <div className="pt-2">
                <Link
                  href="/create-account"
                  className="inline-block py-2.5 px-4 rounded-xl bg-[#164E43] hover:bg-[#113E35] text-white text-sm font-semibold transition"
                >
                  Request a new link
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import VerifyEmailLoading from "./loading";

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<VerifyEmailLoading />}>
      <VerifyEmailContent />
    </Suspense>
  );
}
