"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { NotesWorkspace } from "@/features/notes/NotesWorkspace";
import { ShieldAlert, QrCode, LogIn, ArrowLeft, Loader2 } from "lucide-react";
import { motion } from "motion/react";

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
        <Loader2 size={32} className="animate-spin text-accent" />
      </div>
    );
  }

  // Route Security: Guard against unauthenticated access
  if (!hasAccess) {
    return (
      <main className="min-h-screen bg-background flex flex-col items-center justify-center p-4 sm:p-6">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md rounded-2xl border border-border bg-card p-6 sm:p-8 shadow-sm text-center"
        >
          <div className="mx-auto grid size-12 place-items-center rounded-2xl bg-amber-50 text-amber-700 border border-amber-200/80 mb-4">
            <ShieldAlert size={24} />
          </div>

          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            Session Required
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-muted leading-relaxed">
            To view or sync notes, connect with your phone via QR code or sign in to your permanent account.
          </p>

          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/guest"
              className="flex items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-xs sm:text-sm font-medium text-white shadow-xs hover:opacity-95 transition"
            >
              <QrCode size={16} />
              <span>Scan QR with Phone (Guest)</span>
            </Link>

            <Link
              href="/login"
              className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 py-2.5 text-xs sm:text-sm font-medium text-foreground hover:bg-cream/50 transition shadow-2xs"
            >
              <LogIn size={16} />
              <span>Sign in with Google</span>
            </Link>

            <button
              type="button"
              onClick={() => void createQuickGuestWorkspace()}
              disabled={isInitializingGuest}
              className="mt-1 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-border py-2 text-xs text-muted hover:text-foreground transition disabled:opacity-50"
            >
              {isInitializingGuest ? (
                <>
                  <Loader2 size={13} className="animate-spin text-accent" />
                  <span>Setting up guest workspace...</span>
                </>
              ) : (
                <span>Open Instant Temporary Workspace</span>
              )}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-border/80">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground transition"
            >
              <ArrowLeft size={13} />
              <span>Return to Home</span>
            </Link>
          </div>
        </motion.div>
      </main>
    );
  }

  return <NotesWorkspace />;
}
