"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Check, Clipboard, ShieldCheck, Sparkles, ArrowLeft } from "lucide-react";
import { GoogleSignInButton } from "@/features/auth/GoogleSignInButton";
import SplitText from "@/components/SplitText";
import { SpotlightCard } from "@/components/motion/SpotlightCard";
import { motion } from "motion/react";

const api = process.env.NEXT_PROD_API_URL;

export default function LoginPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);

  // If user is already signed in, redirect them directly to dashboard
  useEffect(() => {
    let alive = true;
    const check = async () => {
      try {
        const token = typeof window !== "undefined" ? localStorage.getItem("copysync_token") : null;
        const res = await fetch(`${api}/auth/me`, {
          credentials: "include",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (res.ok && alive) {
          router.replace("/dashboard");
          return;
        }
      } catch {
        // Not logged in or network error, proceed to show login screen
      }
      if (alive) setCheckingAuth(false);
    };
    void check();
    return () => { alive = false; };
  }, [router]);

  if (checkingAuth) {
    return (
      <main className="grid min-h-screen place-items-center bg-[#faf9f6]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
          <span className="text-xs font-medium text-muted">Checking session...</span>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex flex-col justify-between min-h-screen w-full max-w-full overflow-x-hidden bg-[#faf9f6] px-3.5 py-4 sm:px-8 sm:py-8">
      {/* Ambient Animated Gradient Orbs - strictly contained to prevent horizontal scroll */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <motion.div
          animate={{
            x: [0, 25, 0],
            y: [0, -20, 0],
            scale: [1, 1.08, 1],
          }}
          transition={{ repeat: Infinity, duration: 12, ease: "easeInOut" }}
          className="transform-gpu will-change-transform absolute -left-32 top-20 size-72 sm:size-96 rounded-full bg-[#e8ecd9] blur-2xl sm:blur-3xl opacity-60 sm:opacity-70"
        />
        <motion.div
          animate={{
            x: [0, -30, 0],
            y: [0, 25, 0],
            scale: [1, 1.06, 1],
          }}
          transition={{ repeat: Infinity, duration: 14, ease: "easeInOut" }}
          className="transform-gpu will-change-transform absolute -right-28 bottom-0 size-72 sm:size-96 rounded-full bg-[#f4e8d8] blur-2xl sm:blur-3xl opacity-70 sm:opacity-80"
        />
      </div>

      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative mx-auto flex w-full max-w-6xl items-center justify-between gap-3 px-1"
      >
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground shrink-0">
          <span className="grid size-8 sm:size-9 place-items-center rounded-xl bg-accent text-white shadow-xs">
            <Clipboard size={17} />
          </span>
          <span className="text-base sm:text-lg">CopySync</span>
        </Link>
        <Link
          href="/"
          className="flex items-center gap-1.5 text-xs sm:text-sm text-muted hover:text-foreground transition shrink-0 whitespace-nowrap"
        >
          <ArrowLeft size={14} />
          <span>Back to home</span>
        </Link>
      </motion.header>

      {/* Main Section: Responsive 2-column or single-column on mobile */}
      <section className="relative mx-auto grid w-full max-w-full lg:max-w-6xl items-center gap-8 py-4 sm:py-10 lg:grid-cols-[1.05fr_.95fr] lg:gap-12 min-w-0">
        {/* Column A: Reassurance & Feature Information (Desktop Left, Mobile Below Login Card) */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="order-2 lg:order-1 w-full max-w-xl min-w-0 px-1"
        >
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs font-medium text-accent shadow-2xs">
            <Sparkles size={14} /> Your space, always in sync
          </span>

          <SplitText
            text="A calmer home for every thought."
            tag="h1"
            splitType="words, chars"
            trigger="load"
            effect="rise"
            delay={35}
            duration={0.7}
            className="mt-4 sm:mt-6 text-2xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl text-foreground break-words text-balance"
            textAlign="left"
          />

          <p className="mt-3 sm:mt-5 max-w-lg text-sm sm:text-lg leading-relaxed text-muted break-words">
            Sign in once and keep your notes ready on every device. Your Google password never reaches CopySync.
          </p>

          <ul className="mt-6 sm:mt-8 space-y-3.5 text-xs sm:text-sm text-muted">
            <motion.li
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="flex items-start gap-2.5 sm:gap-3"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-cream text-accent mt-0.5">
                <Check size={12} strokeWidth={2.5} />
              </span>
              <span className="flex-1 min-w-0 break-words leading-relaxed">
                Secure Google account verification
              </span>
            </motion.li>
            <motion.li
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="flex items-start gap-2.5 sm:gap-3"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-cream text-accent mt-0.5">
                <Check size={12} strokeWidth={2.5} />
              </span>
              <span className="flex-1 min-w-0 break-words leading-relaxed">
                Notes persist safely in your private workspace
              </span>
            </motion.li>
            <motion.li
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="flex items-start gap-2.5 sm:gap-3"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-cream text-accent mt-0.5">
                <Check size={12} strokeWidth={2.5} />
              </span>
              <span className="flex-1 min-w-0 break-words leading-relaxed">
                Connect up to 5 permanent devices across laptops, desktops & phones
              </span>
            </motion.li>
            <motion.li
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5 }}
              className="flex items-start gap-2.5 sm:gap-3"
            >
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-cream text-accent mt-0.5">
                <Check size={12} strokeWidth={2.5} />
              </span>
              <span className="flex-1 min-w-0 break-words leading-relaxed">
                Guest session clipboard history links smoothly after sign-in
              </span>
            </motion.li>
          </ul>
        </motion.div>

        {/* Column B: Login Card (Mobile Top / Desktop Right) */}
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="order-1 lg:order-2 w-full max-w-md justify-self-center min-w-0 px-1"
        >
          <SpotlightCard className="!px-4 !py-6 sm:!p-8 border-border bg-white sm:bg-white/95 sm:backdrop-blur-md shadow-[0_20px_50px_rgb(41_40_36_/_0.08)] w-full max-w-full overflow-hidden box-border">
            <div className="grid size-11 place-items-center rounded-xl bg-cream text-accent shadow-2xs">
              <ShieldCheck size={22} />
            </div>

            <h2 className="mt-5 text-xl sm:text-2xl font-semibold tracking-tight text-foreground">
              Welcome to CopySync
            </h2>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-muted">
              Choose your Google account to access your permanent workspace.
            </p>

            <div className="mt-6 w-full flex justify-center">
              <GoogleSignInButton />
            </div>

            <div className="mt-6 border-t border-border/60 pt-4">
              <p className="text-xs leading-5 text-muted">
                Google handles account security. CopySync receives only your verified email identity to link your secure workspace.
              </p>
            </div>
          </SpotlightCard>
        </motion.div>
      </section>

      {/* Footer spacer */}
      <div className="h-4" />
    </main>
  );
}
