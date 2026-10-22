"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AuthHeader } from "@/components/layout/AuthHeader";
import { useTranslations } from "@/i18n";

export default function SignInPage() {
  const router = useRouter();
  const tCommon = useTranslations("common");
  const t = useTranslations("auth.signIn");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.error?.message || t("errorUnknown"));
      }

      router.push("/dashboard");
    } catch {
      setError(t("errorUnknown")); // ENUMERATION SAFE
    } finally {
      setLoading(false);
    }
  };

  const handleSimulateError = () => {
    setError(t("errorUnknown"));
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

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-sm text-red-800 animate-fadeIn">
            {error}
          </div>
        )}

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
              placeholder={t("emailPlaceholder")}
              className="w-full px-3.5 py-3 rounded-xl border border-[#C5D3CD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164E43] placeholder-[#879992]"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="block text-sm font-semibold text-[#182F28]">
                {t("passwordLabel")}
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-[#164E43] hover:underline"
              >
                {t("forgotPassword")}
              </Link>
            </div>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3.5 py-3 pr-16 rounded-xl border border-[#C5D3CD] bg-white text-sm focus:outline-none focus:ring-2 focus:ring-[#164E43]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#164E43] hover:underline"
              >
                {showPassword ? tCommon("hide") : tCommon("show")}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-3.5 px-4 rounded-xl bg-[#164E43] hover:bg-[#113E35] disabled:opacity-50 text-white font-semibold text-sm shadow-sm transition"
          >
            {loading ? "Signing in..." : t("submitButton")}
          </button>
        </form>

        {/* Prototype action to trigger sign-in error demonstration */}
        <div className="pt-2 text-center">
          <button
            type="button"
            onClick={handleSimulateError}
            className="text-xs text-[#526860] hover:text-[#164E43] underline"
          >
            Trigger sign-in error demo
          </button>
        </div>

        <div className="text-center pt-2">
          <p className="text-sm text-[#4E625A]">
            {t("noAccountPrompt")}{" "}
            <Link
              href="/create-account"
              className="font-semibold text-[#164E43] underline hover:text-[#113E35]"
            >
              {t("signUpLink")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
