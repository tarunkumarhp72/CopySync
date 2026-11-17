"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Clipboard, 
  ArrowRight, 
  ShieldCheck, 
  Zap, 
  FileText, 
  CheckCircle2, 
  Sparkles, 
  QrCode, 
  Loader2, 
} from "lucide-react";
import { motion } from "motion/react";
import { ShimmerButton } from "@/components/ui/ShimmerButton";
import { HeaderAuthStatus } from "@/components/HeaderAuthStatus";
import { HeroSyncShowcase } from "@/components/HeroSyncShowcase";

export default function Home() {
  const [isSigningIn, setIsSigningIn] = useState(false);

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col selection:bg-accent/20 selection:text-foreground">
      {/* Navigation Header */}
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-8">
          <Link href="/" className="flex items-center gap-2 font-medium tracking-tight text-foreground transition-opacity hover:opacity-90">
            <span className="grid size-8 place-items-center rounded-lg bg-accent text-white shadow-xs">
              <Clipboard size={17} strokeWidth={2.2} />
            </span>
            <span className="text-base font-semibold tracking-tight">CopySync</span>
          </Link>

          <div className="flex items-center gap-2.5 sm:gap-6">
            <Link
              href="#how-it-works"
              className="hidden text-sm font-medium text-muted transition hover:text-foreground md:inline-block"
            >
              How it works
            </Link>
            <Link
              href="#features"
              className="hidden text-sm font-medium text-muted transition hover:text-foreground md:inline-block"
            >
              Why CopySync
            </Link>
            <Link
              href="/guest"
              className="hidden text-sm font-medium text-muted transition hover:text-foreground sm:inline-block"
            >
              Guest Sync
            </Link>
            <HeaderAuthStatus />
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden py-10 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="mx-auto max-w-3xl text-center">
            {/* Category Pill */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] sm:text-xs font-medium text-muted shadow-2xs"
            >
              <span className="size-2 rounded-full bg-accent" />
              <span>Instant Cross-Device Clipboard & Notes</span>
            </motion.div>

            {/* Main Headline - Clear, Grounded & Authentic (No AI rotating gimmicks) */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-foreground text-balance"
            >
              Copy on your phone. <br className="hidden sm:inline" />
              <span className="text-accent">Paste on your computer.</span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="mt-5 text-base sm:text-lg leading-relaxed text-muted text-balance max-w-2xl mx-auto"
            >
              Stop messaging links, 2FA codes, and snippets to yourself on chat apps. 
              Scan a quick QR code for instant guest clipboard sync, or sign in to save organized notes everywhere.
            </motion.p>

            {/* Call To Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="mt-7 flex flex-col sm:flex-row items-center justify-center gap-3"
            >
              <Link href="/guest" className="w-full sm:w-auto">
                <ShimmerButton className="w-full sm:w-auto">
                  <QrCode size={17} />
                  <span>Start Instant Sync (No Login)</span>
                  <ArrowRight size={15} />
                </ShimmerButton>
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-medium text-foreground shadow-2xs transition hover:bg-cream/60 active:scale-[0.98]"
              >
                <FileText size={16} className="text-muted" />
                <span>Open Notes Workspace</span>
              </Link>
            </motion.div>

            {/* Reassurance Micro-Copy */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-accent" /> Zero app install
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-accent" /> No sign-up required
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={13} className="text-accent" /> Automatic session wipe
              </span>
            </motion.div>
          </div>

          {/* Product Showcase Visual (Interactive Real-Time Motion Simulation) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: "easeOut" }}
            className="mt-10 sm:mt-16 w-full max-w-full"
          >
            <HeroSyncShowcase />
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="border-t border-border/80 bg-white py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">How it works</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Sync in three simple steps
            </h2>
            <p className="mt-3 text-sm sm:text-base text-muted">
              No apps to download. No account verification emails. Just instant utility when you need it.
            </p>
          </div>

          <div className="mt-10 grid gap-5 sm:grid-cols-3">
            {/* Step 1 */}
            <div className="rounded-xl border border-border bg-background p-5 sm:p-6 shadow-2xs">
              <span className="grid size-8 place-items-center rounded-lg bg-cream font-semibold text-accent text-xs">
                01
              </span>
              <h3 className="mt-3.5 text-base font-semibold text-foreground">Open on computer</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Visit CopySync and click &quot;Guest Sync&quot;. A temporary, private QR code is generated right on your screen.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-border bg-background p-5 sm:p-6 shadow-2xs">
              <span className="grid size-8 place-items-center rounded-lg bg-cream font-semibold text-accent text-xs">
                02
              </span>
              <h3 className="mt-3.5 text-base font-semibold text-foreground">Scan with phone</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Point your phone camera at the code. You land directly on a lightweight web page paired to your computer.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-border bg-background p-5 sm:p-6 shadow-2xs">
              <span className="grid size-8 place-items-center rounded-lg bg-cream font-semibold text-accent text-xs">
                03
              </span>
              <h3 className="mt-3.5 text-base font-semibold text-foreground">Copy & paste freely</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Text copied on your phone transmits directly to your computer clipboard. Close the tab when finished to clear the session.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Value Grid */}
      <section id="features" className="py-14 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Why CopySync</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              Private, fast, and zero trace
            </h2>
          </div>

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs">
              <div>
                <span className="grid size-9 place-items-center rounded-lg bg-cream text-accent">
                  <Zap size={18} />
                </span>
                <h3 className="mt-3.5 text-base font-semibold text-foreground">Instant Transmission</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Direct real-time connections transfer copied links, OTP codes, and text snippets in milliseconds.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs">
              <div>
                <span className="grid size-9 place-items-center rounded-lg bg-cream text-accent">
                  <ShieldCheck size={18} />
                </span>
                <h3 className="mt-3.5 text-base font-semibold text-foreground">Ephemeral & In-Memory</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Guest pairing links exactly one phone with one browser. Sessions automatically expire after 5 minutes of inactivity.
                </p>
              </div>
            </div>

            <div className="flex flex-col justify-between rounded-xl border border-border bg-card p-5 sm:p-6 shadow-2xs">
              <div>
                <span className="grid size-9 place-items-center rounded-lg bg-cream text-accent">
                  <Sparkles size={18} />
                </span>
                <h3 className="mt-3.5 text-base font-semibold text-foreground">Calm Notes Workspace</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Sign in with Google whenever you need persistent rich-text notes with images, formatting, and auto-saving everywhere.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Clean Call To Action Strip */}
      <section className="border-t border-border/80 bg-white py-14 sm:py-18">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Start moving clipboard text in seconds
          </h2>
          <p className="mt-2.5 text-sm sm:text-base text-muted">
            No password or card required. Ready immediately in your web browser.
          </p>
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link href="/guest" className="w-full sm:w-auto">
              <ShimmerButton className="w-full sm:w-auto py-2.5">
                <QrCode size={16} />
                <span>Connect phone now</span>
              </ShimmerButton>
            </Link>
            <Link
              href="/login"
              onClick={() => setIsSigningIn(true)}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-5 py-2.5 text-sm font-medium text-foreground transition hover:bg-cream/60 cursor-pointer"
            >
              {isSigningIn ? (
                <>
                  <Loader2 size={16} className="animate-spin text-accent" />
                  <span>Opening sign in...</span>
                </>
              ) : (
                <span>Sign in with Google</span>
              )}
            </Link>
          </div>
        </div>
      </section>

      {/* Professional Minimal Footer */}
      <footer className="mt-auto border-t border-border/80 bg-background py-8 text-sm text-muted">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 sm:flex-row sm:px-8">
          <div className="flex items-center gap-2">
            <span className="grid size-6 place-items-center rounded-md bg-accent text-white">
              <Clipboard size={13} />
            </span>
            <span className="font-medium text-foreground">CopySync</span>
            <span className="text-xs text-muted">· Distraction-free clipboard & notes</span>
          </div>

          <div className="flex items-center gap-5 text-xs">
            <Link href="/guest" className="transition hover:text-foreground">Guest Mode</Link>
            <Link href="/login" className="transition hover:text-foreground">My Notes</Link>
            <a href="#how-it-works" className="transition hover:text-foreground">How it Works</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
