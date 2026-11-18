"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  Clipboard, 
  ArrowRight, 
  Check, 
  QrCode, 
  FileText, 
  Zap, 
  ShieldCheck, 
  Monitor, 
  Smartphone,
  Menu,
  X
} from "lucide-react";
import { HeaderAuthStatus } from "@/components/HeaderAuthStatus";

interface ExampleItem {
  label: string;
  phoneApp: string;
  caption: string;
  value: string;
  deskTitle: string;
  deskLabel: string;
}

const EXAMPLES: ExampleItem[] = [
  {
    label: "2FA code",
    phoneApp: "Messages",
    caption: "Your verification code is",
    value: "482913",
    deskTitle: "Sign in to your account",
    deskLabel: "Verification code",
  },
  {
    label: "Link",
    phoneApp: "Safari",
    caption: "Shared with you",
    value: "github.com/copysync",
    deskTitle: "New tab",
    deskLabel: "Address",
  },
  {
    label: "Snippet",
    phoneApp: "Notes",
    caption: "Meeting reminder",
    value: "Standup moved to 4 PM, Room 2",
    deskTitle: "Team chat",
    deskLabel: "Message #general",
  },
];

export default function Home() {
  const [selectedEx, setSelectedEx] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const cur = EXAMPLES[selectedEx];

  return (
    <div id="top" className="min-h-screen bg-[#FAF9F6] text-[#292824] font-sans antialiased selection:bg-[#737B5B]/20">
      {/* =========================================================================
          NAVBAR
          ========================================================================= */}
      <header className="sticky top-0 z-40 border-b border-[#E8E4DC] bg-[#FAF9F6]/95 backdrop-blur-md">
        <div className="mx-auto flex h-16 sm:h-[72px] max-w-[1160px] items-center justify-between gap-4 px-4 sm:px-6">
          {/* Logo */}
          <Link href="#top" className="flex items-center gap-2.5 font-bold text-lg text-[#292824] hover:text-[#646C4D] transition-colors shrink-0">
            <span className="grid size-8 place-items-center rounded-md bg-[#737B5B] text-white shadow-2xs">
              <Clipboard size={18} strokeWidth={2.2} />
            </span>
            <span className="tracking-tight">CopySync</span>
          </Link>

          {/* Desktop Nav Links */}
          <nav aria-label="Primary" className="hidden md:flex items-center gap-7 text-[15px] font-medium text-[#6B6861]">
            <Link href="#how-it-works" className="hover:text-[#646C4D] transition-colors">How it works</Link>
            <Link href="#features" className="hover:text-[#646C4D] transition-colors">Features</Link>
            <Link href="#compare" className="hover:text-[#646C4D] transition-colors">Why CopySync</Link>
            <Link href="#faq" className="hover:text-[#646C4D] transition-colors">FAQ</Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden sm:block">
              <HeaderAuthStatus />
            </div>

            <Link
              href="/guest"
              className="inline-flex items-center gap-2 min-h-[40px] sm:min-h-[44px] px-3.5 sm:px-4.5 rounded-md bg-[#646C4D] text-white text-xs sm:text-[15px] font-semibold transition hover:bg-[#52593e] active:scale-[0.98] shadow-2xs"
            >
              <QrCode size={16} className="hidden sm:inline" />
              <span>Start guest sync</span>
            </Link>

            {/* Mobile Hamburger toggle */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden grid size-10 place-items-center rounded-md border border-[#E8E4DC] text-[#292824] hover:bg-[#F2EBDD] transition"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="md:hidden border-b border-[#E8E4DC] bg-[#FAF9F6] px-5 py-4 space-y-3">
            <nav className="flex flex-col gap-2.5 text-sm font-medium text-[#6B6861]">
              <Link
                href="#how-it-works"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#646C4D]"
              >
                How it works
              </Link>
              <Link
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#646C4D]"
              >
                Features
              </Link>
              <Link
                href="#compare"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#646C4D]"
              >
                Why CopySync
              </Link>
              <Link
                href="#faq"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-[#646C4D]"
              >
                FAQ
              </Link>
            </nav>
            <div className="pt-2 border-t border-[#E8E4DC] flex items-center justify-between">
              <HeaderAuthStatus />
            </div>
          </div>
        )}
      </header>

      <main>
        {/* =========================================================================
            HERO SECTION
            ========================================================================= */}
        <section aria-labelledby="hero-title" className="pt-12 sm:pt-20 pb-8 px-4 sm:px-6">
          <div className="max-w-[960px] mx-auto text-center">
            {/* Pill Badge */}
            <p className="inline-flex items-center gap-2 mb-6 px-3 py-1.5 border border-[#E8E4DC] rounded-md bg-white text-xs sm:text-[13px] font-medium text-[#6B6861] shadow-2xs">
              <span className="size-1.5 rounded-full bg-[#737B5B]" />
              <span>Free clipboard and notes sync for any phone and computer</span>
            </p>

            {/* Main Headline */}
            <h1
              id="hero-title"
              className="text-4xl sm:text-6xl lg:text-[68px] font-bold text-[#292824] tracking-[-0.035em] leading-[1.08] sm:leading-[1.04]"
            >
              Copy on your phone. <br />
              <span className="text-[#737B5B]">Paste on your computer.</span>
            </h1>

            {/* Subheading */}
            <p className="mt-5 sm:mt-6 max-w-[620px] mx-auto text-base sm:text-lg lg:text-[19px] leading-[1.6] text-[#6B6861]">
              Scan one QR code and everything you copy on your phone lands on your computer clipboard. No app to install, no account to create, nothing left behind.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 sm:mt-9 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/guest"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[50px] sm:min-h-[52px] px-6 rounded-md bg-[#646C4D] text-white text-[15px] sm:text-base font-semibold transition hover:bg-[#52593e] active:scale-[0.98] shadow-xs"
              >
                <QrCode size={18} />
                <span>Start instant sync, no login</span>
                <ArrowRight size={16} />
              </Link>
              <Link
                href="/notes"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[50px] sm:min-h-[52px] px-6 rounded-md bg-white border border-[#E8E4DC] text-[#292824] text-[15px] sm:text-base font-semibold transition hover:bg-[#F2EBDD]/60 active:scale-[0.98] shadow-2xs"
              >
                <FileText size={18} />
                <span>Open notes workspace</span>
              </Link>
            </div>

            {/* Value bullets */}
            <ul className="mt-7 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs sm:text-sm text-[#6B6861] list-none p-0">
              <li className="flex items-center gap-1.5">
                <Check size={16} className="text-[#646C4D]" strokeWidth={2.4} />
                <span>Zero app install</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check size={16} className="text-[#646C4D]" strokeWidth={2.4} />
                <span>No sign-up required</span>
              </li>
              <li className="flex items-center gap-1.5">
                <Check size={16} className="text-[#646C4D]" strokeWidth={2.4} />
                <span>Session wiped automatically</span>
              </li>
            </ul>
          </div>

          {/* =====================================================================
              HERO INTERACTIVE DEMO (PICK SOMETHING TO COPY)
              ===================================================================== */}
          <div className="max-w-[960px] mx-auto mt-10 sm:mt-14 border border-[#E8E4DC] rounded-lg bg-white p-4 sm:p-6 shadow-[0_1px_3px_rgba(41,40,36,0.06)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-[#6B6861]">
                Try it: pick something to copy
              </p>
              {/* Chips */}
              <div className="flex items-center gap-2 flex-wrap" role="group" aria-label="Choose an example">
                {EXAMPLES.map((item, idx) => {
                  const isActive = idx === selectedEx;
                  return (
                    <button
                      key={item.label}
                      type="button"
                      onClick={() => setSelectedEx(idx)}
                      aria-pressed={isActive}
                      className={`min-h-[38px] sm:min-h-[44px] px-3.5 sm:px-4 rounded-md text-xs sm:text-sm font-semibold transition cursor-pointer ${
                        isActive
                          ? "bg-[#646C4D] text-white border border-[#646C4D]"
                          : "bg-white text-[#292824] border border-[#E8E4DC] hover:bg-[#F2EBDD]/50"
                      }`}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Visual Cards: Phone <-> Synced <-> Computer */}
            <div className="mt-5 flex flex-col md:flex-row gap-4 items-stretch text-left">
              {/* Phone card */}
              <div className="flex-1 min-w-0 border border-[#E8E4DC] rounded-lg bg-[#FAF9F6] flex flex-col">
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#E8E4DC] text-xs sm:text-[13px] text-[#6B6861]">
                  <span className="flex items-center gap-2 font-semibold text-[#292824]">
                    <Smartphone size={16} className="text-[#646C4D]" />
                    <span>Your phone</span>
                  </span>
                  <span className="font-medium">{cur.phoneApp}</span>
                </div>
                <div className="p-4 sm:p-5 flex flex-col gap-3.5 flex-1">
                  <p className="text-xs sm:text-sm text-[#6B6861] m-0">{cur.caption}</p>
                  <div className="p-3.5 sm:p-4 border border-[#E8E4DC] rounded-md bg-white font-mono text-base sm:text-lg font-semibold text-[#292824] break-all select-all">
                    {cur.value}
                  </div>
                  <div className="mt-auto flex items-center justify-center gap-2 min-h-[40px] sm:min-h-[44px] rounded-md bg-[#646C4D] text-white text-xs sm:text-sm font-semibold">
                    <Check size={16} strokeWidth={2.4} />
                    <span>Copied</span>
                  </div>
                </div>
              </div>

              {/* Connector */}
              <div className="flex flex-row md:flex-col items-center justify-center gap-2 self-center py-2 md:py-0 px-1 shrink-0">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-[#737B5B] bg-[#F2EBDD] text-[#4F563C] text-xs sm:text-[13px] font-semibold shadow-2xs">
                  <Zap size={14} strokeWidth={2.2} />
                  <span>Synced</span>
                </span>
              </div>

              {/* Computer card */}
              <div className="flex-1 min-w-0 border border-[#E8E4DC] rounded-lg bg-[#FAF9F6] flex flex-col">
                <div className="flex justify-between items-center px-4 py-3 border-b border-[#E8E4DC] text-xs sm:text-[13px] text-[#6B6861]">
                  <span className="flex items-center gap-2 font-semibold text-[#292824]">
                    <Monitor size={16} className="text-[#646C4D]" />
                    <span>Your computer</span>
                  </span>
                  <span className="font-mono text-xs text-[#6B6861]">copysync.app</span>
                </div>
                <div className="p-4 sm:p-5 flex flex-col gap-2 flex-1">
                  <p className="text-sm sm:text-base font-semibold text-[#292824] m-0">{cur.deskTitle}</p>
                  <p className="mt-1 text-xs sm:text-[13px] text-[#6B6861] m-0">{cur.deskLabel}</p>
                  <div className="p-3.5 sm:p-4 border border-[#737B5B] rounded-md bg-white shadow-[0_0_0_3px_rgba(115,123,91,0.18)] font-mono text-base sm:text-lg font-semibold text-[#292824] break-all select-all">
                    {cur.value}
                  </div>
                  <p className="mt-auto pt-3 flex items-center gap-2 text-xs sm:text-[13px] text-[#6B6861]">
                    <kbd className="px-2 py-0.5 border border-[#E8E4DC] rounded bg-[#F2EBDD] font-mono text-xs font-semibold text-[#292824]">Ctrl</kbd>
                    <span>+</span>
                    <kbd className="px-2 py-0.5 border border-[#E8E4DC] rounded bg-[#F2EBDD] font-mono text-xs font-semibold text-[#292824]">V</kbd>
                    <span>Pasted straight from your phone</span>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* =========================================================================
            WORKS WITH PLATFORMS BAR
            ========================================================================= */}
        <section aria-label="Supported devices" className="py-8 px-4 sm:px-6">
          <p className="text-center text-xs sm:text-sm text-[#6B6861] leading-relaxed max-w-2xl mx-auto">
            Works in any modern browser: <strong className="text-[#292824] font-semibold">iPhone</strong> · <strong className="text-[#292824] font-semibold">Android</strong> · <strong className="text-[#292824] font-semibold">Windows</strong> · <strong className="text-[#292824] font-semibold">macOS</strong> · <strong className="text-[#292824] font-semibold">Linux</strong> · <strong className="text-[#292824] font-semibold">ChromeOS</strong>
          </p>
        </section>

        {/* =========================================================================
            HOW IT WORKS SECTION
            ========================================================================= */}
        <section id="how-it-works" aria-labelledby="how-title" className="pt-16 sm:pt-24 pb-8 px-4 sm:px-6">
          <div className="max-w-[1160px] mx-auto">
            <div className="text-center max-w-[640px] mx-auto">
              <p className="text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-[#4F563C]">
                How it works
              </p>
              <h2 id="how-title" className="mt-2.5 text-3xl sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.15] text-[#292824]">
                Sync in three simple steps
              </h2>
              <p className="mt-3.5 text-base sm:text-[17px] leading-[1.6] text-[#6B6861]">
                No app to download and no verification email. You are connected in about the time it takes to scan a code.
              </p>
            </div>

            <ol className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-5 list-none p-0">
              {/* Step 1 */}
              <li className="border border-[#E8E4DC] rounded-lg bg-white overflow-hidden flex flex-col shadow-2xs">
                <div className="h-[168px] bg-[#F2EBDD] grid place-items-center">
                  <div className="w-[200px] border border-[#E8E4DC] rounded-md bg-white shadow-[0_1px_2px_rgba(41,40,36,0.06)]">
                    <div className="flex gap-1.5 p-2 border-b border-[#E8E4DC]">
                      <span className="size-1.5 rounded-full bg-[#E8E4DC]" />
                      <span className="size-1.5 rounded-full bg-[#E8E4DC]" />
                      <span className="size-1.5 rounded-full bg-[#E8E4DC]" />
                    </div>
                    <div className="p-3 grid place-items-center">
                      <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true">
                        <g fill="#292824">
                          <rect x="0" y="0" width="26" height="26" />
                          <rect x="58" y="0" width="26" height="26" />
                          <rect x="0" y="58" width="26" height="26" />
                          <rect x="34" y="4" width="8" height="8" />
                          <rect x="34" y="20" width="8" height="8" />
                          <rect x="34" y="36" width="8" height="8" />
                          <rect x="50" y="36" width="8" height="8" />
                          <rect x="66" y="36" width="8" height="8" />
                          <rect x="4" y="36" width="8" height="8" />
                          <rect x="20" y="36" width="8" height="8" />
                          <rect x="34" y="52" width="8" height="8" />
                          <rect x="58" y="58" width="8" height="8" />
                          <rect x="74" y="58" width="8" height="8" />
                          <rect x="42" y="72" width="8" height="8" />
                          <rect x="66" y="74" width="8" height="8" />
                        </g>
                        <g fill="#fff">
                          <rect x="6" y="6" width="14" height="14" />
                          <rect x="64" y="6" width="14" height="14" />
                          <rect x="6" y="64" width="14" height="14" />
                        </g>
                        <g fill="#737B5B">
                          <rect x="10" y="10" width="6" height="6" />
                          <rect x="68" y="10" width="6" height="6" />
                          <rect x="10" y="68" width="6" height="6" />
                        </g>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-xs sm:text-[13px] font-semibold text-[#4F563C] m-0">Step 1</p>
                  <h3 className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight text-[#292824]">
                    Open on your computer
                  </h3>
                  <p className="mt-2.5 text-sm sm:text-[15px] leading-[1.6] text-[#6B6861]">
                    Visit CopySync and choose Guest Sync. A private, temporary QR code appears on your screen.
                  </p>
                </div>
              </li>

              {/* Step 2 */}
              <li className="border border-[#E8E4DC] rounded-lg bg-white overflow-hidden flex flex-col shadow-2xs">
                <div className="h-[168px] bg-[#F2EBDD] grid place-items-center">
                  <div className="relative w-[84px] h-[140px] border-2 border-[#292824] rounded-xl bg-white grid place-items-center shadow-xs">
                    <div className="size-12 border-2 border-dashed border-[#737B5B] rounded-md grid place-items-center">
                      <div className="size-5.5 bg-[#292824] opacity-85" />
                    </div>
                    <span className="absolute bottom-2 w-5 h-0.5 rounded-full bg-[#E8E4DC]" />
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-xs sm:text-[13px] font-semibold text-[#4F563C] m-0">Step 2</p>
                  <h3 className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight text-[#292824]">
                    Scan with your phone
                  </h3>
                  <p className="mt-2.5 text-sm sm:text-[15px] leading-[1.6] text-[#6B6861]">
                    Point your camera at the code. You land on a lightweight web page paired with your computer.
                  </p>
                </div>
              </li>

              {/* Step 3 */}
              <li className="border border-[#E8E4DC] rounded-lg bg-white overflow-hidden flex flex-col shadow-2xs">
                <div className="h-[168px] bg-[#F2EBDD] flex items-center justify-center gap-3">
                  <div className="px-3.5 py-2.5 border border-[#E8E4DC] rounded-md bg-white font-mono text-xs sm:text-sm font-semibold">
                    482913
                  </div>
                  <ArrowRight size={18} className="text-[#646C4D]" strokeWidth={2.4} />
                  <div className="px-3.5 py-2.5 border border-[#737B5B] rounded-md bg-white shadow-[0_0_0_3px_rgba(115,123,91,0.18)] font-mono text-xs sm:text-sm font-semibold">
                    482913
                  </div>
                </div>
                <div className="p-6 flex-1 flex flex-col">
                  <p className="text-xs sm:text-[13px] font-semibold text-[#4F563C] m-0">Step 3</p>
                  <h3 className="mt-1.5 text-lg sm:text-xl font-bold tracking-tight text-[#292824]">
                    Copy and paste freely
                  </h3>
                  <p className="mt-2.5 text-sm sm:text-[15px] leading-[1.6] text-[#6B6861]">
                    Text you copy on your phone goes straight to your computer clipboard. Close the tab to clear the session.
                  </p>
                </div>
              </li>
            </ol>
          </div>
        </section>

        {/* =========================================================================
            WHY COPYSYNC / FEATURES BENTO
            ========================================================================= */}
        <section id="features" aria-labelledby="features-title" className="pt-16 sm:pt-24 pb-8 px-4 sm:px-6">
          <div className="max-w-[1160px] mx-auto">
            <div className="text-center max-w-[640px] mx-auto">
              <p className="text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-[#4F563C]">
                Why CopySync
              </p>
              <h2 id="features-title" className="mt-2.5 text-3xl sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.15] text-[#292824]">
                Private, fast, and zero trace
              </h2>
            </div>

            {/* Row 1 */}
            <div className="mt-12 flex flex-col lg:flex-row gap-5">
              {/* Wide Bento Card 1 */}
              <article className="flex-[2] min-w-0 border border-[#E8E4DC] rounded-lg bg-white p-6 sm:p-8 shadow-2xs">
                <span className="grid size-10 rounded-md bg-[#F2EBDD] place-items-center text-[#4F563C]">
                  <Zap size={20} strokeWidth={2} />
                </span>
                <h3 className="mt-5 text-xl sm:text-[22px] font-bold tracking-tight text-[#292824]">
                  Instant transmission
                </h3>
                <p className="mt-2.5 max-w-[520px] text-sm sm:text-base leading-[1.6] text-[#6B6861]">
                  A direct real-time connection moves copied links, one-time codes, and text snippets to your computer as you copy them. No refresh, no send button.
                </p>
              </article>

              {/* Regular Bento Card 2 */}
              <article className="flex-1 min-w-0 border border-[#E8E4DC] rounded-lg bg-white p-6 sm:p-8 shadow-2xs">
                <span className="grid size-10 rounded-md bg-[#F2EBDD] place-items-center text-[#4F563C]">
                  <ShieldCheck size={20} strokeWidth={2} />
                </span>
                <h3 className="mt-5 text-xl sm:text-[22px] font-bold tracking-tight text-[#292824]">
                  Ephemeral and in memory
                </h3>
                <p className="mt-2.5 text-sm sm:text-base leading-[1.6] text-[#6B6861]">
                  A guest link pairs exactly one phone with one browser. Sessions expire after 5 minutes of inactivity.
                </p>
              </article>
            </div>

            {/* Row 2 */}
            <div className="mt-5 flex flex-col lg:flex-row gap-5">
              {/* Regular Bento Card 3 */}
              <article className="flex-1 min-w-0 border border-[#E8E4DC] rounded-lg bg-white p-6 sm:p-8 shadow-2xs">
                <span className="grid size-10 rounded-md bg-[#F2EBDD] place-items-center text-[#4F563C]">
                  <Monitor size={20} strokeWidth={2} />
                </span>
                <h3 className="mt-5 text-xl sm:text-[22px] font-bold tracking-tight text-[#292824]">
                  Nothing to install
                </h3>
                <p className="mt-2.5 text-sm sm:text-base leading-[1.6] text-[#6B6861]">
                  It runs in the browser you already have, on your work PC, a borrowed laptop, or a library computer.
                </p>
              </article>

              {/* Wide Bento Card 4 (with notes preview) */}
              <article className="flex-[2] min-w-0 border border-[#E8E4DC] rounded-lg bg-white p-6 sm:p-8 shadow-2xs flex flex-col md:flex-row gap-6 items-center">
                <div className="flex-1 min-w-0">
                  <span className="grid size-10 rounded-md bg-[#F2EBDD] place-items-center text-[#4F563C]">
                    <FileText size={20} strokeWidth={2} />
                  </span>
                  <h3 className="mt-5 text-xl sm:text-[22px] font-bold tracking-tight text-[#292824]">
                    A calm notes workspace
                  </h3>
                  <p className="mt-2.5 text-sm sm:text-base leading-[1.6] text-[#6B6861]">
                    Sign in with Google when you want notes that stay. Rich text, images, and auto-save, on every device.
                  </p>
                </div>

                <div className="w-full md:w-auto md:min-w-[220px] border border-[#E8E4DC] rounded-md bg-[#FAF9F6] p-4 shrink-0">
                  <p className="font-bold text-sm text-[#292824] m-0">Project notes</p>
                  <ul className="mt-2.5 list-none p-0 flex flex-col gap-2 text-xs sm:text-sm text-[#292824]">
                    <li className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[#737B5B]" />
                      <span>Launch checklist</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[#737B5B]" />
                      <span>Meeting links</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <span className="size-1.5 rounded-full bg-[#737B5B]" />
                      <span>Snippets to reuse</span>
                    </li>
                  </ul>
                  <p className="mt-3.5 text-[11px] sm:text-xs text-[#6B6861] m-0">Auto-saved</p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* =========================================================================
            COMPARE TABLE SECTION
            ========================================================================= */}
        <section id="compare" aria-labelledby="compare-title" className="pt-16 sm:pt-24 pb-8 px-4 sm:px-6">
          <div className="max-w-[960px] mx-auto">
            <div className="text-center max-w-[640px] mx-auto">
              <p className="text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-[#4F563C]">
                The old way vs CopySync
              </p>
              <h2 id="compare-title" className="mt-2.5 text-3xl sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.15] text-[#292824]">
                Why not just message yourself?
              </h2>
              <p className="mt-3.5 text-base sm:text-[17px] leading-[1.6] text-[#6B6861]">
                Chat apps and email were never built to move a 2FA code from phone to PC.
              </p>
            </div>

            {/* Responsive Table Wrapper with Horizontal Scroll */}
            <div className="mt-10 overflow-x-auto border border-[#E8E4DC] rounded-lg bg-white shadow-2xs">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm sm:text-[15px]">
                <caption className="sr-only">Comparison of messaging yourself, emailing yourself, and CopySync</caption>
                <thead>
                  <tr className="bg-[#FAF9F6]">
                    <th scope="col" className="p-4 sm:p-5 font-semibold text-[#6B6861] border-b border-[#E8E4DC] w-1/4"></th>
                    <th scope="col" className="p-4 sm:p-5 font-semibold text-[#6B6861] border-b border-[#E8E4DC] w-1/4">Message yourself</th>
                    <th scope="col" className="p-4 sm:p-5 font-semibold text-[#6B6861] border-b border-[#E8E4DC] w-1/4">Email yourself</th>
                    <th scope="col" className="p-4 sm:p-5 font-bold text-[#292824] border-b border-[#E8E4DC] bg-[#F2EBDD] w-1/4">CopySync</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E8E4DC]">
                  <tr>
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-[#292824]">Install or log in on computer</th>
                    <td className="p-4 sm:p-5 text-[#6B6861]">Yes, usually</td>
                    <td className="p-4 sm:p-5 text-[#6B6861]">Yes, open inbox</td>
                    <td className="p-4 sm:p-5 font-semibold text-[#292824] bg-[#F2EBDD]">No, scan a QR code</td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-[#292824]">Steps to move one code</th>
                    <td className="p-4 sm:p-5 text-[#6B6861]">Copy, open chat, paste, send, switch device, copy again</td>
                    <td className="p-4 sm:p-5 text-[#6B6861]">Compose, send, wait, open, copy</td>
                    <td className="p-4 sm:p-5 font-semibold text-[#292824] bg-[#F2EBDD]">Copy, then paste</td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-[#292824]">Leaves a record behind</th>
                    <td className="p-4 sm:p-5 text-[#6B6861]">Yes, in your chat history</td>
                    <td className="p-4 sm:p-5 text-[#6B6861]">Yes, in your inbox</td>
                    <td className="p-4 sm:p-5 font-semibold text-[#292824] bg-[#F2EBDD]">No, session is wiped</td>
                  </tr>
                  <tr>
                    <th scope="row" className="p-4 sm:p-5 font-semibold text-[#292824]">Works on shared / borrowed PC</th>
                    <td className="p-4 sm:p-5 text-[#6B6861]">Risky, you have to sign in</td>
                    <td className="p-4 sm:p-5 text-[#6B6861]">Risky, you have to sign in</td>
                    <td className="p-4 sm:p-5 font-semibold text-[#292824] bg-[#F2EBDD]">Yes, nothing to sign in to</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* =========================================================================
            USE CASES GRID
            ========================================================================= */}
        <section aria-labelledby="uses-title" className="pt-16 sm:pt-24 pb-8 px-4 sm:px-6">
          <div className="max-w-[1160px] mx-auto">
            <div className="text-center max-w-[680px] mx-auto">
              <p className="text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-[#4F563C]">
                Use cases
              </p>
              <h2 id="uses-title" className="mt-2.5 text-3xl sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.15] text-[#292824]">
                Move text between any two devices
              </h2>
            </div>

            <ul className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 list-none p-0">
              <li>
                <Link href="/guest" className="group block h-full border border-[#E8E4DC] rounded-lg bg-white p-6 transition hover:border-[#737B5B] shadow-2xs">
                  <h3 className="text-lg font-bold text-[#292824] m-0 group-hover:text-[#646C4D] transition-colors">
                    Phone to PC clipboard
                  </h3>
                  <p className="mt-2 text-sm sm:text-[15px] leading-[1.55] text-[#6B6861] m-0">
                    Copy anything on your phone and paste it on your computer with Ctrl+V.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3.5 text-sm font-semibold text-[#4F563C]">
                    <span>Learn more</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </li>

              <li>
                <Link href="/guest" className="group block h-full border border-[#E8E4DC] rounded-lg bg-white p-6 transition hover:border-[#737B5B] shadow-2xs">
                  <h3 className="text-lg font-bold text-[#292824] m-0 group-hover:text-[#646C4D] transition-colors">
                    iPhone to Windows
                  </h3>
                  <p className="mt-2 text-sm sm:text-[15px] leading-[1.55] text-[#6B6861] m-0">
                    Skip the missing Apple-to-Windows bridge. Just a browser on both sides.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3.5 text-sm font-semibold text-[#4F563C]">
                    <span>Learn more</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </li>

              <li>
                <Link href="/guest" className="group block h-full border border-[#E8E4DC] rounded-lg bg-white p-6 transition hover:border-[#737B5B] shadow-2xs">
                  <h3 className="text-lg font-bold text-[#292824] m-0 group-hover:text-[#646C4D] transition-colors">
                    Android to Mac
                  </h3>
                  <p className="mt-2 text-sm sm:text-[15px] leading-[1.55] text-[#6B6861] m-0">
                    Send links and snippets from an Android phone to a Mac in seconds.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3.5 text-sm font-semibold text-[#4F563C]">
                    <span>Learn more</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </li>

              <li>
                <Link href="/guest" className="group block h-full border border-[#E8E4DC] rounded-lg bg-white p-6 transition hover:border-[#737B5B] shadow-2xs">
                  <h3 className="text-lg font-bold text-[#292824] m-0 group-hover:text-[#646C4D] transition-colors">
                    2FA codes to your desktop
                  </h3>
                  <p className="mt-2 text-sm sm:text-[15px] leading-[1.55] text-[#6B6861] m-0">
                    Stop retyping six digits. Copy the SMS code and paste it into the login form.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3.5 text-sm font-semibold text-[#4F563C]">
                    <span>Learn more</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </li>

              <li>
                <Link href="/guest" className="group block h-full border border-[#E8E4DC] rounded-lg bg-white p-6 transition hover:border-[#737B5B] shadow-2xs">
                  <h3 className="text-lg font-bold text-[#292824] m-0 group-hover:text-[#646C4D] transition-colors">
                    Links to your laptop
                  </h3>
                  <p className="mt-2 text-sm sm:text-[15px] leading-[1.55] text-[#6B6861] m-0">
                    Found something on your phone? Open it on the big screen without messaging yourself.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3.5 text-sm font-semibold text-[#4F563C]">
                    <span>Learn more</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </li>

              <li>
                <Link href="/notes" className="group block h-full border border-[#E8E4DC] rounded-lg bg-white p-6 transition hover:border-[#737B5B] shadow-2xs">
                  <h3 className="text-lg font-bold text-[#292824] m-0 group-hover:text-[#646C4D] transition-colors">
                    Online notes across devices
                  </h3>
                  <p className="mt-2 text-sm sm:text-[15px] leading-[1.55] text-[#6B6861] m-0">
                    Keep rich-text notes that sync between your phone and computer.
                  </p>
                  <span className="inline-flex items-center gap-1 mt-3.5 text-sm font-semibold text-[#4F563C]">
                    <span>Learn more</span>
                    <ArrowRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </section>

        {/* =========================================================================
            FAQ ACCORDION
            ========================================================================= */}
        <section id="faq" aria-labelledby="faq-title" className="pt-16 sm:pt-24 pb-8 px-4 sm:px-6">
          <div className="max-w-[760px] mx-auto">
            <div className="text-center">
              <p className="text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-[#4F563C]">
                FAQ
              </p>
              <h2 id="faq-title" className="mt-2.5 text-3xl sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.15] text-[#292824]">
                Questions, answered
              </h2>
            </div>

            <div className="mt-10 border-t border-[#E8E4DC]">
              <details className="group border-b border-[#E8E4DC]" open>
                <summary className="flex justify-between items-center gap-4 py-5 text-base sm:text-[17px] font-semibold text-[#292824] cursor-pointer list-none">
                  <span>Do I need to install an app?</span>
                  <svg className="size-5 text-[#646C4D] shrink-0 transition-transform duration-200 group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 text-sm sm:text-base leading-[1.65] text-[#6B6861] m-0">
                  No. CopySync runs in your browser on both devices. Open it on your computer, scan the QR code with your phone camera, and you are paired.
                </p>
              </details>

              <details className="group border-b border-[#E8E4DC]">
                <summary className="flex justify-between items-center gap-4 py-5 text-base sm:text-[17px] font-semibold text-[#292824] cursor-pointer list-none">
                  <span>Is my clipboard stored anywhere?</span>
                  <svg className="size-5 text-[#646C4D] shrink-0 transition-transform duration-200 group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 text-sm sm:text-base leading-[1.65] text-[#6B6861] m-0">
                  Guest sessions are ephemeral and kept in memory. A guest link pairs one phone with one browser, and the session expires after 5 minutes of inactivity.
                </p>
              </details>

              <details className="group border-b border-[#E8E4DC]">
                <summary className="flex justify-between items-center gap-4 py-5 text-base sm:text-[17px] font-semibold text-[#292824] cursor-pointer list-none">
                  <span>Do I need an account?</span>
                  <svg className="size-5 text-[#646C4D] shrink-0 transition-transform duration-200 group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 text-sm sm:text-base leading-[1.65] text-[#6B6861] m-0">
                  Not for clipboard sync. Guest Sync needs no password or card. Sign in with Google only if you want notes that persist across devices.
                </p>
              </details>

              <details className="group border-b border-[#E8E4DC]">
                <summary className="flex justify-between items-center gap-4 py-5 text-base sm:text-[17px] font-semibold text-[#292824] cursor-pointer list-none">
                  <span>Does it work between iPhone and Windows, or Android and Mac?</span>
                  <svg className="size-5 text-[#646C4D] shrink-0 transition-transform duration-200 group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 text-sm sm:text-base leading-[1.65] text-[#6B6861] m-0">
                  Yes. Because it is a web page, any phone and any computer with a modern browser can pair, whatever the operating systems.
                </p>
              </details>

              <details className="group border-b border-[#E8E4DC]">
                <summary className="flex justify-between items-center gap-4 py-5 text-base sm:text-[17px] font-semibold text-[#292824] cursor-pointer list-none">
                  <span>What happens when I close the tab?</span>
                  <svg className="size-5 text-[#646C4D] shrink-0 transition-transform duration-200 group-open:rotate-45" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                    <path d="M12 5v14M5 12h14" />
                  </svg>
                </summary>
                <p className="pb-5 text-sm sm:text-base leading-[1.65] text-[#6B6861] m-0">
                  The guest session is cleared. Nothing is left behind on the computer, which makes it a good fit for shared or borrowed machines.
                </p>
              </details>
            </div>
          </div>
        </section>

        {/* =========================================================================
            FINAL CALL TO ACTION BANNER
            ========================================================================= */}
        <section aria-labelledby="cta-title" className="py-16 sm:py-24 px-4 sm:px-6">
          <div className="max-w-[960px] mx-auto border border-[#EAE2D3] rounded-lg bg-[#F2EBDD] p-8 sm:p-12 md:p-16 text-center shadow-xs">
            <h2 id="cta-title" className="text-3xl sm:text-[40px] font-bold tracking-[-0.025em] leading-[1.15] text-[#292824] m-0">
              Start moving clipboard text in seconds
            </h2>
            <p className="mt-4 max-w-[520px] mx-auto text-base sm:text-[17px] leading-[1.6] text-[#5C594F]">
              No password or card required. It is ready right now in your web browser.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link
                href="/guest"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[50px] sm:min-h-[52px] px-6 rounded-md bg-[#646C4D] text-white text-[15px] sm:text-base font-semibold transition hover:bg-[#52593e] active:scale-[0.98] shadow-xs"
              >
                Connect your phone now
              </Link>
              <Link
                href="/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 min-h-[50px] sm:min-h-[52px] px-6 rounded-md bg-white border border-[#E8E4DC] text-[#292824] text-[15px] sm:text-base font-semibold transition hover:bg-[#FAF9F6] active:scale-[0.98] shadow-2xs"
              >
                Sign in with Google
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* =========================================================================
          FOOTER
          ========================================================================= */}
      <footer className="border-t border-[#E8E4DC] pt-14 pb-10 px-4 sm:px-6">
        <div className="max-w-[1160px] mx-auto flex flex-col lg:flex-row gap-10 lg:gap-12 justify-between">
          <div className="flex-1 max-w-[340px]">
            <Link href="#top" className="flex items-center gap-2.5 font-bold text-lg text-[#292824]">
              <span className="grid size-8 place-items-center rounded-md bg-[#737B5B] text-white shadow-2xs">
                <Clipboard size={18} strokeWidth={2} />
              </span>
              <span>CopySync</span>
            </Link>
            <p className="mt-3.5 text-sm sm:text-[15px] leading-[1.6] text-[#6B6861]">
              Distraction-free clipboard and notes sync between your phone and your computer.
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            <nav aria-label="Product">
              <p className="m-0 text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-[#292824]">Product</p>
              <ul className="mt-3.5 list-none p-0 flex flex-col gap-2.5 text-sm sm:text-[15px]">
                <li><Link href="/guest" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">Guest Sync</Link></li>
                <li><Link href="/notes" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">Notes workspace</Link></li>
                <li><Link href="#how-it-works" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">How it works</Link></li>
                <li><Link href="#faq" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">FAQ</Link></li>
              </ul>
            </nav>

            <nav aria-label="Use cases">
              <p className="m-0 text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-[#292824]">Use cases</p>
              <ul className="mt-3.5 list-none p-0 flex flex-col gap-2.5 text-sm sm:text-[15px]">
                <li><Link href="/guest" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">Phone to PC clipboard</Link></li>
                <li><Link href="/guest" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">iPhone to Windows</Link></li>
                <li><Link href="/guest" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">Android to Mac</Link></li>
                <li><Link href="/guest" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">2FA codes to desktop</Link></li>
              </ul>
            </nav>

            <nav aria-label="Legal">
              <p className="m-0 text-xs sm:text-[13px] font-semibold tracking-wider uppercase text-[#292824]">Legal</p>
              <ul className="mt-3.5 list-none p-0 flex flex-col gap-2.5 text-sm sm:text-[15px]">
                <li><Link href="#" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">Privacy</Link></li>
                <li><Link href="#" className="text-[#6B6861] hover:text-[#646C4D] transition-colors">Terms</Link></li>
              </ul>
            </nav>
          </div>
        </div>

        <p className="max-w-[1160px] mx-auto mt-10 pt-6 border-t border-[#E8E4DC] text-xs sm:text-[13px] text-[#6B6861]">
          © 2026 CopySync. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
