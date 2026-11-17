"use client";

import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Smartphone,
  Laptop,
  Zap,
  Check,
  CheckCircle2,
  Copy,
  QrCode,
  ShieldCheck,
  Lock,
  FileText,
  Sparkles,
  RefreshCw,
  Wifi,
} from "lucide-react";

interface PayloadExample {
  id: string;
  category: "link" | "code" | "text";
  label: string;
  sourceApp: string;
  title: string;
  content: string;
  shortContent: string;
  targetAction: string;
}

const CLIPBOARD_PAYLOADS: PayloadExample[] = [
  {
    id: "figma",
    category: "link",
    label: "Design Link",
    sourceApp: "Mobile Safari",
    title: "Figma Component Spec",
    content: "https://figma.com/design/4xK9pL/CopySync-Mobile-UI?node-id=102",
    shortContent: "figma.com/design/4xK9pL/...",
    targetAction: "Paste in Chrome on Laptop",
  },
  {
    id: "otp",
    category: "code",
    label: "2FA Code",
    sourceApp: "SMS Messages",
    title: "GitHub Verification Code",
    content: "849-210",
    shortContent: "849-210",
    targetAction: "Autofill in Laptop Browser",
  },
  {
    id: "address",
    category: "text",
    label: "Client Address",
    sourceApp: "WhatsApp Chat",
    title: "Shipping Delivery Details",
    content: "Suite 400, 250 King St West, Toronto, ON M5V 3C1",
    shortContent: "Suite 400, 250 King St...",
    targetAction: "Paste into Invoice on Laptop",
  },
];

