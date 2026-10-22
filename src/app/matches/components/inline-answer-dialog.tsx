"use client";

import * as React from "react";
import { X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { addAnswerAction } from "../actions";
import { FIELD_LABELS } from "@/lib/matching/copy";

interface InlineAnswerDialogProps {
  fieldKey: string;
  triggerButtonRef: React.RefObject<HTMLButtonElement | null>;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function InlineAnswerDialog({
  fieldKey,
  triggerButtonRef,
  isOpen,
  onClose,
  onSaved,
}: InlineAnswerDialogProps) {
  const [value, setValue] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [isSaving, setIsSaving] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement | HTMLSelectElement | null>(null);

  // Focus management (Part 8): move focus to field when dialog opens
  React.useEffect(() => {
    if (isOpen) {
      setError(null);
      setValue("");
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  }, [isOpen]);

  const handleClose = () => {
    onClose();
    // Return focus to trigger button
    triggerButtonRef.current?.focus();
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!value.trim()) {
      setError("Please provide an answer.");
      return;
    }

    setIsSaving(true);
    setError(null);

    let parsedVal: unknown = value.trim();
    if (fieldKey === "experienceYears" || fieldKey === "graduationYear") {
      const num = parseInt(value, 10);
      if (isNaN(num)) {
        setError("Please enter a valid number.");
        setIsSaving(false);
        return;
      }
      parsedVal = num;
    }

    const res = await addAnswerAction(fieldKey, parsedVal);
    setIsSaving(false);

    if (res.success) {
      onSaved();
      handleClose();
    } else {
      setError(res.message);
    }
  };

  if (!isOpen) return null;

  const label = FIELD_LABELS[fieldKey] || fieldKey;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={`dialog-title-${fieldKey}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl border border-slate-200">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h4
            id={`dialog-title-${fieldKey}`}
            className="text-base font-semibold text-slate-900"
          >
            Add information: {label}
          </h4>
          <button
            type="button"
            onClick={handleClose}
            className="rounded p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-2 focus-visible:outline-teal-700"
            aria-label="Close dialog"
          >
            <X className="size-5" />
          </button>
        </div>

        {error && (
          <div
            id={`error-summary-${fieldKey}`}
            role="alert"
            className="mt-3 p-3 text-xs bg-red-50 text-red-800 border border-red-200 rounded-md font-medium"
          >
            {error}
          </div>
        )}

        <form onSubmit={handleSave} className="mt-4 space-y-4">
          <div>
            <label
              htmlFor={`field-input-${fieldKey}`}
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              {label}
            </label>

            {fieldKey === "specialty" ? (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                id={`field-input-${fieldKey}`}
                type="text"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="e.g. internal-medicine"
                aria-describedby={error ? `error-summary-${fieldKey}` : undefined}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            ) : fieldKey === "internshipStatus" ? (
              <select
                ref={inputRef as React.RefObject<HTMLSelectElement>}
                id={`field-input-${fieldKey}`}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-describedby={error ? `error-summary-${fieldKey}` : undefined}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              >
                <option value="">Select status</option>
                <option value="not_started">Not started</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="not_applicable">Not applicable</option>
              </select>
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                id={`field-input-${fieldKey}`}
                type={
                  fieldKey === "experienceYears" || fieldKey === "graduationYear"
                    ? "number"
                    : "text"
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                aria-describedby={error ? `error-summary-${fieldKey}` : undefined}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-teal-700"
              />
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-3">
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleClose}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={isSaving}
            >
              <Check className="size-4" aria-hidden />
              {isSaving ? "Saving..." : "Save answer"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
