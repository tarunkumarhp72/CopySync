"use client";

import React, { useState } from "react";
import { Check, Copy } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { cn } from "@/lib/utils";

interface InteractiveCopyPillProps {
  textToCopy: string;
  displayText?: string;
  className?: string;
  onCopySuccess?: () => void;
}

export function InteractiveCopyPill({
  textToCopy,
  displayText,
  className,
  onCopySuccess,
}: InteractiveCopyPillProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      onCopySuccess?.();
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  return (
    <button
      onClick={handleCopy}
      type="button"
      className={cn(
        "group relative flex w-full max-w-full min-w-0 items-center justify-between gap-2 overflow-hidden rounded-lg border border-border/80 bg-background/80 px-3 py-2 text-left text-xs font-mono transition-all duration-200 hover:border-accent/60 hover:bg-white hover:shadow-2xs active:scale-[0.99]",
        className
      )}
      title="Click to copy"
    >
      <span className="truncate min-w-0 flex-1 text-foreground select-all text-xs">
        {displayText ?? textToCopy}
      </span>

      <span className="shrink-0 flex items-center">
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.span
              key="check"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="inline-flex items-center gap-1 text-[11px] font-sans font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200"
            >
              <Check size={12} strokeWidth={2.5} />
              <span>Copied</span>
            </motion.span>
          ) : (
            <motion.span
              key="copy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="inline-flex items-center gap-1 text-[11px] font-sans text-muted group-hover:text-accent transition-colors"
            >
              <Copy size={13} />
              <span className="hidden sm:inline">Copy</span>
            </motion.span>
          )}
        </AnimatePresence>
      </span>
    </button>
  );
}

