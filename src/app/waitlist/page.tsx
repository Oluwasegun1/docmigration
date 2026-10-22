"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthHeader } from "@/components/layout/AuthHeader";
import { useTranslations } from "@/i18n";

function WaitlistContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const t = useTranslations("auth.waitlist");

  const professionParam = searchParams.get("profession") || "nurse";
  const originParam = searchParams.get("origin") || "NG";
  const destinationParam = searchParams.get("destination") || "CA";

  const [freeTextProfession, setFreeTextProfession] = useState("");
  const [emailConsent, setEmailConsent] = useState(true);
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const displayProfession =
    professionParam.charAt(0).toUpperCase() + professionParam.slice(1);
  const displayOrigin = originParam === "NG" ? "Nigeria" : originParam;
  const displayDestination =
    destinationParam === "CA"
      ? "Canada"
      : destinationParam === "GB"
      ? "United Kingdom"
      : destinationParam;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await fetch("/api/v1/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: "user@example.com",
          professionId: professionParam,
          professionFreeText: freeTextProfession,
          originCountry: originParam,
          destinationCountry: destinationParam,
          consentGranted: emailConsent,
        }),
      });
      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        <AuthHeader onBack={() => router.back()} />

        <div className="space-y-1.5">
          <h1 className="text-[28px] font-bold text-[#11241F] tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-[#4E625A] leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {submitted ? (
          <div className="p-6 rounded-2xl bg-white border border-[#C9D7D1] space-y-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-[#E2ECE7] text-[#164E43] flex items-center justify-center font-bold text-xl">
              ✓
            </div>
            <h3 className="font-bold text-[#11241F] text-lg">
              You&apos;re on the waitlist!
            </h3>
            <p className="text-xs text-[#52665F] leading-relaxed">
              We have noted your interest and will email you as soon as this
              route opens.
            </p>
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => router.push("/dashboard")}
                className="w-full py-3 px-4 rounded-xl bg-[#164E43] hover:bg-[#113E35] text-white text-sm font-semibold transition"
              >
                Go to dashboard
              </button>
              <button
                type="button"
                onClick={() => router.push("/signup/about-you")}
                className="w-full py-3 px-4 rounded-xl border border-[#9EB0A8] text-sm font-semibold text-[#164E43] hover:bg-[#F2F7F4]"
              >
                Back to About you
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Summary details card */}
            <div className="p-4 rounded-2xl border border-[#D1DCD6] bg-white divide-y divide-[#E6EFEA]">
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="text-[#556961]">{t("professionLabel")}</span>
                <span className="font-bold text-[#11241F]">
                  {displayProfession}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="text-[#556961]">{t("trainedInLabel")}</span>
                <span className="font-bold text-[#11241F]">{displayOrigin}</span>
              </div>
              <div className="flex items-center justify-between py-2 text-sm">
                <span className="text-[#556961]">{t("interestedInLabel")}</span>
                <span className="font-bold text-[#11241F]">
                  {displayDestination}
                </span>
              </div>
            </div>

            {/* Optional free-text profession */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#182F28]">
                {t("freeTextLabel")}
              </label>
              <input
                type="text"
                value={freeTextProfession}
                onChange={(e) => setFreeTextProfession(e.target.value)}
                placeholder={t("freeTextPlaceholder")}
                className="w-full px-3.5 py-3 rounded-xl border border-[#C5D3CD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164E43] placeholder-[#879992]"
              />
            </div>

            {/* Consent checkbox */}
            <label className="flex items-start gap-3 cursor-pointer select-none pt-1">
              <input
                type="checkbox"
                required
                checked={emailConsent}
                onChange={(e) => setEmailConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#9CB0A8] text-[#164E43] focus:ring-[#164E43]"
              />
              <span className="text-xs text-[#2A3F38] leading-snug">
                {t("consentLabel")}
              </span>
            </label>

            <div className="space-y-3 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 px-4 rounded-xl bg-[#164E43] hover:bg-[#113E35] disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition"
              >
                {loading ? "Joining..." : t("submitButton")}
              </button>

              <button
                type="button"
                onClick={() => router.push("/signup/about-you")}
                className="w-full py-3.5 px-4 rounded-xl border border-[#9EB0A8] bg-transparent text-[#164E43] hover:bg-[#E8F0EC] font-semibold text-sm transition"
              >
                {t("pickSomethingElse")}
              </button>
            </div>
          </form>
        )}
      </div>

      <div className="w-full max-w-md mx-auto pt-8 text-center">
        <p className="text-xs text-[#637770] leading-relaxed">{t("footer")}</p>
      </div>
    </div>
  );
}

import WaitlistLoading from "./loading";

export default function WaitlistPage() {
  return (
    <Suspense fallback={<WaitlistLoading />}>
      <WaitlistContent />
    </Suspense>
  );
}
