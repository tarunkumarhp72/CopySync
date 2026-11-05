"use client";

import { useEffect, useState } from "react";
import { WifiOff, QrCode, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ConnectionLostModalProps {
  isOpen: boolean;
  onRedirect?: () => void;
  countdownSeconds?: number;
}

export function ConnectionLostModal({
  isOpen,
  onRedirect,
  countdownSeconds = 3,
}: ConnectionLostModalProps) {
  const [secondsLeft, setSecondsLeft] = useState(countdownSeconds);

  useEffect(() => {
    if (!isOpen) {
      setSecondsLeft(countdownSeconds);
      return;
    }

    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (onRedirect) {
            onRedirect();
          } else {
            window.location.assign("/guest");
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [isOpen, countdownSeconds, onRedirect]);

  if (!isOpen) return null;

  const handleAction = () => {
    if (onRedirect) {
      onRedirect();
    } else {
      window.location.assign("/guest");
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs"
        />

        {/* Modal Card */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 12 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-border bg-white p-6 shadow-2xl z-10 text-center"
        >
          {/* Pulsing Icon Badge */}
          <div className="mx-auto mb-4 grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-200/60 shadow-xs">
            <WifiOff size={28} />
          </div>

          <h3 className="text-lg font-semibold tracking-tight text-foreground">
            Connection Lost
          </h3>

          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-muted">
            Your paired mobile device has disconnected or ended the session.
            Temporary guest session data has been cleaned up.
          </p>

          {/* Countdown indicator */}
          <div className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-cream/70 px-3 py-2 text-xs font-medium text-foreground">
            <span className="size-2 rounded-full bg-amber-500 animate-ping" />
            <span>Redirecting to QR scan in <strong>{secondsLeft}s</strong>...</span>
          </div>

          {/* Action button */}
          <div className="mt-5">
            <button
              onClick={handleAction}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-accent/90 transition cursor-pointer"
            >
              <QrCode size={16} />
              <span>Scan New QR Code</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
