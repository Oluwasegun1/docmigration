"use client";

import * as React from "react";
import {
  X,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusNotice } from "@/components/shared/status-notice";
import type { CriterionItem } from "@/features/pathways/model";

export type { CriterionItem };

interface CriteriaDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  pathwayName: string;
  regulatorName?: string;
  outcome: string;
  outcomeLabel: string;
  criteria: CriterionItem[];
  missingFields: string[];
  onFactSaved?: () => Promise<void>;
}

export function CriteriaDrawer({
  isOpen,
  onClose,
  pathwayName,
  regulatorName,
  outcome,
  criteria,
  onFactSaved,
}: CriteriaDrawerProps) {
  const [editingField, setEditingField] = React.useState<string | null>(null);
  const [fieldValue, setFieldValue] = React.useState<string>("");
  const [isSaving, setIsSaving] = React.useState(false);

  if (!isOpen) return null;

  const handleSaveField = async (fieldKey: string) => {
    setIsSaving(true);
    try {
      await fetch("/api/v1/me/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: { [fieldKey]: fieldValue } }),
      });
      setEditingField(null);
      setFieldValue("");
      if (onFactSaved) {
        await onFactSaved();
      }
    } catch (err) {
      console.error("Failed to save field inline", err);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-150">
      <div className="relative w-full max-w-xl bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-teal-850">
                Rule-Based Screening
              </span>
              <span className="text-xs text-slate-400">•</span>
              <span className="text-xs text-slate-500">{regulatorName || "Official Regulator"}</span>
            </div>
            <h2 className="mt-1 text-lg font-bold text-slate-900">{pathwayName}</h2>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            aria-label="Close drawer"
          >
            <X className="size-5" />
          </Button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Status Notice (Ground Rule 1) */}
          <StatusNotice
            tone="info"
            title="Guidance, not decisions"
          >
            Migration Hub provides planning guidance based on published regulator rules and your reported profile facts. It does not decide eligibility or guarantee registration or visa approval.
          </StatusNotice>

          {/* Outcome Status Banner (Ground Rule 1 exact labels) */}
          <div
            className={`rounded-xl border p-4 flex items-start gap-3.5 ${
              outcome === "potential_match"
                ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                : outcome === "potential_blocker"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : outcome === "unmet"
                ? "border-rose-200 bg-rose-50 text-rose-900"
                : "border-blue-200 bg-blue-50 text-blue-900"
            }`}
          >
            {outcome === "potential_match" && (
              <CheckCircle2 className="size-5 text-emerald-700 shrink-0 mt-0.5" />
            )}
            {outcome === "potential_blocker" && (
              <AlertTriangle className="size-5 text-amber-700 shrink-0 mt-0.5" />
            )}
            {outcome === "unmet" && (
              <XCircle className="size-5 text-rose-700 shrink-0 mt-0.5" />
            )}
            {outcome === "more_information_needed" && (
              <HelpCircle className="size-5 text-blue-700 shrink-0 mt-0.5" />
            )}

            <div>
              <div className="text-sm font-bold">
                {outcome === "potential_match" && "Potential match"}
                {outcome === "more_information_needed" && "More information needed"}
                {outcome === "potential_blocker" && "Potential blocker"}
                {outcome === "unmet" && "Requirement appears unmet"}
              </div>
              <p className="mt-0.5 text-xs opacity-90 leading-relaxed">
                Evaluated deterministically from published regulatory rules and your reported profile facts.
              </p>
            </div>
          </div>

          {/* Criteria List */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-700">
              Evaluated Criteria ({criteria.length})
            </h3>

            {criteria.map((c) => {
              const isMet = c.status === "met";
              const isUnmet = c.status === "not_met";
              const isUnknown = c.status === "unknown";

              return (
                <div
                  key={c.criterionId || c.key}
                  className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-900">{c.title}</span>
                        {c.mandatory && (
                          <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-800">
                            Required
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">Profile fact: {c.profileField}</p>
                    </div>

                    {/* Status badge - Ground rule 1 exact wording */}
                    <div className="shrink-0">
                      {isMet && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                          <CheckCircle2 className="size-3.5" />
                          <span>Met</span>
                        </span>
                      )}
                      {isUnmet && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800">
                          <XCircle className="size-3.5" />
                          <span>Requirement appears unmet</span>
                        </span>
                      )}
                      {isUnknown && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-xs font-semibold text-blue-800">
                          <HelpCircle className="size-3.5" />
                          <span>More information needed</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {c.explanation && (
                    <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200">
                      {c.explanation}
                    </p>
                  )}

                  {/* User-Reported Label (Ground rule 6) */}
                  <div className="rounded-lg bg-white p-2.5 border border-slate-200/80 text-xs">
                    <span className="font-semibold text-slate-700">You reported: </span>
                    <span className="text-slate-900">
                      {c.userValue !== null && c.userValue !== undefined && c.userValue !== ""
                        ? String(c.userValue)
                        : "Not yet reported"}
                    </span>
                  </div>

                  {/* Inline Add Fact if status is unknown */}
                  {isUnknown && (
                    <div className="pt-1">
                      {editingField === c.profileField ? (
                        <div className="flex items-center gap-2 mt-2">
                          <input
                            type="text"
                            placeholder="Enter value..."
                            value={fieldValue}
                            onChange={(e) => setFieldValue(e.target.value)}
                            className="flex-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-teal-700 focus:outline-none"
                          />
                          <Button
                            type="button"
                            variant="primary"
                            size="md"
                            disabled={isSaving || !fieldValue.trim()}
                            onClick={() => handleSaveField(c.profileField)}
                            className="h-8 px-3 text-xs"
                          >
                            <Save className="size-3" />
                            <span>{isSaving ? "Saving..." : "Save"}</span>
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="md"
                            onClick={() => setEditingField(null)}
                            className="h-8 px-2 text-xs"
                          >
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingField(c.profileField);
                            setFieldValue("");
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-teal-800 hover:text-teal-950"
                        >
                          <PlusCircle className="size-3.5" />
                          <span>Provide your answer for this</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Official Source Citation & Verified Date (Ground rule 7) */}
                  <div className="pt-2 border-t border-slate-200/60 flex flex-wrap items-center justify-between gap-1 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-slate-400" />
                      <span>Source: {c.source?.publisher || "Official Regulator"}</span>
                      {c.source?.verifiedAt ? (
                        <span>(Verified on {c.source.verifiedAt})</span>
                      ) : (
                        <span className="text-amber-700 font-medium">(Unpublished content)</span>
                      )}
                    </div>
                    {c.source?.url ? (
                      <a
                        href={c.source.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-teal-800 hover:underline font-medium"
                      >
                        <span>Official Source Link</span>
                        <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">Source not published</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            className="w-full"
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
