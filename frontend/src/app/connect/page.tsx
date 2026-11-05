"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Clipboard, Eraser, LogOut, Check, Smartphone, ArrowDown, ArrowUp } from "lucide-react";
import { Suspense, useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

const api = process.env.NEXT_PROD_API_URL;

function ConnectContent() {
  const query = useSearchParams();
  const token = query.get("token");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"connecting" | "connected" | "unavailable">("connecting");
  const [error, setError] = useState<string>();
  const [hasCopied, setHasCopied] = useState(false);

  useEffect(() => {
    if (!token) {
      setError("This connection link is missing a valid token.");
      setStatus("unavailable");
      return;
    }
    void (async () => {
      try {
        const response = await fetch(`${api}/guest/claim`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            token,
            receiver_connection_id: crypto.randomUUID(),
          }),
        });
        if (!response.ok) throw new Error("This connection has expired or was already claimed.");
        setStatus("connected");
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not connect.");
        setStatus("unavailable");
      }
    })();
  }, [token]);

  const paste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text.length > 20000) {
        setContent(text.slice(0, 20000));
        setError("Pasted text was trimmed to the maximum limit of 20,000 characters.");
      } else {
        setContent(text);
      }
    } catch {
      setError("Clipboard permission not granted. You can paste directly into the text box.");
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
    } catch {
      setError("Clipboard copy access was denied.");
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col justify-between p-4 sm:p-6">
      <div className="mx-auto w-full max-w-md flex-1 flex flex-col">
        {/* Navigation / Header */}
        <header className="flex items-center justify-between border-b border-border/80 pb-4">
          <Link href="/" className="flex items-center gap-2 font-medium">
            <span className="grid size-7 place-items-center rounded-lg bg-accent text-white shadow-xs">
              <Clipboard size={15} strokeWidth={2.2} />
            </span>
            <span className="text-sm font-semibold tracking-tight">CopySync</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs">
            <Smartphone size={13} className="text-muted" />
            <span className="font-medium text-foreground">Mobile Link</span>
          </div>
        </header>

        {/* Status Banner */}
        <div className="mt-5">
          <div className="flex items-center justify-between rounded-xl border border-border bg-card p-3 shadow-2xs">
            <div className="flex items-center gap-2.5">
              <span
                className={`size-2.5 rounded-full ${
                  status === "connected"
                    ? "bg-emerald-500 animate-pulse"
                    : status === "connecting"
                    ? "bg-amber-500 animate-spin"
                    : "bg-red-500"
                }`}
              />
              <span className="text-xs font-medium text-foreground">
                {status === "connected"
                  ? "Connected to Computer"
                  : status === "connecting"
                  ? "Connecting to session..."
                  : "Session unavailable"}
              </span>
            </div>
            <span className="text-[11px] font-medium text-muted">
              {status === "connected" ? "Live sync active" : "Waiting"}
            </span>
          </div>
        </div>

        {/* Text Input / Editor Box */}
        <div className="mt-4 flex-1 flex flex-col rounded-2xl border border-border bg-card p-4 sm:p-5 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs font-semibold text-foreground">
              Shared Clipboard Text
            </label>
            {content && (
              <span className="text-[11px] font-mono text-muted">
                {content.length} characters
              </span>
            )}
          </div>

          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Type or paste links, passwords, or text snippets here to send to your computer..."
            className="flex-1 w-full min-h-[220px] resize-none rounded-xl border border-border bg-[#FAF9F6] p-3 text-sm outline-none transition focus:border-accent focus:bg-white focus:ring-2 focus:ring-accent/10 placeholder:text-muted"
          />

          {/* Primary Quick Action Buttons */}
          <div className="mt-4 grid grid-cols-2 gap-2.5">
            <button
              onClick={() => void paste()}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-accent py-2.5 px-3 text-xs font-medium text-white shadow-xs transition hover:bg-accent/90 active:scale-[0.98]"
            >
              <ArrowDown size={14} />
              <span>Paste from phone</span>
            </button>

            <button
              onClick={() => void copy()}
              disabled={!content}
              className={`flex items-center justify-center gap-1.5 rounded-lg border py-2.5 px-3 text-xs font-medium transition active:scale-[0.98] disabled:opacity-40 ${
                hasCopied
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-border bg-white text-foreground hover:bg-cream/60"
              }`}
            >
              <AnimatePresence mode="wait">
                {hasCopied ? (
                  <motion.span
                    key="check"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="flex items-center gap-1"
                  >
                    <Check size={14} className="text-emerald-600" />
                    <span>Copied!</span>
                  </motion.span>
                ) : (
                  <motion.span
                    key="copy"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="flex items-center gap-1"
                  >
                    <ArrowUp size={14} />
                    <span>Copy to clipboard</span>
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </div>

          {/* Secondary Utilities */}
          <div className="mt-2.5 flex items-center gap-2">
            <button
              onClick={() => setContent("")}
              disabled={!content}
              className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border bg-white py-1.5 text-[11px] font-medium text-muted hover:text-foreground hover:bg-cream/50 transition disabled:opacity-40"
            >
              <Eraser size={12} />
              <span>Clear</span>
            </button>
            <Link
              href="/"
              className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border bg-white py-1.5 text-[11px] font-medium text-muted hover:text-foreground hover:bg-cream/50 transition"
            >
              <LogOut size={12} />
              <span>Disconnect</span>
            </Link>
          </div>

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
              {error}
            </p>
          )}
        </div>

        {/* Footer Note */}
        <p className="mt-4 text-center text-[11px] text-muted">
          CopySync session is private. All synced data expires when closed.
        </p>
      </div>
    </div>
  );
}

export default function ConnectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background grid place-items-center text-sm text-muted">
          <div className="flex items-center gap-2">
            <div className="size-4 rounded-full border-2 border-accent border-t-transparent animate-spin" />
            <span>Connecting to CopySync...</span>
          </div>
        </div>
      }
    >
      <ConnectContent />
    </Suspense>
  );
}
