"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  Sparkles,
} from "lucide-react";
import { evaluateCondition } from "@/modules/profile/condition";
import type {
  ResolvedProfileSchema,
  ResolvedStep,
  ResolvedField,
} from "@/modules/profile/types";

interface ProfileFormProps {
  initialSchema: ResolvedProfileSchema | null;
  initialAnswers: Record<string, unknown>;
  onCompleteRedirectUrl?: string;
}

export function ProfileForm({
  initialSchema,
  initialAnswers,
  onCompleteRedirectUrl = "/onboarding/screening",
}: ProfileFormProps) {
  const router = useRouter();

  const [schema] = React.useState<ResolvedProfileSchema | null>(initialSchema);
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({
    trainedInCountry: "NG",
    ...initialAnswers,
  });
  const [currentStepIndex, setCurrentStepIndex] = React.useState(0);
  const [activeWhyAskedKey, setActiveWhyAskedKey] = React.useState<string | null>(null);
  const [saveStatus, setSaveStatus] = React.useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const [countryList, setCountryList] = React.useState<Array<{ value: string; label: string }>>([
    { value: "NG", label: "Nigeria" },
    { value: "GB", label: "United Kingdom" },
    { value: "US", label: "United States" },
    { value: "CA", label: "Canada" },
    { value: "IE", label: "Ireland" },
    { value: "AU", label: "Australia" },
    { value: "GH", label: "Ghana" },
    { value: "IN", label: "India" },
    { value: "ZA", label: "South Africa" },
  ]);

  React.useEffect(() => {
    async function loadCountries() {
      try {
        const res = await fetch("/api/v1/meta/countries?role=origin&scope=all&locale=en");
        if (res.ok) {
          const body = await res.json();
          if (Array.isArray(body.data)) {
            setCountryList(
              body.data.map((c: { code: string; label: string }) => ({
                value: c.code,
                label: c.label,
              }))
            );
          }
        }
      } catch {
        // Fallback default list remains
      }
    }
    loadCountries();
  }, []);

  // Debounced auto-save
  const debounceTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const saveAnswers = React.useCallback(
    async (updatedAnswers: Record<string, unknown>) => {
      setSaveStatus("saving");
      setErrorMessage(null);
      try {
        const res = await fetch("/api/v1/me/profile", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ answers: updatedAnswers }),
        });

        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error?.message || "Failed to save profile.");
        }

        setSaveStatus("saved");
        setTimeout(() => {
          setSaveStatus((current) => (current === "saved" ? "idle" : current));
        }, 2000);
      } catch (err) {
        setSaveStatus("error");
        setErrorMessage(err instanceof Error ? err.message : "Error saving profile.");
      }
    },
    [],
  );

  const handleFieldChange = (key: string, value: unknown) => {
    const updated = { ...answers, [key]: value };
    setAnswers(updated);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      void saveAnswers(updated);
    }, 600);
  };

  const steps = schema?.steps ?? [];
  const currentStep: ResolvedStep | undefined = steps[currentStepIndex];

  // Visible fields for current step
  const visibleFields = React.useMemo(() => {
    if (!currentStep) return [];
    return currentStep.fields.filter((field) => {
      if (!field.visibleWhen) return true;
      return evaluateCondition(field.visibleWhen, answers);
    });
  }, [currentStep, answers]);

  const handleNext = async () => {
    // Immediate save before stepping forward
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    await saveAnswers(answers);

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex((prev) => prev + 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      router.push(onCompleteRedirectUrl);
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex((prev) => prev - 1);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  if (!schema || steps.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
        <AlertCircle className="mx-auto size-10 text-amber-600" />
        <h2 className="mt-3 text-lg font-semibold text-slate-900">No Profile Questions Found</h2>
        <p className="mt-1 text-sm text-slate-500">
          We could not load profile criteria for your configuration.
        </p>
        <button
          onClick={() => router.push(onCompleteRedirectUrl)}
          className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-900"
        >
          <span>Continue to Pathways</span>
          <ArrowRight className="size-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Top Banner & Autosave indicator */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800">
            <Sparkles className="size-3.5" />
            <span>Profile Baseline (FR-2)</span>
          </span>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Your Medical Background & Facts
          </h1>
          <p className="text-sm text-slate-500">
            Factual information used exclusively to deterministically screen your pathway match.
          </p>
        </div>

        {/* Save Status Chip */}
        <div className="flex items-center gap-2 self-start sm:self-center">
          {saveStatus === "saving" && (
            <span className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <span className="size-2 animate-ping rounded-full bg-teal-600" />
              Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="flex items-center gap-1 text-xs font-medium text-emerald-700">
              <CheckCircle2 className="size-3.5" />
              Saved
            </span>
          )}
          {saveStatus === "error" && (
            <span className="flex items-center gap-1 text-xs font-medium text-rose-600">
              <AlertCircle className="size-3.5" />
              Failed to save
            </span>
          )}
        </div>
      </div>

      {/* Step Progress Stepper */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
          <span>
            Step {currentStepIndex + 1} of {steps.length}: {currentStep.title}
          </span>
          <span>{Math.round(((currentStepIndex + 1) / steps.length) * 100)}% completed</span>
        </div>
        <div className="flex gap-2">
          {steps.map((st, idx) => (
            <button
              key={st.key}
              type="button"
              onClick={() => setCurrentStepIndex(idx)}
              className={`h-2 flex-1 rounded-full transition-all ${
                idx <= currentStepIndex ? "bg-teal-800" : "bg-slate-200"
              }`}
              title={st.title}
            />
          ))}
        </div>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          {errorMessage}
        </div>
      )}

      {/* Current Step Form Card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs space-y-6">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{currentStep.title}</h2>
          <p className="mt-1 text-sm text-slate-500">
            Answer the following questions about your qualifications and status.
          </p>
        </div>

        <div className="space-y-5">
          {visibleFields.map((field) => (
            <ProfileFieldRenderer
              key={field.key}
              field={field}
              value={answers[field.key] ?? (field.key === "trainedInCountry" ? "NG" : undefined)}
              onChange={(val) => handleFieldChange(field.key, val)}
              isWhyAskedOpen={activeWhyAskedKey === field.key}
              onToggleWhyAsked={() =>
                setActiveWhyAskedKey((prev) => (prev === field.key ? null : field.key))
              }
              countryList={countryList}
            />
          ))}
        </div>

        {/* Navigation Buttons */}
        <div className="flex flex-col-reverse gap-3 pt-6 border-t border-slate-100 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={handlePrev}
            disabled={currentStepIndex === 0}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40"
          >
            <ArrowLeft className="size-4" />
            <span>Previous</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-teal-800 px-6 py-3 text-sm font-semibold text-white shadow-xs hover:bg-teal-900 transition"
            >
              <span>{currentStepIndex === steps.length - 1 ? "Review Pathway Matches" : "Next Step"}</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

interface ProfileFieldRendererProps {
  field: ResolvedField;
  value: unknown;
  onChange: (value: unknown) => void;
  isWhyAskedOpen: boolean;
  onToggleWhyAsked: () => void;
  countryList?: Array<{ value: string; label: string }>;
}

function ProfileFieldRenderer({
  field,
  value,
  onChange,
  isWhyAskedOpen,
  onToggleWhyAsked,
  countryList = [],
}: ProfileFieldRendererProps) {
  const resolvedValue = value ?? (field.key === "trainedInCountry" ? "NG" : "");
  const countryOptions = (field.options && field.options.length > 0)
    ? field.options.map((o) => ({ value: o.value, label: o.label }))
    : countryList;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 transition-all focus-within:border-teal-700 focus-within:bg-white focus-within:ring-1 focus-within:ring-teal-700">
      <div className="flex items-start justify-between gap-3">
        <label htmlFor={field.key} className="block text-sm font-semibold text-slate-900">
          {field.label}
          {field.required && <span className="ml-1 text-rose-600">*</span>}
          {!field.required && (
            <span className="ml-2 text-xs font-normal text-slate-500">(Optional)</span>
          )}
          {field.key === "trainedInCountry" && (
            <span className="ml-2 inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 border border-emerald-200">
              Pre-filled from account setup
            </span>
          )}
        </label>

        {/* Why we ask button */}
        {field.whyAsked && (
          <button
            type="button"
            onClick={onToggleWhyAsked}
            aria-expanded={isWhyAskedOpen}
            className="inline-flex items-center gap-1 text-xs font-medium text-teal-800 hover:text-teal-900"
          >
            <HelpCircle className="size-3.5" />
            <span>Why we ask</span>
            <ChevronDown
              className={`size-3 transition-transform ${isWhyAskedOpen ? "rotate-180" : ""}`}
            />
          </button>
        )}
      </div>

      {field.help && <p className="mt-1 text-xs text-slate-500">{field.help}</p>}
      {!field.help && field.key === "trainedInCountry" && (
        <p className="mt-1 text-xs text-slate-500">
          Pre-filled from your signup selection. Update only if your primary medical qualification was obtained elsewhere.
        </p>
      )}

      {/* Expandable Why We Ask Drawer */}
      {isWhyAskedOpen && field.whyAsked && (
        <div className="mt-2 rounded-lg border border-teal-200 bg-teal-50/70 p-3 text-xs text-teal-900 leading-relaxed">
          <p className="font-semibold text-teal-950">Regulatory Reason:</p>
          <p className="mt-0.5">{field.whyAsked}</p>
        </div>
      )}

      {/* Input component based on field.type */}
      <div className="mt-3">
        {field.type === "text" && (
          <input
            id={field.key}
            type="text"
            value={(resolvedValue as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
            placeholder="Type your answer..."
          />
        )}

        {field.type === "number" && (
          <input
            id={field.key}
            type="number"
            min={field.validation.min}
            max={field.validation.max}
            value={resolvedValue !== undefined && resolvedValue !== null && resolvedValue !== "" ? Number(resolvedValue) : ""}
            onChange={(e) => {
              const val = e.target.value === "" ? "" : Number(e.target.value);
              onChange(val);
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
            placeholder="0"
          />
        )}

        {field.type === "date" && (
          <input
            id={field.key}
            type="date"
            value={(resolvedValue as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700"
          />
        )}

        {field.type === "boolean" && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onChange(true)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
                resolvedValue === true
                  ? "border-teal-800 bg-teal-800 text-white shadow-xs"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => onChange(false)}
              className={`flex-1 rounded-xl border py-2.5 text-sm font-semibold transition ${
                resolvedValue === false
                  ? "border-teal-800 bg-teal-800 text-white shadow-xs"
                  : "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              No
            </button>
          </div>
        )}

        {field.type === "select" && (
          <select
            id={field.key}
            value={(resolvedValue as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ colorScheme: "light" }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 [color-scheme:light]"
          >
            <option value="" className="bg-white text-slate-900">Select an option...</option>
            {field.options?.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        )}

        {field.type === "multiselect" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
            {field.options?.map((opt) => {
              const currentArr = Array.isArray(resolvedValue) ? (resolvedValue as string[]) : [];
              const isChecked = currentArr.includes(opt.value);

              return (
                <label
                  key={opt.value}
                  className={`flex items-center gap-2.5 p-3 rounded-xl border cursor-pointer select-none text-sm font-medium transition ${
                    isChecked
                      ? "border-teal-850 bg-teal-50/80 text-teal-950 font-semibold"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange([...currentArr, opt.value]);
                      } else {
                        onChange(currentArr.filter((v) => v !== opt.value));
                      }
                    }}
                    className="size-4 rounded text-teal-800 focus:ring-teal-700 border-slate-300"
                  />
                  <span>{opt.label}</span>
                </label>
              );
            })}
          </div>
        )}

        {field.type === "country" && (
          <select
            id={field.key}
            value={(resolvedValue as string) ?? ""}
            onChange={(e) => onChange(e.target.value)}
            style={{ colorScheme: "light" }}
            className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 shadow-xs focus:border-teal-700 focus:outline-none focus:ring-1 focus:ring-teal-700 [color-scheme:light]"
          >
            <option value="" className="bg-white text-slate-900">Select country...</option>
            {countryOptions.map((opt) => (
              <option key={opt.value} value={opt.value} className="bg-white text-slate-900">
                {opt.label}
              </option>
            ))}
          </select>
        )}
      </div>
    </div>
  );
}
