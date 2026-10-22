"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthHeader } from "@/components/layout/AuthHeader";
import { useTranslations } from "@/i18n";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/v1/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true); // Always identical confirmation!
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        <AuthHeader />

        <div className="space-y-1.5 pt-2">
          <h1 className="text-[28px] font-bold text-[#11241F] tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-[#4E625A] leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {submitted ? (
          <div className="p-5 rounded-2xl bg-white border border-[#D5DFDA] space-y-3">
            <h3 className="text-sm font-bold text-[#11241F]">
              {t("confirmationTitle")}
            </h3>
            <p className="text-xs text-[#52665F] leading-relaxed">
              {t("confirmationBody")}
            </p>
            <div className="pt-2">
              <Link
                href="/sign-in"
                className="text-xs font-semibold text-[#164E43] underline hover:text-[#113E35]"
              >
                {t("backToSignIn")}
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-sm font-semibold text-[#182F28]">
                {t("emailLabel")}
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full px-3.5 py-3 rounded-xl border border-[#C5D3CD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164E43]"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 py-3.5 px-4 rounded-xl bg-[#164E43] hover:bg-[#113E35] disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition"
            >
              {loading ? "Sending..." : t("submitButton")}
            </button>

            <div className="text-center pt-2">
              <Link
                href="/sign-in"
                className="text-xs font-semibold text-[#164E43] underline hover:text-[#113E35]"
              >
                {t("backToSignIn")}
              </Link>
            </div>
          </form>
        )}

        {/* Prototype action to trigger the identical confirmation demo */}
        {!submitted && (
          <div className="pt-2 text-center">
            <button
              type="button"
              onClick={() => setSubmitted(true)}
              className="text-xs text-[#526860] hover:text-[#164E43] underline"
            >
              Trigger identical forgot-password confirmation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
