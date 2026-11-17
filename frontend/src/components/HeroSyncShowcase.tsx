"use client";

import { useEffect, useState, useRef } from "react";
import { motion } from "motion/react";
import {
  Smartphone,
  Monitor,
  Zap,
  ArrowRight,
  Check,
  CheckCircle2,
  Copy,
  Lock,
  FileText,
  Sparkles,
  Wifi,
} from "lucide-react";

interface SimpleExample {
  id: string;
  chipLabel: string;
  sourceApp: string;
  value: string;
  targetApp: string;
  shortValue: string;
}

const EXAMPLES: SimpleExample[] = [
  {
    id: "otp",
    chipLabel: "🔐 2FA Code",
    sourceApp: "SMS Messages",
    value: "849 210",
    shortValue: "849 210",
    targetApp: "Desktop Login",
  },
  {
    id: "link",
    chipLabel: "🔗 Website Link",
    sourceApp: "Mobile Browser",
    value: "figma.com/design/app",
    shortValue: "figma.com/design",
    targetApp: "Chrome on Desktop",
  },
  {
    id: "address",
    chipLabel: "📝 Quick Note",
    sourceApp: "WhatsApp / Notes",
    value: "Meeting at 4:30 PM",
    shortValue: "Meeting at 4:30 PM",
    targetApp: "Slack on Desktop",
  },
];

