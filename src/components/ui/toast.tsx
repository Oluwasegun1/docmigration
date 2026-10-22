"use client";

import { useEffect } from "react";
import { CheckCircle2, X } from "lucide-react";

export interface ToastProps {
  show: boolean;
  message: string;
  title?: string;
  onClose: () => void;
  duration?: number;
}

export function Toast({
  show,
  message,
  title = "Success",
  onClose,
  duration = 4500,
}: ToastProps) {
  useEffect(() => {
    if (!show) return;
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [show, duration, onClose]);

  if (!show) return null;

  return (
    <div className="fixed bottom-6 right-6 left-6 sm:left-auto sm:max-w-md z-50 transition-all duration-300 transform translate-y-0 opacity-100">
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-[#11241F] text-white shadow-2xl border border-[#254B40]">
        <div className="w-6 h-6 rounded-full bg-[#164E43] flex items-center justify-center shrink-0 mt-0.5 text-[#5CEBA3]">
          <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div className="flex-1 space-y-0.5 pr-1">
          {title && <p className="text-sm font-semibold text-white">{title}</p>}
          <p className="text-xs text-[#C5D3CD] leading-relaxed">{message}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-lg hover:bg-[#1E3831] text-[#9CB0A8] hover:text-white transition shrink-0"
          aria-label="Close notification"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
