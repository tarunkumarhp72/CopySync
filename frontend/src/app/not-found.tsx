"use client";

import Link from "next/link";
import { Clipboard, Compass, FileText, QrCode, Home, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";

const containerVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 24,
      staggerChildren: 0.08,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Top Header */}
      <header className="border-b border-border/80 bg-background/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-medium tracking-tight text-foreground group">
            <motion.span
              whileHover={{ rotate: [0, -6, 6, 0] }}
              transition={{ duration: 0.35 }}
              className="grid size-8 place-items-center rounded-lg bg-accent text-white shadow-xs"
            >
              <Clipboard size={17} strokeWidth={2.2} />
            </motion.span>
            <span className="text-base font-semibold tracking-tight">CopySync</span>
          </Link>
          <Link
            href="/"
            className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-muted transition hover:text-foreground group"
          >
            <ArrowLeft size={15} className="group-hover:-translate-x-0.5 transition-transform" />
            <span>Return home</span>
          </Link>
        </div>
      </header>

      {/* Main 404 Content */}
      <main className="mx-auto flex-1 flex flex-col items-center justify-center max-w-md w-full px-4 py-12 text-center">
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full flex flex-col items-center"
        >
          <motion.div variants={itemVariants} className="relative mb-6">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="grid size-20 place-items-center rounded-3xl bg-cream border border-border/90 text-accent shadow-sm"
            >
              <Compass size={36} strokeWidth={1.8} />
            </motion.div>
            <span className="absolute -top-1.5 -right-1.5 rounded-full bg-accent px-2 py-0.5 text-[11px] font-bold text-white shadow-xs">
              404
            </span>
          </motion.div>

          <motion.div variants={itemVariants}>
            <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-foreground">
              Page not found
            </h1>
            <p className="mt-2 text-sm text-muted leading-relaxed">
              The note, link, or route you are looking for doesn&apos;t exist, expired, or was moved.
            </p>
          </motion.div>

          {/* Quick Nav Cards */}
          <motion.div variants={itemVariants} className="mt-8 flex flex-col gap-2.5 w-full">
            <motion.div whileHover={{ scale: 1.015, y: -1 }} whileTap={{ scale: 0.985 }}>
              <Link
                href="/notes"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 text-left text-xs sm:text-sm font-medium text-foreground hover:bg-cream/50 transition shadow-2xs group w-full"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent">
                    <FileText size={17} />
                  </span>
                  <span>
                    <strong className="block font-medium text-foreground">Notes Workspace</strong>
                    <span className="text-[11px] text-muted font-normal">View and edit your sync notes</span>
                  </span>
                </span>
                <span className="text-muted group-hover:translate-x-1 transition-transform text-xs">→</span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.015, y: -1 }} whileTap={{ scale: 0.985 }}>
              <Link
                href="/guest"
                className="flex items-center justify-between rounded-xl border border-border bg-card p-3.5 text-left text-xs sm:text-sm font-medium text-foreground hover:bg-cream/50 transition shadow-2xs group w-full"
              >
                <span className="flex items-center gap-3">
                  <span className="grid size-8 place-items-center rounded-lg bg-accent/10 text-accent">
                    <QrCode size={17} />
                  </span>
                  <span>
                    <strong className="block font-medium text-foreground">Pair Phone (Guest QR)</strong>
                    <span className="text-[11px] text-muted font-normal">Fast 1-to-1 sync without account</span>
                  </span>
                </span>
                <span className="text-muted group-hover:translate-x-1 transition-transform text-xs">→</span>
              </Link>
            </motion.div>

            <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.985 }}>
              <Link
                href="/"
                className="flex items-center justify-center gap-2 rounded-xl border border-border bg-white py-2.5 text-xs font-medium text-muted hover:text-foreground hover:bg-cream/40 transition mt-1 w-full"
              >
                <Home size={14} />
                <span>Go to CopySync Homepage</span>
              </Link>
            </motion.div>
          </motion.div>
        </motion.div>
      </main>
    </div>
  );
}