export function HeroSyncShowcase() {
  const [activeTab, setActiveTab] = useState<"clipboard" | "notes">("clipboard");
  const [activeIndex, setActiveIndex] = useState(0);
  const [stage, setStage] = useState<"copying" | "beaming" | "received">("received");
  const cycleTimerRef = useRef<NodeJS.Timeout | null>(null);

  const current = EXAMPLES[activeIndex];

  // Auto-play cycle for clipboard sync
  useEffect(() => {
    if (activeTab !== "clipboard") return;

    let isMounted = true;

    const runLoop = () => {
      if (!isMounted) return;

      // Stage 1: Phone taps copy
      setStage("copying");

      cycleTimerRef.current = setTimeout(() => {
        if (!isMounted) return;
        // Stage 2: Beams across to laptop
        setStage("beaming");

        cycleTimerRef.current = setTimeout(() => {
          if (!isMounted) return;
          // Stage 3: Received on laptop
          setStage("received");

          cycleTimerRef.current = setTimeout(() => {
            if (!isMounted) return;
            // Switch to next example
            setActiveIndex((prev) => (prev + 1) % EXAMPLES.length);
          }, 2800);
        }, 900);
      }, 1100);
    };

    runLoop();

    return () => {
      isMounted = false;
      if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
    };
  }, [activeTab, activeIndex]);

  const handleSelectExample = (idx: number) => {
    if (cycleTimerRef.current) clearTimeout(cycleTimerRef.current);
    setActiveIndex(idx);
    setStage("copying");

    setTimeout(() => {
      setStage("beaming");
      setTimeout(() => {
        setStage("received");
      }, 700);
    }, 600);
  };

  return (
    <div className="w-full max-w-4xl mx-auto overflow-hidden rounded-3xl border border-stone-200/90 bg-[#FAF9F6] p-3 sm:p-5 md:p-6 shadow-xl shadow-stone-200/50">
      {/* 1. Simple, Clean Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2.5 border-b border-stone-200/80 pb-3 px-1">
        <div className="flex items-center gap-2">
          <span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-bold text-stone-800 uppercase tracking-wide">
            Live Cross-Device Demo
          </span>
          <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2 py-0.5 text-[10px] font-semibold">
            0ms Delay
          </span>
        </div>

        {/* 2 Clean Mode Switchers */}
        <div className="flex items-center gap-1 rounded-xl bg-stone-200/70 p-0.5 border border-stone-200">
          <button
            type="button"
            onClick={() => setActiveTab("clipboard")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              activeTab === "clipboard"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <Zap size={13} className={activeTab === "clipboard" ? "text-accent" : ""} />
            <span>Instant Clipboard</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("notes")}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition cursor-pointer ${
              activeTab === "notes"
                ? "bg-white text-stone-900 shadow-2xs"
                : "text-stone-600 hover:text-stone-900"
            }`}
          >
            <FileText size={13} className={activeTab === "notes" ? "text-accent" : ""} />
            <span>Live Notes Sync</span>
          </button>
        </div>
      </div>

      {/* 2. Simple Example Selection Pills */}
      {activeTab === "clipboard" && (
        <div className="mt-3.5 flex items-center justify-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="text-[11px] text-stone-500 font-medium hidden xs:inline">Try:</span>
          {EXAMPLES.map((ex, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={ex.id}
                type="button"
                onClick={() => handleSelectExample(idx)}
                className={`flex items-center gap-1 rounded-full px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs font-medium transition cursor-pointer border ${
                  isSelected
                    ? "bg-accent text-white border-accent shadow-xs scale-102"
                    : "bg-white border-stone-200 text-stone-700 hover:bg-stone-50"
                }`}
              >
                <span>{ex.chipLabel}</span>
                {isSelected && <span className="size-1.5 rounded-full bg-white animate-ping" />}
              </button>
            );
          })}
        </div>
      )}

      {/* 3. MAIN ARENA: 100% HORIZONTAL ON BOTH MOBILE AND DESKTOP */}
      <div className="mt-4 sm:mt-6">
        {activeTab === "clipboard" ? (
          <div className="flex items-center justify-between gap-1.5 sm:gap-4 md:gap-6 w-full max-w-full">
            
            {/* DEVICE 1: COMPACT PHONE (LEFT - SMALLER THAN DESKTOP) */}
            <div className="flex-none w-[115px] sm:w-[175px] md:w-[195px] flex flex-col items-center">
              {/* Phone Frame */}
              <div className="w-full rounded-[1.1rem] sm:rounded-[1.75rem] border-2 sm:border-[2.5px] border-stone-800 bg-stone-900 p-0.5 sm:p-1.5 shadow-lg">
                <div className="relative overflow-hidden rounded-[0.9rem] sm:rounded-[1.4rem] bg-white border border-stone-200 flex flex-col h-[155px] sm:h-[200px]">
                  
                  {/* Phone Top Bar */}
                  <div className="h-4 sm:h-5 px-1.5 sm:px-2.5 pt-0.5 flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-stone-600 bg-stone-50 border-b border-stone-100">
                    <span>9:41</span>
                    {/* Notch */}
                    <div className="h-1.5 sm:h-2 w-7 sm:w-11 rounded-full bg-stone-800" />
                    <Wifi size={9} className="text-stone-500" />
                  </div>

                  {/* Phone Header */}
                  <div className="px-1.5 sm:px-2 py-0.5 sm:py-1 bg-stone-50/80 border-b border-stone-100 flex items-center justify-between">
                    <span className="text-[8px] sm:text-[9px] font-bold text-stone-800">Phone</span>
                    <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  </div>

                  {/* Phone Content */}
                  <div className="p-1.5 sm:p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-[7.5px] sm:text-[9px] uppercase font-bold text-stone-400 truncate">
                        {current.sourceApp}
                      </div>

                      {/* Copied Value Box */}
                      <motion.div
                        animate={
                          stage === "copying"
                            ? { scale: [1, 1.04, 1], borderColor: ["#e7e5e4", "#506230", "#e7e5e4"] }
                            : {}
                        }
                        transition={{ duration: 0.4 }}
                        className={`mt-1 sm:mt-1.5 rounded-md sm:rounded-lg border p-1 sm:p-1.5 bg-stone-50 text-center transition-all ${
                          stage === "copying" ? "ring-2 ring-accent/30 bg-accent/5 border-accent" : "border-stone-200"
                        }`}
                      >
                        <span className="block font-mono text-[9.5px] sm:text-xs font-bold text-stone-900 truncate">
                          {current.value}
                        </span>
                      </motion.div>
                    </div>

                    {/* Copy Button */}
                    <div className="mt-auto">
                      <motion.div
                        animate={stage === "copying" ? { scale: [1, 0.95, 1] } : {}}
                        className={`w-full py-1 sm:py-1.5 px-1 rounded-md sm:rounded-lg flex items-center justify-center gap-1 text-[8.5px] sm:text-[11px] font-bold transition-all ${
                          stage === "copying"
                            ? "bg-accent text-white shadow-xs"
                            : "bg-stone-800 text-white"
                        }`}
                      >
                        {stage === "copying" ? (
                          <>
                            <Check size={10} strokeWidth={2.5} />
                            <span>Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy size={10} />
                            <span>1-Tap Copy</span>
                          </>
                        )}
                      </motion.div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Caption */}
              <div className="mt-1.5 text-center">
                <div className="text-[9.5px] sm:text-xs font-bold text-stone-800">1. Copy on Phone</div>
                <div className="text-[8px] sm:text-[9.5px] text-stone-500">No app install</div>
              </div>
            </div>

            {/* SYNC BEAM (MIDDLE) */}
            <div className="w-8 sm:w-16 md:w-20 shrink-0 flex flex-col items-center justify-center">
              <div className="relative w-full flex flex-col items-center gap-1">
                {/* Horizontal Pulse Line */}
                <div className="w-full h-0.5 sm:h-1 bg-stone-200 rounded-full relative overflow-hidden">
                  <motion.div
                    animate={{
                      x: stage === "beaming" ? ["-100%", "100%"] : "100%",
                      opacity: stage === "beaming" ? [0, 1, 0] : 0,
                    }}
                    transition={{
                      duration: 0.7,
                      repeat: stage === "beaming" ? Infinity : 0,
                      ease: "easeInOut",
                    }}
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-accent to-transparent h-full w-full"
                  />
                </div>

                {/* Animated Transmission Indicator */}
                <motion.div
                  animate={
                    stage === "beaming"
                      ? { scale: [1, 1.15, 1] }
                      : {}
                  }
                  transition={{ duration: 0.4, repeat: stage === "beaming" ? Infinity : 0 }}
                  className={`flex items-center justify-center rounded-full p-1 sm:px-2 sm:py-0.5 shadow-xs border transition-all ${
                    stage === "beaming"
                      ? "bg-accent text-white border-accent shadow-accent/30"
                      : "bg-white text-stone-600 border-stone-200"
                  }`}
                >
                  <Zap size={11} className={stage === "beaming" ? "animate-spin text-white" : "text-accent"} />
                  <span className="hidden sm:inline text-[9px] font-bold ml-1">
                    {stage === "beaming" ? "Beaming" : "0.1s"}
                  </span>
                </motion.div>

                <ArrowRight size={11} className="text-stone-400 -mt-0.5" />
              </div>
            </div>

            {/* DEVICE 2: PROMINENT DESKTOP MONITOR (RIGHT - BIGGER & WIDER) */}
            <div className="flex-1 min-w-0 max-w-[200px] sm:max-w-[340px] md:max-w-[380px] flex flex-col items-center">
              {/* Desktop Monitor Shell */}
              <div className="w-full flex flex-col items-center">
                {/* Monitor Display Screen */}
                <div className="w-full rounded-xl sm:rounded-2xl border-2 sm:border-[3px] border-stone-800 bg-stone-900 p-1 sm:p-2 shadow-xl">
                  <div className="relative overflow-hidden rounded-lg sm:rounded-xl bg-white border border-stone-200 flex flex-col h-[175px] sm:h-[225px]">
                    
                    {/* Desktop Window Header (macOS Traffic Lights) */}
                    <div className="h-4 sm:h-5 px-1.5 sm:px-2.5 flex items-center justify-between text-[8px] sm:text-[9px] font-bold text-stone-500 bg-stone-100 border-b border-stone-200">
                      <div className="flex items-center gap-[3px] sm:gap-1">
                        <span className="size-[5px] sm:size-[7px] rounded-full bg-red-400" />
                        <span className="size-[5px] sm:size-[7px] rounded-full bg-amber-400" />
                        <span className="size-[5px] sm:size-[7px] rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-[7.5px] sm:text-[9px] font-mono text-stone-400 truncate">
                        copysync.app
                      </span>
                      <Lock size={8} className="text-stone-400" />
                    </div>

                    {/* Desktop App Header */}
                    <div className="px-1.5 sm:px-2.5 py-0.5 sm:py-1 bg-stone-50/80 border-b border-stone-100 flex items-center justify-between">
                      <span className="text-[8.5px] sm:text-[10px] font-bold text-stone-800 truncate">
                        {current.targetApp}
                      </span>
                      <span className="text-[7px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1 sm:px-1.5 py-px rounded">
                        Live
                      </span>
                    </div>

                    {/* Desktop Screen Content */}
                    <div className="p-1.5 sm:p-3 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-[7.5px] sm:text-[9px] uppercase font-bold text-stone-400">
                          Received on Desktop:
                        </div>

                        {/* Received Value Box */}
                        <motion.div
                          animate={
                            stage === "received"
                              ? { scale: [1, 1.03, 1], borderColor: ["#e7e5e4", "#10b981", "#e7e5e4"] }
                              : {}
                          }
                          transition={{ duration: 0.4 }}
                          className={`mt-1 sm:mt-2 rounded-md sm:rounded-lg border p-1.5 sm:p-2.5 text-center transition-all ${
                            stage === "received"
                              ? "bg-emerald-50/70 border-emerald-300 ring-1 sm:ring-2 ring-emerald-200"
                              : "bg-stone-50 border-stone-200 opacity-60"
                          }`}
                        >
                          <span className="block font-mono text-[10px] sm:text-xs md:text-sm font-bold text-stone-900 truncate">
                            {current.value}
                          </span>
                        </motion.div>
                      </div>

                      {/* Paste Feedback Badge */}
                      <div className="mt-auto">
                        <div
                          className={`w-full py-1 sm:py-1.5 px-1 rounded-md sm:rounded-lg flex items-center justify-center gap-1 text-[8.5px] sm:text-[10px] font-bold transition-all ${
                            stage === "received"
                              ? "bg-emerald-600 text-white shadow-xs"
                              : "bg-stone-100 text-stone-400"
                          }`}
                        >
                          <CheckCircle2 size={10} strokeWidth={2.5} />
                          <span>Ctrl + V Ready!</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Monitor Stand Neck */}
                <div className="w-7 sm:w-11 h-2.5 sm:h-3.5 bg-gradient-to-b from-stone-400 via-stone-300 to-stone-400 border-x border-stone-400 shadow-inner" />
                {/* Monitor Stand Base Foot */}
                <div className="w-18 sm:w-28 h-1 sm:h-1.5 bg-gradient-to-r from-stone-400 via-stone-300 to-stone-400 rounded-full shadow-md border border-stone-400/90" />
              </div>

              {/* Caption */}
              <div className="mt-1.5 text-center">
                <div className="text-[9.5px] sm:text-xs font-bold text-stone-800">2. Ready on Desktop</div>
                <div className="text-[8px] sm:text-[9.5px] text-stone-500">Just press Ctrl+V</div>
              </div>
            </div>

          </div>
        ) : (
          /* LIVE NOTES SYNC VIEW: ALSO COMPACT PHONE + PROMINENT DESKTOP */
          <div className="flex items-center justify-between gap-1.5 sm:gap-4 md:gap-6 w-full max-w-full">
            {/* Phone Note Editor (Smaller) */}
            <div className="flex-none w-[115px] sm:w-[175px] md:w-[195px]">
              <div className="rounded-lg sm:rounded-xl border border-stone-200 bg-white p-2 sm:p-3 shadow-sm h-[160px] sm:h-[195px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-stone-100 pb-1 mb-1.5">
                    <span className="text-[8.5px] sm:text-[11px] font-bold text-stone-800 flex items-center gap-1">
                      <Smartphone size={10} className="text-accent" />
                      <span>Phone</span>
                    </span>
                    <span className="text-[7.5px] sm:text-[9px] text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded font-mono">
                      Typing...
                    </span>
                  </div>
                  <div className="space-y-0.5 sm:space-y-1 text-[8.5px] sm:text-[11px] text-stone-700">
                    <div className="font-bold text-stone-900 truncate">Project Launch 🚀</div>
                    <div>• Scan QR code</div>
                    <div>• <span className="bg-yellow-200 px-0.5 rounded text-yellow-900">Highlight text</span></div>
                    <div className="text-accent font-medium">• Instant sync ⚡️</div>
                  </div>
                </div>
                <div className="text-[8px] sm:text-[9px] text-stone-400 text-center border-t border-stone-100 pt-0.5">
                  1. Type on phone
                </div>
              </div>
            </div>

            {/* Sync Beam */}
            <div className="w-8 sm:w-16 md:w-20 shrink-0 flex flex-col items-center justify-center">
              <div className="flex items-center justify-center size-6 sm:size-8 rounded-full bg-accent text-white shadow-sm animate-pulse">
                <Sparkles size={11} />
              </div>
              <span className="text-[8px] sm:text-[10px] font-bold text-accent mt-0.5">Live Mirror</span>
            </div>

            {/* Desktop Note Canvas (Bigger & Wider) */}
            <div className="flex-1 min-w-0 max-w-[200px] sm:max-w-[340px] md:max-w-[380px]">
              <div className="rounded-xl sm:rounded-2xl border border-stone-200 bg-white p-2.5 sm:p-4 shadow-sm h-[175px] sm:h-[215px] flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between border-b border-stone-100 pb-1.5 mb-2">
                    <span className="text-[9.5px] sm:text-xs font-bold text-stone-800 flex items-center gap-1">
                      <Monitor size={12} className="text-accent" />
                      <span>Desktop Workspace</span>
                    </span>
                    <span className="text-[8px] sm:text-[9px] text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded font-mono">
                      Auto-saved
                    </span>
                  </div>
                  <div className="space-y-1 text-[9.5px] sm:text-xs text-stone-700">
                    <div className="font-bold text-stone-900">Project Launch 🚀</div>
                    <div>• Scan QR code</div>
                    <div>• <span className="bg-yellow-200 px-1 rounded text-yellow-900">Highlight text</span></div>
                    <div className="text-stone-900 font-medium">
                      • Instant sync ⚡️<span className="animate-pulse text-accent font-bold">|</span>
                    </div>
                  </div>
                </div>
                <div className="text-[8.5px] sm:text-[9px] text-stone-400 text-center border-t border-stone-100 pt-1">
                  2. Appears on desktop
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. Simple Bottom Summary Tag */}
      <div className="mt-4 pt-3 border-t border-stone-200/80 flex items-center justify-center text-center">
        <p className="text-[11px] sm:text-xs text-stone-600 font-medium">
          💡 <span className="font-semibold text-stone-900">No messaging apps needed.</span> Whatever you copy on phone is already on your desktop clipboard!
        </p>
      </div>
    </div>
  );
}
