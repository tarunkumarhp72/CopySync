"use client";

import { AlertTriangle, Trash2, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "warning" | "default";
  isLoading?: boolean;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
}: ConfirmModalProps) {
  if (!isOpen) return null;

  const isDanger = variant === "danger";

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={() => {
            if (!isLoading) onClose();
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-xl z-10"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            disabled={isLoading}
            className="absolute right-4 top-4 rounded-lg p-1 text-muted hover:bg-cream/60 hover:text-foreground transition disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>

          {/* Header with Icon */}
          <div className="flex items-start gap-3.5">
            <div
              className={`grid size-10 shrink-0 place-items-center rounded-xl shadow-2xs ${
                isDanger
                  ? "bg-red-50 text-red-600 border border-red-100"
                  : "bg-amber-50 text-amber-600 border border-amber-100"
              }`}
            >
              {isDanger ? <Trash2 size={19} /> : <AlertTriangle size={19} />}
            </div>
            <div>
              <h3 className="text-base font-semibold tracking-tight text-foreground">
                {title}
              </h3>
              <p className="mt-1 text-xs text-muted leading-relaxed">
                {description}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="mt-5 flex items-center justify-end gap-2 pt-2">
            <button
              onClick={onClose}
              disabled={isLoading}
              className="rounded-lg border border-border bg-white px-3.5 py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-cream/50 transition disabled:opacity-50"
            >
              {cancelText}
            </button>
            <button
              onClick={() => void onConfirm()}
              disabled={isLoading}
              className={`flex items-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold text-white shadow-2xs transition disabled:opacity-50 ${
                isDanger
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {isLoading && <Loader2 size={13} className="animate-spin" />}
              <span>{confirmText}</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
