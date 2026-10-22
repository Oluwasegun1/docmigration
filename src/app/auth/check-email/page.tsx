"use client";

import { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Mail } from "lucide-react";
import { AuthHeader } from "@/components/layout/AuthHeader";
import { brand } from "@/config/brand";
import { useTranslations } from "@/i18n";

function CheckEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "you@example.com";
  const t = useTranslations("auth.checkEmail");

  const [countdown, setCountdown] = useState(30);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const maskEmail = (raw: string) => {
    const [local, domain] = raw.split("@");
    if (!local || !domain) return raw;
    return `${local[0]}•••@${domain}`;
  };

  const formattedCountdown = `0:${countdown < 10 ? `0${countdown}` : countdown}`;

  return (
    <div className="min-h-screen bg-[#F8FAF9] text-[#1E2925] flex flex-col justify-between p-4 sm:p-6">
      <div className="w-full max-w-md mx-auto space-y-7">
        <AuthHeader />

        <div className="space-y-5">
          <div className="w-14 h-14 rounded-2xl bg-[#E2ECE7] flex items-center justify-center text-[#164E43]">
            <Mail className="w-7 h-7 stroke-[1.8]" />
          </div>

          <h1 className="text-[30px] font-bold text-[#11241F] tracking-tight">
            {t("title")}
          </h1>

          <p className="text-sm text-[#3E534B] leading-relaxed">
            {t("bodyPre")}{" "}
            <strong className="font-semibold text-[#11241F]">
              {maskEmail(emailParam)}
            </strong>
            , {t("bodyPost")}
          </p>

          <p className="text-xs text-[#5C7068] leading-relaxed">
            {t("linkNotice")}
          </p>
        </div>

        <div className="space-y-3 pt-2">
          {/* Clicking "Open my email app" verifies in dev and enters Step 2 with active session */}
          <button
            type="button"
            onClick={async () => {
              try {
                const res = await fetch("/api/v1/auth/dev-verify", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ email: emailParam }),
                });
                const data = await res.json();
                router.push(data.data?.nextStep || "/signup/about-you");
              } catch {
                router.push("/signup/about-you");
              }
            }}
            className="w-full py-3.5 px-4 rounded-xl bg-[#164E43] hover:bg-[#113E35] text-white font-semibold text-sm shadow-sm transition flex items-center justify-center gap-2"
          >
            <span>{t("openAppButton")}</span>
          </button>

          <button
            type="button"
            disabled={countdown > 0}
            onClick={() => setCountdown(30)}
            className="w-full py-3.5 px-4 rounded-xl border border-[#9EB0A8] bg-transparent text-[#164E43] hover:bg-[#E8F0EC] disabled:opacity-60 disabled:hover:bg-transparent font-semibold text-sm transition"
          >
            {countdown > 0
              ? t("resendCountdown", { time: formattedCountdown })
              : t("resendButton")}
          </button>

          <div className="text-center pt-2">
            <Link
              href="/create-account"
              className="text-xs font-semibold text-[#164E43] underline hover:text-[#113E35]"
            >
              {t("differentEmail")}
            </Link>
          </div>
        </div>

        {/* Development mode indicator explaining console mailer */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1">
          <p className="font-semibold flex items-center gap-1.5">
            <span>⚙️</span> Local Development Mode
          </p>
          <p className="text-amber-800 leading-relaxed">
            Outbound email is using <code>ConsoleDevMailer</code> (logged to your terminal console). To send real emails to your Gmail inbox, add <code>RESEND_API_KEY</code> to <code>.env.local</code>.
          </p>
          <p className="pt-1">
            Click <strong>&quot;Open my email app&quot;</strong> above to simulate opening your magic link and proceed immediately into Step 2!
          </p>
        </div>

        <div className="p-4 rounded-2xl border border-[#D5DFDA] bg-white space-y-1.5">
          <h3 className="text-xs font-bold text-[#11241F]">
            {t("cannotFindTitle")}
          </h3>
          <p className="text-xs text-[#52665F] leading-relaxed">
            {t("cannotFindBody", { domain: brand.supportDomain })}
          </p>
        </div>
      </div>

      <div className="w-full max-w-md mx-auto pt-8 text-center">
        <p className="text-xs text-[#637770]">
          Wrong email or stuck?{" "}
          <a
            href={`mailto:${brand.supportEmail}`}
            className="underline font-medium text-[#164E43]"
          >
            Contact support
          </a>
          .
        </p>
      </div>
    </div>
  );
}

import CheckEmailLoading from "./loading";

export default function CheckEmailPage() {
  return (
    <Suspense fallback={<CheckEmailLoading />}>
      <CheckEmailContent />
    </Suspense>
  );
}
