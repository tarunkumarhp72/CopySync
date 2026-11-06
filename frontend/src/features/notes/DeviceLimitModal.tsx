"use client";

import { motion, AnimatePresence } from "motion/react";
import { Laptop, ShieldAlert, RefreshCw, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface DeviceLimitModalProps {
  isOpen: boolean;
  isGuest: boolean;
  maxDevices: number;
  message?: string | null;
  onRetry: () => void;
}

export function DeviceLimitModal({
  isOpen,
  isGuest,
  maxDevices,
  message,
  onRetry,
}: DeviceLimitModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm select-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          className="relative w-full max-w-md rounded-2xl border border-red-500/20 bg-card p-6 shadow-2xl text-center"
        >
          {/* Header Icon */}
          <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-red-50 text-red-600 border border-red-200">
            <ShieldAlert size={24} />
          </div>

          {/* Title */}
          <h3 className="text-lg font-semibold text-foreground tracking-tight">
            Device Connection Limit Reached
          </h3>

          {/* Description */}
          <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
            {message ||
              `You have reached the maximum allowed active devices (${maxDevices} max for ${
                isGuest ? "guest" : "account"
              }).`}
          </p>

          {/* Helpful Tip */}
          <div className="mt-4 rounded-xl border border-border/80 bg-cream/40 p-3 text-left flex items-start gap-2.5">
            <Laptop size={16} className="text-accent shrink-0 mt-0.5" />
            <p className="text-xs text-muted leading-relaxed">
              CopySync limits parallel active devices for security. Close CopySync in another browser or phone, and click Check again below.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={onRetry}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-accent px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-accent-hover transition cursor-pointer"
            >
              <RefreshCw size={14} />
              <span>Check again</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-border px-4 py-2.5 text-xs sm:text-sm font-medium text-muted hover:text-foreground hover:bg-cream/60 transition"
            >
              <ArrowLeft size={14} />
              <span>Return home</span>
            </Link>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
