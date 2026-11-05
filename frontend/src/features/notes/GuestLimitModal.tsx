"use client";

import { X, Sparkles, Check, ShieldCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";

interface GuestLimitModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GuestLimitModal({ isOpen, onClose }: GuestLimitModalProps) {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-xl z-10"
        >
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-lg p-1.5 text-muted hover:bg-cream/60 hover:text-foreground transition"
            aria-label="Close dialog"
          >
            <X size={16} />
          </button>

          {/* Icon + Title */}
          <div className="flex items-start gap-3.5">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/10 text-accent shadow-2xs">
              <Sparkles size={20} />
            </div>
            <div>
              <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold text-amber-900 mb-1">
                <span>Guest Limit: 3 Notes Max</span>
              </div>
              <h3 className="text-lg font-semibold tracking-tight text-foreground">
                Sign in for Unlimited Notes
              </h3>
            </div>
          </div>

          <p className="mt-3 text-xs sm:text-sm leading-relaxed text-muted">
            You have created 3 notes as a guest. Sign in with Google to create unlimited notes, and your 3 notes will be automatically saved to your account.
          </p>

          {/* Benefits list */}
          <div className="mt-4 space-y-2 rounded-xl bg-[#FAF9F6] p-3.5 border border-border/70 text-xs text-muted">
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-600 shrink-0" />
              <span className="font-medium text-foreground">Your existing 3 notes will be kept safely</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-600 shrink-0" />
              <span>Unlimited notes, rich formatting & image uploads</span>
            </div>
            <div className="flex items-center gap-2">
              <Check size={14} className="text-emerald-600 shrink-0" />
              <span>Access notes on up to 5 permanent devices</span>
            </div>
          </div>

          {/* Google Sign In Button */}
          <div className="mt-5 w-full flex flex-col items-center">
            <GoogleSignInButton />
          </div>

          <div className="mt-4 pt-3 border-t border-border/70 flex items-center justify-between text-xs text-muted">
            <span className="flex items-center gap-1">
              <ShieldCheck size={13} className="text-accent" />
              <span>Free & secure</span>
            </span>
            <button
              onClick={onClose}
              className="text-muted hover:text-foreground font-medium transition"
            >
              Continue editing existing notes
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
