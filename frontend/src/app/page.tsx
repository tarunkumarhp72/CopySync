"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { 
  Clipboard, 
  ArrowRight, 
  Smartphone, 
  Laptop, 
  Monitor,
  ShieldCheck, 
  Zap, 
  FileText, 
  CheckCircle2, 
  Sparkles,
  QrCode,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ShimmerButton } from "@/components/ui/ShimmerButton";
import { InteractiveCopyPill } from "@/components/ui/InteractiveCopyPill";
import { HeaderAuthStatus } from "@/components/HeaderAuthStatus";

const targetDevices = ["laptop.", "desktop."];

export default function Home() {
  const [deviceIndex, setDeviceIndex] = useState(0);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setDeviceIndex((prev) => (prev + 1) % targetDevices.length);
    }, 2500);
    return () => clearInterval(timer);
  }, []);

  const currentDevice = targetDevices[deviceIndex];
  const isDesktop = currentDevice === "desktop.";

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
              Features
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
      <section className="relative overflow-hidden py-12 sm:py-24">
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

            {/* Main Headline with Animated Rotating Device */}
            <motion.h1
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.08 }}
              className="mt-6 text-3xl font-semibold tracking-tight sm:text-5xl lg:text-6xl text-foreground text-balance"
            >
              Copy on your phone. <br className="hidden sm:inline" />
              <span className="text-accent inline-flex flex-wrap items-baseline justify-center">
                <span>Paste on your&nbsp;</span>
                <span className="relative inline-flex overflow-hidden py-1">
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={currentDevice}
                      initial={{ opacity: 0, y: 18 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -18 }}
                      transition={{ duration: 0.35, ease: "easeOut" }}
                      className="inline-block text-accent font-semibold underline decoration-accent/35 decoration-wavy underline-offset-8"
                    >
                      {currentDevice}
                    </motion.span>
                  </AnimatePresence>
                </span>
              </span>
            </motion.h1>

            {/* Subheading */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.16 }}
              className="mt-6 text-lg sm:text-xl leading-relaxed text-muted text-balance"
            >
              Stop messaging links, 2FA codes, and snippets to yourself on chat apps. 
              Scan a fast QR code for instant guest clipboard sync, or sign in to keep permanent notes organized everywhere.
            </motion.p>

            {/* Call To Action Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.24 }}
              className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5"
            >
              <Link href="/guest" className="w-full sm:w-auto">
                <ShimmerButton className="w-full sm:w-auto">
                  <QrCode size={18} />
                  <span>Start Instant Sync (No Login)</span>
                  <ArrowRight size={16} />
                </ShimmerButton>
              </Link>

              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-white px-5 py-3 text-sm font-medium text-foreground shadow-2xs transition hover:bg-cream/60 active:scale-[0.98]"
              >
                <FileText size={17} className="text-muted" />
                <span>Open Notes Workspace</span>
              </Link>
            </motion.div>

            {/* Reassurance Micro-Copy */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.32 }}
              className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-medium text-muted"
            >
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-accent" /> Zero app install
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-accent" /> No registration required for guest
              </span>
              <span className="flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-accent" /> Automatic session wipe
              </span>
            </motion.div>
          </div>

          {/* Product Showcase Visual (Clean, Authentic UI Preview) */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35, ease: "easeOut" }}
            className="mt-12 sm:mt-20 w-full max-w-full overflow-hidden rounded-2xl border border-border bg-card p-1.5 sm:p-4 shadow-sm"
          >
            <div className="w-full max-w-full overflow-hidden rounded-xl border border-border/80 bg-background/50 p-3 sm:p-6 md:p-8">
              <div className="grid w-full max-w-full gap-4 sm:gap-6 lg:grid-cols-2">
                {/* Visual Pane 1: Instant Clipboard */}
                <div className="flex w-full max-w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-border bg-white p-4 sm:p-6 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-md bg-cream text-accent">
                          <Smartphone size={16} />
                        </span>
                        <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                          <span>Phone to</span>
                          <AnimatePresence mode="wait">
                            <motion.span
                              key={isDesktop ? "desktop" : "laptop"}
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -6 }}
                              transition={{ duration: 0.25 }}
                              className="text-accent font-medium capitalize"
                            >
                              {isDesktop ? "Desktop" : "Laptop"}
                            </motion.span>
                          </AnimatePresence>
                        </div>
                      </div>
                      <span className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[11px] font-medium text-accent">
                        <span className="size-1.5 rounded-full bg-accent animate-pulse" />
                        Connected
                      </span>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-xs text-muted">
                        <span>Recent shared clipboard:</span>
                        <span className="text-[11px] text-accent font-medium">Click to test</span>
                      </div>

                      {/* Interactive Copy Pill from modern UI pattern */}
                      <InteractiveCopyPill 
                        textToCopy="https://github.com/torvalds/linux/commit/8017c6"
                        displayText="https://github.com/torvalds/linux/commit/8017c6"
                      />

                      <p className="text-xs text-muted leading-relaxed">
                        Tap &quot;Paste&quot; on mobile. It is already on your {isDesktop ? "desktop" : "laptop"} clipboard, ready for <kbd className="rounded border border-border bg-white px-1 py-0.5 text-[10px] font-sans">Ctrl + V</kbd>.
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted">
                    <span className="flex items-center gap-1.5">
                      {isDesktop ? <Monitor size={14} className="text-accent" /> : <Laptop size={14} className="text-accent" />}
                      <span>1-to-1 encrypted connection</span>
                    </span>
                    <span className="font-medium text-accent">Guest Mode</span>
                  </div>
                </div>

                {/* Visual Pane 2: Cloud Notes */}
                <div className="flex w-full max-w-full min-w-0 flex-col justify-between overflow-hidden rounded-xl border border-border bg-white p-4 sm:p-6 shadow-2xs">
                  <div>
                    <div className="flex items-center justify-between border-b border-border/60 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="grid size-7 place-items-center rounded-md bg-cream text-accent">
                          <Laptop size={16} />
                        </span>
                        <span className="text-xs font-semibold text-foreground">Clean Notes Workspace</span>
                      </div>
                      <span className="rounded-md border border-border bg-cream/50 px-2 py-0.5 text-[11px] font-medium text-muted">
                        Auto-saved
                      </span>
                    </div>

                    <div className="mt-4 space-y-2">
                      <h4 className="text-sm font-semibold text-foreground">Sprint Goals & Architecture</h4>
                      <p className="text-xs leading-relaxed text-muted">
                        Rich text editing with bold, headings, checklists, and drag-and-drop images. Always accessible from any browser with your Google account.
                      </p>
                      <div className="mt-2 flex items-center gap-2 text-xs text-muted">
                        <span className="inline-block size-2 rounded-full bg-accent" />
                        <span>Last edited 2 minutes ago</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs text-muted">
                    <span>Synchronized to cloud database</span>
                    <span className="font-medium text-foreground">Signed In</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="border-t border-border/80 bg-white py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Frictionless Workflow</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Sync in three simple steps
            </h2>
            <p className="mt-4 text-base text-muted">
              No apps to download. No account verification emails. Just quick utility when you need it.
            </p>
          </div>

          <div className="mt-12 grid gap-6 sm:grid-cols-3">
            {/* Step 1 */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-xl border border-border bg-background p-6 shadow-2xs transition hover:border-accent/40"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-cream font-semibold text-accent text-sm">
                01
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">Open on your computer</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Visit CopySync and click &quot;Guest Sync&quot;. A temporary, private QR code is generated right on your screen.
              </p>
            </motion.div>

            {/* Step 2 */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-xl border border-border bg-background p-6 shadow-2xs transition hover:border-accent/40"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-cream font-semibold text-accent text-sm">
                02
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">Scan with your phone</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Point your phone camera at the code. You will land directly on a lightweight web interface paired directly to your machine.
              </p>
            </motion.div>

            {/* Step 3 */}
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="rounded-xl border border-border bg-background p-6 shadow-2xs transition hover:border-accent/40"
            >
              <span className="grid size-9 place-items-center rounded-lg bg-cream font-semibold text-accent text-sm">
                03
              </span>
              <h3 className="mt-4 text-base font-semibold text-foreground">Copy & paste freely</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">
                Text copied on your phone transmits directly to your laptop clipboard. Close the tab when finished and the session clears.
              </p>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Feature Value Grid */}
      <section id="features" className="py-16 sm:py-24">
        <div className="mx-auto max-w-6xl px-6 sm:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Thoughtfully Designed</p>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Everything you need, nothing you don&apos;t
            </h2>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-2xs transition hover:border-accent/40"
            >
              <div>
                <span className="grid size-10 place-items-center rounded-lg bg-cream text-accent">
                  <Zap size={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">Instant Transmission</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Built on direct real-time connections so copied links, text snippets, and notes transfer in milliseconds.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-medium text-accent">
                Fast & lightweight
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-2xs transition hover:border-accent/40"
            >
              <div>
                <span className="grid size-10 place-items-center rounded-lg bg-cream text-accent">
                  <ShieldCheck size={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">Private & Ephemeral</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Guest pairing links exactly one phone with one browser. Sessions automatically expire after 5 minutes of inactivity.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-medium text-accent">
                Zero data persistence
              </div>
            </motion.div>

            <motion.div 
              whileHover={{ y: -3, transition: { duration: 0.2 } }}
              className="flex flex-col justify-between rounded-xl border border-border bg-card p-6 shadow-2xs transition hover:border-accent/40"
            >
              <div>
                <span className="grid size-10 place-items-center rounded-lg bg-cream text-accent">
                  <Sparkles size={20} />
                </span>
                <h3 className="mt-4 text-base font-semibold text-foreground">Calm Notes Workspace</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">
                  Need permanent thoughts? Sign in with your Google account to access a clean markdown editor with image upload and instant search.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-border/60 text-xs font-medium text-accent">
                Rich text & auto-saving
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Clean Call To Action Strip */}
      <section className="border-t border-border/80 bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-4xl px-6 text-center sm:px-8">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            Start moving clipboard text in seconds
          </h2>
          <p className="mt-3 text-base text-muted">
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
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 sm:flex-row sm:px-8">
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
