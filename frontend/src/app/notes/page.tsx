"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotesWorkspace } from "@/features/notes/NotesWorkspace";
import { ShieldCheck, QrCode, LogIn, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { motion } from "motion/react";

const cardVariants = {
  hidden: { opacity: 0, y: 16, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 280,
      damping: 24,
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
};

export default function NotesPage() {
  const [tokenReady, setTokenReady] = useState(false);
  const [hasAccess, setHasAccess] = useState(false);
  const [isInitializingGuest, setIsInitializingGuest] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const token = url.searchParams.get("token");
      if (token) {
        localStorage.setItem("copysync_token", token);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }

      const hasUserToken = Boolean(localStorage.getItem("copysync_token"));
      const hasGuestToken = Boolean(localStorage.getItem("copysync_guest_token"));
      setHasAccess(hasUserToken || hasGuestToken);
    }
    setTokenReady(true);
  }, []);

  const createQuickGuestWorkspace = async () => {
    setIsInitializingGuest(true);
    const api = process.env.NEXT_PROD_API_URL;
    try {
      const res = await fetch(`${api}/guest-workspace`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data?.token && typeof window !== "undefined") {
          localStorage.setItem("copysync_guest_token", data.token);
          setHasAccess(true);
        }
      } else {
        window.location.assign("/guest");
      }
    } catch {
      window.location.assign("/guest");
    } finally {
      setIsInitializingGuest(false);
    }
  };

  if (!tokenReady) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
        >
          <Loader2 size={32} className="animate-spin text-accent" />
        </motion.div>
      </div>
    );
  }

  // Route Security: Guard against unauthenticated access
  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-background relative overflow-hidden flex flex-col items-center justify-center p-4 sm:p-6">
        {/* Soft Ambient Background Glow */}
        <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 left-1/2 -translate-x-1/2 size-96 rounded-full bg-emerald-500/5 blur-3xl" />

        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="relative w-full max-w-md rounded-2xl border border-border/80 bg-card/90 backdrop-blur-md p-6 sm:p-8 shadow-sm text-center"
        >
          <motion.div variants={itemVariants} className="mx-auto mb-4 flex justify-center">
            <div className="relative">
              <div className="grid size-14 place-items-center rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 shadow-2xs">
                <ShieldCheck size={28} />
              </div>
              <motion.span
                animate={{ scale: [1, 1.25, 1], opacity: [0.6, 1, 0.6] }}
                transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-1 -right-1 size-3.5 rounded-full bg-accent border-2 border-white"
              />
            </div>
          </motion.div>

          <motion.div variants={itemVariants}>
            <div className="inline-flex items-center gap-1.5 rounded-full border border-border/80 bg-background px-2.5 py-0.5 text-[11px] font-medium text-muted mb-2">
              <Sparkles size={11} className="text-accent" />
              <span>CopySync Security</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Workspace Access Required
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
              Pair directly with your phone camera via QR code or sign in to synchronize notes in real time.
            </p>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-6 flex flex-col gap-2.5">
            <motion.div whileHover={{ scale: 1.015, y: -1 }} whileTap={{ scale: 0.985 }}>
              <Link
                href="/guest"
                className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-xs hover:bg-accent/95 transition w-full"
              >
                <QrCode size={16} />
                <span>Pair Phone via QR Code (Guest)</span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.015, y: -1 }} whileTap={{ scale: 0.985 }}>
              <Link
                href="/login"
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-cream/50 transition shadow-2xs w-full"
              >
                <LogIn size={16} />
                <span>Sign in with Google</span>
              </Link>
            </motion.div>

            <motion.button
              type="button"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.985 }}
              onClick={() => void createQuickGuestWorkspace()}
              disabled={isInitializingGuest}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs font-medium text-muted hover:text-foreground hover:bg-cream/30 transition disabled:opacity-50"
            >
              {isInitializingGuest ? (
                <>
                  <Loader2 size={13} className="animate-spin text-accent" />
                  <span>Setting up temporary workspace...</span>
                </>
              ) : (
                <span>Open Instant Temporary Workspace</span>
              )}
            </motion.button>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-6 pt-4 border-t border-border/80">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform" />
              <span>Return to Home</span>
            </Link>
          </motion.div>
        </motion.div>
      </main>
    );
  }

  return <NotesWorkspace />;
}