export function HeroSyncShowcase() {
  const [activeTab, setActiveTab] = useState<"clipboard" | "notes" | "pairing">("clipboard");
  const [activePayloadIndex, setActivePayloadIndex] = useState(0);
  const [step, setStep] = useState<"copying" | "transmitting" | "received">("received");
  const [isCopiedToLaptop, setIsCopiedToLaptop] = useState(true);
  const cycleTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const payload = CLIPBOARD_PAYLOADS[activePayloadIndex];

  // Auto-play animation cycle for Clipboard Mode
  useEffect(() => {
    if (activeTab !== "clipboard") return;

    let isMounted = true;

    const runCycle = () => {
      if (!isMounted) return;

      // 1. Phone tap & copy (0s -> 1.2s)
      setStep("copying");
      setIsCopiedToLaptop(false);

      cycleTimeoutRef.current = setTimeout(() => {
        if (!isMounted) return;
        // 2. Beaming across encrypted websocket (1.2s -> 2.4s)
        setStep("transmitting");

        cycleTimeoutRef.current = setTimeout(() => {
          if (!isMounted) return;
          // 3. Received on laptop & copied to clipboard (2.4s -> 5.5s)
          setStep("received");
          setIsCopiedToLaptop(true);

          cycleTimeoutRef.current = setTimeout(() => {
            if (!isMounted) return;
            // Next payload
            setActivePayloadIndex((prev) => (prev + 1) % CLIPBOARD_PAYLOADS.length);
          }, 3200);
        }, 1200);
      }, 1300);
    };

    runCycle();

    return () => {
      isMounted = false;
      if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
    };
  }, [activeTab, activePayloadIndex]);

  // Handle manual user click on sample pills
  const handleSelectPayload = (index: number) => {
    if (cycleTimeoutRef.current) clearTimeout(cycleTimeoutRef.current);
    setActivePayloadIndex(index);
    setStep("copying");
    setIsCopiedToLaptop(false);

    setTimeout(() => {
      setStep("transmitting");
      setTimeout(() => {
        setStep("received");
        setIsCopiedToLaptop(true);
      }, 900);
    }, 800);
  };

  return (
    <div className="w-full max-w-5xl mx-auto overflow-hidden rounded-3xl border border-stone-200/90 bg-[#FCFBF9] p-2.5 sm:p-5 md:p-6 shadow-xl shadow-stone-200/40">
      {/* 1. Header Navigation Bar / Mode Tabs */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-stone-200/80 pb-4 px-1 sm:px-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-stone-700">
            Live Sync Simulation
          </span>
          <span className="rounded-full bg-stone-100 border border-stone-200 px-2 py-0.5 text-[10px] font-mono text-stone-600">
            0ms WebSocket
          </span>
        </div>

        {/* Feature Tabs */}
        <div className="flex items-center gap-1 rounded-xl bg-stone-200/60 p-1 border border-stone-200/80 overflow-x-auto max-w-full no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveTab("clipboard")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "clipboard"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Zap size={13} className={activeTab === "clipboard" ? "text-accent" : ""} />
            <span>Instant Clipboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "notes"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <FileText size={13} className={activeTab === "notes" ? "text-accent" : ""} />
            <span>Live Notes Stream</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("pairing")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-semibold transition cursor-pointer whitespace-nowrap shrink-0 ${
              activeTab === "pairing"
                ? "bg-white text-stone-900 shadow-xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <QrCode size={13} className={activeTab === "pairing" ? "text-accent" : ""} />
            <span>Instant QR Pairing</span>
          </button>
        </div>
      </div>

      {/* 2. Main Arena Content */}
      <div className="mt-6">
        {activeTab === "clipboard" && (
          <div className="space-y-6">
            {/* Interactive Payload Selector Chips */}
            <div className="flex flex-wrap items-center justify-center gap-2">
              <span className="text-xs font-medium text-stone-500 mr-1">Try example:</span>
              {CLIPBOARD_PAYLOADS.map((item, idx) => {
                const isSelected = idx === activePayloadIndex;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPayload(idx)}
                    className={`flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-medium transition cursor-pointer border ${
                      isSelected
                        ? "bg-accent text-white border-accent shadow-xs scale-102"
                        : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50 hover:border-stone-300"
                    }`}
                  >
                    <span>{item.label}</span>
                    {isSelected && <span className="size-1.5 rounded-full bg-white animate-ping" />}
                  </button>
                );
              })}
            </div>

            {/* Side-by-Side Dual Device Visual Stage */}
            <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
              {/* LEFT: Phone Frame */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full max-w-[270px] rounded-[2.25rem] border-[3px] border-stone-800/80 bg-stone-900 p-2 shadow-2xl ring-1 ring-black/10">
                  {/* Phone Screen Area */}
                  <div className="relative overflow-hidden rounded-[1.85rem] bg-[#FAF9F7] border border-stone-200/80 flex flex-col h-[360px]">
                    {/* Status Bar */}
                    <div className="h-6 px-4 pt-1 flex items-center justify-between text-[10px] font-bold text-stone-700">
                      <span>9:41</span>
                      {/* Notch / Dynamic Island */}
                      <div className="h-3 w-16 rounded-full bg-stone-900 mx-auto" />
                      <div className="flex items-center gap-1 text-stone-600">
                        <Wifi size={10} />
                        <span className="text-[9px]">5G</span>
                      </div>
                    </div>

                    {/* Mobile App Header */}
                    <div className="border-b border-stone-200/70 bg-white/90 px-3 py-2 flex items-center justify-between backdrop-blur-sm">
                      <div className="flex items-center gap-1.5">
                        <div className="grid size-5 place-items-center rounded-md bg-accent text-white">
                          <Zap size={11} />
                        </div>
                        <span className="text-[11px] font-bold text-stone-800">CopySync Mobile</span>
                      </div>
                      <span className="flex items-center gap-1 text-[9px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                        <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        Live Paired
                      </span>
                    </div>

                    {/* Mobile Screen Body */}
                    <div className="p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-stone-400 mb-1">
                          Source: {payload.sourceApp}
                        </div>
                        <div className="text-xs font-bold text-stone-900 mb-2">
                          {payload.title}
                        </div>

                        {/* Copied Item Container */}
                        <motion.div
                          animate={
                            step === "copying"
                              ? { scale: [1, 1.03, 1], borderColor: ["#e7e5e4", "#506230", "#e7e5e4"] }
                              : {}
                          }
                          transition={{ duration: 0.6 }}
                          className={`rounded-xl border p-2.5 bg-white shadow-2xs transition-all ${
                            step === "copying" ? "ring-2 ring-accent/30 bg-accent/5" : "border-stone-200"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="font-mono text-xs text-stone-800 break-all select-all font-medium">
                              {payload.content}
                            </span>
                          </div>
                        </motion.div>
                      </div>

                      {/* Animated Finger Tap / Action */}
                      <div className="space-y-2 mt-auto">
                        <motion.div
                          animate={step === "copying" ? { scale: [1, 0.96, 1] } : {}}
                          className={`w-full py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-xs ${
                            step === "copying"
                              ? "bg-accent text-white shadow-md ring-2 ring-accent/40"
                              : "bg-stone-800 text-white"
                          }`}
                        >
                          <Copy size={13} />
                          <span>{step === "copying" ? "1-Tap Copying..." : "Tap 'Paste to Laptop'"}</span>
                        </motion.div>

                        <div className="text-center text-[10px] text-stone-500 font-medium">
                          No login needed • 1-tap phone sync
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                  <Smartphone size={15} className="text-accent" />
                  <span>Your Smartphone</span>
                </div>
              </div>

              {/* CENTER: Animated Real-Time Sync Beam Bridge */}
              <div className="lg:col-span-2 flex flex-col items-center justify-center py-2 lg:py-0">
                <div className="relative flex flex-row lg:flex-col items-center justify-center gap-2 w-full">
                  {/* Glowing Pulse Bridge */}
                  <div className="hidden lg:block w-full h-1 bg-stone-200 rounded-full relative overflow-hidden">
                    <motion.div
                      animate={{
                        x: step === "transmitting" ? ["-100%", "100%"] : "100%",
                        opacity: step === "transmitting" ? [0, 1, 0] : 0,
                      }}
                      transition={{ duration: 0.9, repeat: step === "transmitting" ? Infinity : 0, ease: "easeInOut" }}
                      className="absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent h-full w-24"
                    />
                  </div>

                  {/* Transmission Badge */}
                  <motion.div
                    animate={
                      step === "transmitting"
                        ? { scale: [1, 1.1, 1], y: [0, -2, 0] }
                        : {}
                    }
                    transition={{ duration: 0.5, repeat: step === "transmitting" ? Infinity : 0 }}
                    className={`z-10 flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold shadow-md border transition-all ${
                      step === "transmitting"
                        ? "bg-accent text-white border-accent shadow-accent/25"
                        : "bg-white text-stone-700 border-stone-200"
                    }`}
                  >
                    <Zap size={14} className={step === "transmitting" ? "text-white animate-spin" : "text-accent"} />
                    <span className="text-[11px]">
                      {step === "copying" && "Detecting..."}
                      {step === "transmitting" && "Beam Active (12ms)"}
                      {step === "received" && "Synced & Saved"}
                    </span>
                  </motion.div>

                  <div className="hidden lg:block text-[10px] font-mono text-stone-500 uppercase tracking-widest text-center mt-1">
                    Direct P2P
                  </div>
                </div>
              </div>

              {/* RIGHT: Laptop / Desktop Workspace Screen */}
              <div className="lg:col-span-5 flex flex-col items-center">
                <div className="w-full rounded-2xl border border-stone-200/90 bg-white shadow-2xl overflow-hidden ring-1 ring-black/5">
                  {/* Laptop Window Header (macOS style) */}
                  <div className="h-8 border-b border-stone-200/70 bg-stone-100/90 px-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="size-2.5 rounded-full bg-red-400 border border-red-500/30" />
                      <span className="size-2.5 rounded-full bg-amber-400 border border-amber-500/30" />
                      <span className="size-2.5 rounded-full bg-emerald-400 border border-emerald-500/30" />
                    </div>

                    <div className="flex items-center gap-1 text-[11px] font-mono text-stone-500 bg-white/80 border border-stone-200/80 px-2.5 py-0.5 rounded-md">
                      <Lock size={9} className="text-emerald-600" />
                      <span>copysync.app/guest</span>
                    </div>

                    <div className="w-10" />
                  </div>

                  {/* Laptop Screen Body */}
                  <div className="p-4 sm:p-5 h-[328px] flex flex-col justify-between bg-white">
                    <div>
                      {/* Top Laptop Notification Banner */}
                      <AnimatePresence mode="wait">
                        {isCopiedToLaptop ? (
                          <motion.div
                            key="toast-received"
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8 }}
                            className="rounded-xl border border-emerald-300 bg-emerald-50/80 p-2.5 flex items-center justify-between gap-2 shadow-xs mb-3"
                          >
                            <div className="flex items-center gap-2">
                              <span className="grid size-6 place-items-center rounded-lg bg-emerald-600 text-white shrink-0">
                                <Check size={14} strokeWidth={2.6} />
                              </span>
                              <div>
                                <div className="text-xs font-bold text-emerald-950">
                                  Copied to Laptop Clipboard!
                                </div>
                                <div className="text-[10px] text-emerald-800">
                                  Ready to paste immediately (<kbd className="font-mono bg-white px-1 py-0.2 rounded border border-emerald-200 text-emerald-900">Ctrl + V</kbd> / <kbd className="font-mono bg-white px-1 py-0.2 rounded border border-emerald-200 text-emerald-900">⌘ + V</kbd>)
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-700 bg-white border border-emerald-200 px-2 py-0.5 rounded-md shrink-0">
                              Just now
                            </span>
                          </motion.div>
                        ) : (
                          <div className="rounded-xl border border-stone-200 bg-stone-50/60 p-2.5 flex items-center gap-2 mb-3 text-stone-500 text-xs">
                            <RefreshCw size={13} className="animate-spin text-accent" />
                            <span>Listening for phone clipboard beam...</span>
                          </div>
                        )}
                      </AnimatePresence>

                      {/* Laptop Clipboard Target Slot */}
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-stone-600">
                          <span>Laptop System Clipboard:</span>
                          <span className="text-[10px] text-accent font-mono uppercase tracking-wider">
                            Direct Sync
                          </span>
                        </div>

                        <div className="rounded-xl border border-stone-200 bg-stone-50/80 p-3 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <span className="block font-mono text-xs font-semibold text-stone-900 truncate">
                              {payload.content}
                            </span>
                            <span className="block text-[10px] text-stone-500 mt-0.5">
                              {payload.targetAction}
                            </span>
                          </div>
                          <div className="grid size-8 place-items-center rounded-lg bg-white border border-stone-200 text-stone-700 shadow-2xs shrink-0">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                          </div>
                        </div>
                      </div>

                      {/* Mock editor snippet below */}
                      <div className="mt-3 rounded-lg border border-dashed border-stone-200 p-2.5 bg-stone-50/40">
                        <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-1">
                          Active Document / Chat on Laptop
                        </div>
                        <div className="text-xs text-stone-600 font-mono">
                          <span className="text-stone-400">1 | </span>
                          <span className="bg-amber-100/90 text-stone-900 px-1 py-0.5 rounded font-semibold">
                            {payload.shortContent}
                          </span>
                          <span className="animate-pulse font-bold text-accent">|</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Status Footer */}
                    <div className="border-t border-stone-200/80 pt-2 flex items-center justify-between text-[11px] text-stone-500">
                      <span className="flex items-center gap-1 text-emerald-700 font-medium">
                        <ShieldCheck size={13} />
                        <span>Encrypted 1-to-1 WebRTC / WebSocket</span>
                      </span>
                      <span className="font-mono text-[10px] text-stone-400">Zero Cloud Storage</span>
                    </div>
                  </div>
                </div>

                <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-stone-700">
                  <Laptop size={15} className="text-accent" />
                  <span>Your Laptop / Desktop</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 2: Live Notes Stream */}
        {activeTab === "notes" && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="max-w-2xl mx-auto text-center space-y-2 mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                <Sparkles size={13} />
                <span>Simultaneous Real-time Notes</span>
              </span>
              <h3 className="text-xl font-bold tracking-tight text-stone-900">
                Type on phone, see notes appear live on laptop
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed max-w-lg mx-auto">
                No &quot;Save&quot; button needed. Text, bullet points, pastel highlights, and images stream instantaneously between all your open screens.
              </p>
            </div>

            {/* Visual Interactive Mockup of Live Notes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-3xl mx-auto">
              {/* Phone Note View */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 pb-2 border-b border-stone-200">
                  <div className="flex items-center gap-1.5">
                    <Smartphone size={14} className="text-accent" />
                    <span>Mobile Notes View</span>
                  </div>
                  <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md font-mono">
                    Typing...
                  </span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-stone-200/80 shadow-2xs space-y-1.5">
                  <h4 className="text-xs font-bold text-stone-900">Sprint Strategy & Launch</h4>
                  <p className="text-xs text-stone-600">
                    • Pair phone via fast QR scanner
                  </p>
                  <p className="text-xs text-stone-600">
                    • Highlight essential text in <span className="bg-yellow-200 px-1 py-0.2 rounded font-semibold text-yellow-900">Lemon Pastel</span>
                  </p>
                  <p className="text-xs text-accent font-medium animate-pulse">
                    • Ready to push to production 🚀
                  </p>
                </div>
              </div>

              {/* Laptop Note View */}
              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-stone-700 pb-2 border-b border-stone-200">
                  <div className="flex items-center gap-1.5">
                    <Laptop size={14} className="text-accent" />
                    <span>Laptop Notes Canvas</span>
                  </div>
                  <span className="text-[10px] text-stone-500 bg-white px-2 py-0.5 rounded-md border border-stone-200 font-mono">
                    Auto-saved
                  </span>
                </div>
                <div className="bg-white rounded-lg p-3 border border-stone-200/80 shadow-2xs space-y-1.5">
                  <h4 className="text-xs font-bold text-stone-900">Sprint Strategy & Launch</h4>
                  <p className="text-xs text-stone-600">
                    • Pair phone via fast QR scanner
                  </p>
                  <p className="text-xs text-stone-600">
                    • Highlight essential text in <span className="bg-yellow-200 px-1 py-0.2 rounded font-semibold text-yellow-900">Lemon Pastel</span>
                  </p>
                  <p className="text-xs text-stone-800 font-medium">
                    • Ready to push to production 🚀<span className="animate-pulse text-accent font-bold">|</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODE 3: Instant QR Pairing */}
        {activeTab === "pairing" && (
          <div className="rounded-2xl border border-stone-200 bg-white p-5 sm:p-6 shadow-sm">
            <div className="max-w-2xl mx-auto text-center space-y-2 mb-6">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                <ShieldCheck size={13} />
                <span>Zero Installation, Zero Password</span>
              </span>
              <h3 className="text-xl font-bold tracking-tight text-stone-900">
                1-Second QR Code Connection
              </h3>
              <p className="text-xs text-stone-500 leading-relaxed max-w-lg mx-auto">
                No apps from App Store or Google Play. No typing 16-character passwords. Just open the camera app on your phone and point it at the laptop screen.
              </p>
            </div>

            {/* 3 Step Visual Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto">
              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 text-center">
                <span className="inline-grid size-8 place-items-center rounded-lg bg-accent text-white font-bold text-xs mb-2">
                  1
                </span>
                <div className="text-xs font-bold text-stone-900">Open on Laptop</div>
                <div className="text-[11px] text-stone-500 mt-1 leading-snug">
                  Click Guest Sync to generate a secure ephemeral token.
                </div>
              </div>

              <div className="rounded-xl border border-accent/40 bg-accent/5 p-4 text-center ring-1 ring-accent/20">
                <span className="inline-grid size-8 place-items-center rounded-lg bg-accent text-white font-bold text-xs mb-2">
                  2
                </span>
                <div className="text-xs font-bold text-accent">Scan with Phone</div>
                <div className="text-[11px] text-stone-600 mt-1 leading-snug">
                  Default camera app scans QR code and opens instant session.
                </div>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50/70 p-4 text-center">
                <span className="inline-grid size-8 place-items-center rounded-lg bg-accent text-white font-bold text-xs mb-2">
                  3
                </span>
                <div className="text-xs font-bold text-stone-900">Stream Freely</div>
                <div className="text-[11px] text-stone-500 mt-1 leading-snug">
                  Closing the tab automatically clears all memory and cache.
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

