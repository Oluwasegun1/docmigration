"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AuthHeader } from "@/components/layout/AuthHeader";
import { StepProgress } from "@/components/layout/StepProgress";
import { useTranslations } from "@/i18n";

export default function CreateAccountPage() {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const t = useTranslations("auth.createAccount");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [researchConsent, setResearchConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!termsAccepted) {
      setError("Please agree to the Terms and Privacy Notice to continue.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          password,
          termsAccepted,
          researchConsent,
        }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || "Failed to create account.");
      }

      router.push(`/auth/check-email?email=${encodeURIComponent(email)}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "An unexpected error occurred.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto space-y-6">
        <AuthHeader rightAction={{ label: t("signInPrompt"), href: "/sign-in" }} />

        <StepProgress currentStep={1} label={t("step")} />

        <div className="space-y-1.5">
          <h1 className="text-[28px] font-bold text-[#11241F] tracking-tight">
            {t("title")}
          </h1>
          <p className="text-sm text-[#4E625A] leading-relaxed">
            {t("subtitle")}
          </p>
        </div>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-[#182F28]">
              {t("nameLabel")}
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("namePlaceholder")}
              className="w-full px-3.5 py-3 rounded-xl border border-[#C5D3CD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164E43] focus:border-transparent placeholder-[#879992]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-[#182F28]">
              {t("emailLabel")}
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("emailPlaceholder")}
              className="w-full px-3.5 py-3 rounded-xl border border-[#C5D3CD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164E43] focus:border-transparent placeholder-[#879992]"
            />
          </div>

          <div className="space-y-1.5">
            <label className="block text-sm font-semibold text-[#182F28]">
              {t("passwordLabel")}
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                minLength={10}
                maxLength={64}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-3 pr-16 rounded-xl border border-[#C5D3CD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164E43] focus:border-transparent"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#164E43] hover:underline"
              >
                {showPassword ? tCommon("hide") : tCommon("show")}
              </button>
            </div>
            <p className="text-xs text-[#526860] leading-relaxed pt-1">
              {t("passwordHint")}
            </p>
          </div>

          <div className="pt-2 space-y-3">
            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#9CB0A8] text-[#164E43] focus:ring-[#164E43]"
              />
              <span className="text-xs text-[#2A3F38] leading-snug">
                I agree to the{" "}
                <span className="underline font-medium text-[#164E43]">Terms</span>{" "}
                and have read the{" "}
                <span className="underline font-medium text-[#164E43]">
                  Privacy Notice
                </span>
                .
              </span>
            </label>

            <label className="flex items-start gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={researchConsent}
                onChange={(e) => setResearchConsent(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-[#9CB0A8] text-[#164E43] focus:ring-[#164E43]"
              />
              <span className="text-xs text-[#2A3F38] leading-snug">
                {t("researchConsentLabel")}
              </span>
            </label>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 rounded-xl bg-[#164E43] hover:bg-[#113E35] disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition"
          >
            {loading ? "Creating account..." : t("submitButton")}
          </button>
        </form>

        <div className="pt-4 space-y-3 text-xs text-[#637770] leading-relaxed">
          <p>{t("disclaimer1")}</p>
          <p>{t("disclaimer2")}</p>
        </div>
      </div>
    </div>
  );
}
