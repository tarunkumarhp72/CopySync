"use client";

import { useEffect, useRef, useState } from "react";
import { RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type QRCodeStyling from "qr-code-styling";

interface ProfessionalQRCodeProps {
  value: string;
  size?: number;
  onRefresh: () => void | Promise<void>;
  isRefreshing?: boolean;
}

const EXPIRE_SECONDS = 30;

export function ProfessionalQRCode({
  value,
  size = 200,
  onRefresh,
  isRefreshing = false,
}: ProfessionalQRCodeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const qrCodeInstanceRef = useRef<QRCodeStyling | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(EXPIRE_SECONDS);
  const [isExpired, setIsExpired] = useState(false);

  // 1. Initialize or update QRCodeStyling instance
  useEffect(() => {
    let isMounted = true;

    async function initQR() {
      if (typeof window === "undefined" || !containerRef.current) return;
      const QRCodeStyling = (await import("qr-code-styling")).default;

      if (!qrCodeInstanceRef.current) {
        const qr = new QRCodeStyling({
          width: size,
          height: size,
          type: "svg",
          data: value,
          image: "/icon.svg",
          dotsOptions: {
            color: "#1e281b",
            type: "dots",
          },
          cornersSquareOptions: {
            color: "#1e281b",
            type: "extra-rounded",
          },
          cornersDotOptions: {
            color: "#1e281b",
            type: "dot",
          },
          backgroundOptions: {
            color: "#ffffff",
          },
          imageOptions: {
            crossOrigin: "anonymous",
            margin: 4,
            imageSize: 0.26,
            hideBackgroundDots: true,
          },
        });

        if (isMounted && containerRef.current) {
          containerRef.current.innerHTML = "";
          qr.append(containerRef.current);
          qrCodeInstanceRef.current = qr;
        }
      } else {
        qrCodeInstanceRef.current.update({
          data: value,
          width: size,
          height: size,
        });
      }
    }

    void initQR();

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  // 2. WhatsApp-style 30s countdown timer
  useEffect(() => {
    setSecondsLeft(EXPIRE_SECONDS);
    setIsExpired(false);

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsExpired(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [value]);

  const handleReload = () => {
    setIsExpired(false);
    setSecondsLeft(EXPIRE_SECONDS);
    void onRefresh();
  };

  const progressPercent = (secondsLeft / EXPIRE_SECONDS) * 100;
  const strokeDashoffset = 100 - progressPercent;

  return (
    <div className="flex flex-col items-center">
      {/* QR Code Container with WhatsApp-style Expired Overlay */}
      <div
        className="relative rounded-2xl border border-border/90 bg-white p-3.5 sm:p-4 shadow-sm overflow-hidden select-none cursor-pointer group"
        onClick={() => {
          if (isExpired && !isRefreshing) handleReload();
        }}
      >
        {/* Render target for QRCodeStyling */}
        <div
          ref={containerRef}
          className={`transition-all duration-300 ${
            isExpired ? "opacity-25 blur-[2.5px] scale-[0.98]" : "opacity-100"
          }`}
          style={{ width: size, height: size }}
        />

        {/* WhatsApp-style Expiry Overlay */}
        <AnimatePresence>
          {isExpired && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[2px] p-4 text-center z-20"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleReload();
                }}
                disabled={isRefreshing}
                className="group/btn relative flex size-14 items-center justify-center rounded-full bg-accent text-white shadow-md transition-all duration-200 hover:scale-105 active:scale-95 hover:shadow-lg disabled:opacity-60"
                aria-label="Reload QR code"
              >
                <RefreshCw
                  size={24}
                  className={`transition-transform duration-300 ${
                    isRefreshing ? "animate-spin" : "group-hover/btn:rotate-180"
                  }`}
                />
              </button>

              <p className="mt-3 text-xs font-semibold text-foreground">
                QR code expired
              </p>
              <p className="mt-0.5 text-[11px] text-muted">
                Click to reload QR code
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modern Circular / Radial Countdown Bar */}
      <div className="mt-3.5 flex items-center justify-center gap-2 text-xs text-muted">
        {!isExpired ? (
          <div className="flex items-center gap-2 rounded-full border border-border/70 bg-cream/30 px-2.5 py-1 text-[11px] text-muted">
            <svg className="size-3.5 -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-border"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-accent transition-all duration-1000 ease-linear"
                strokeDasharray="100, 100"
                strokeDashoffset={strokeDashoffset}
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span>
              QR refreshes in{" "}
              <strong className="font-mono text-foreground font-semibold">
                {secondsLeft}s
              </strong>
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
            <span className="size-1.5 rounded-full bg-amber-600 animate-pulse" />
            <span>Code expired for security</span>
          </div>
        )}
      </div>
    </div>
  );
}
