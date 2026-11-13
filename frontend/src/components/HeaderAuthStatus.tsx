"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  ChevronDown, 
  FileText, 
  QrCode, 
  LogOut, 
  CheckCheck, 
  ShieldCheck, 
  Smartphone,
  ExternalLink,
  Loader2,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type User = {
  id: string;
  email: string;
  name?: string | null;
  google_id?: string;
};

type NotificationItem = {
  id: string;
  title: string;
  description: string;
  time: string;
  unread: boolean;
  type: "device" | "note" | "security";
};

const api = process.env.NEXT_PROD_API_URL;

const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: "1",
    title: "Session Active",
    description: "End-to-end encrypted clipboard sync is running",
    time: "Just now",
    unread: true,
    type: "security",
  },
  {
    id: "2",
    title: "Permanent Notes Synced",
    description: "Your cloud workspace is up to date",
    time: "2m ago",
    unread: true,
    type: "note",
  },
  {
    id: "3",
    title: "1-to-1 Device Pairing Ready",
    description: "Connect additional phones or laptops anytime via Guest Sync",
    time: "1h ago",
    unread: false,
    type: "device",
  },
];

export function HeaderAuthStatus() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>(INITIAL_NOTIFICATIONS);

  const containerRef = useRef<HTMLDivElement>(null);

  // Check auth on mount
  useEffect(() => {
    let alive = true;
    const fetchUser = async () => {
      try {
        const res = await fetch(`${api}/auth/me`, { credentials: "include" });
        if (res.ok) {
          const data = (await res.json()) as User;
          if (alive) setUser(data);
        } else {
          if (alive) setUser(null);
        }
      } catch {
        if (alive) setUser(null);
      } finally {
        if (alive) setLoading(false);
      }
    };

    void fetchUser();
    return () => {
      alive = false;
    };
  }, []);

  // Close dropdowns on outside click or Escape
  useEffect(() => {
    const handlePointerDown = (event: MouseEvent | TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowProfileMenu(false);
        setShowNotifications(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("touchstart", handlePointerDown);
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("touchstart", handlePointerDown);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await fetch(`${api}/auth/logout`, { method: "POST", credentials: "include" });
      setUser(null);
      setShowProfileMenu(false);
      router.refresh();
      window.location.href = "/";
    } catch {
      window.location.href = "/";
    }
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  };

  const unreadCount = notifications.filter((n) => n.unread).length;

  if (loading) {
    return (
      <div className="h-8 w-20 animate-pulse rounded-lg bg-stone-200/50" />
    );
  }

  // If user is NOT logged in: Show "Sign in" button
  if (!user) {
    return (
      <Link
        href="/login"
        onClick={() => setIsSigningIn(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-white px-3.5 py-1.5 text-xs sm:text-sm font-medium text-foreground shadow-2xs transition hover:bg-cream/60 active:scale-95 cursor-pointer"
      >
        {isSigningIn ? (
          <>
            <Loader2 size={13} className="animate-spin text-accent" />
            <span>Signing in...</span>
          </>
        ) : (
          <span>Sign in</span>
        )}
      </Link>
    );
  }

  // If user is LOGGED IN: Show Round Notification Icon + Divider + User Name & Avatar
  const displayName = user.name || user.email.split("@")[0] || "User";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={containerRef} className="relative flex items-center gap-2 sm:gap-3">
      {/* 1. Round Notification Icon Button with Orange Unread Dot */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          type="button"
          aria-label="View notifications"
          onClick={() => {
            setShowNotifications(!showNotifications);
            setShowProfileMenu(false);
          }}
          className={`relative grid size-8 sm:size-9 place-items-center rounded-full border border-stone-200/90 bg-white/90 text-stone-700 shadow-2xs backdrop-blur-md transition hover:bg-stone-100 hover:text-stone-900 ${
            showNotifications ? "ring-2 ring-accent/30 bg-stone-100" : ""
          }`}
        >
          <Bell size={16} strokeWidth={2} />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-amber-500 ring-2 ring-white" />
          )}
        </motion.button>

        {/* Notifications Popover Dropdown */}
        <AnimatePresence>
          {showNotifications && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2.5 w-72 sm:w-80 rounded-2xl border border-stone-200/90 bg-white/95 p-3 text-stone-800 shadow-[0_20px_50px_rgba(30,28,24,0.14)] backdrop-blur-2xl ring-1 ring-black/5 z-50"
            >
              <div className="flex items-center justify-between border-b border-stone-200/70 pb-2 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-stone-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-200">
                      {unreadCount} new
                    </span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="flex items-center gap-1 text-[11px] font-medium text-stone-500 hover:text-stone-900 transition"
                  >
                    <CheckCheck size={12} />
                    <span>Mark all read</span>
                  </button>
                )}
              </div>

              <div className="mt-2 divide-y divide-stone-100">
                {notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`flex items-start gap-2.5 p-2 rounded-xl transition ${
                      item.unread ? "bg-amber-50/50" : "hover:bg-stone-50"
                    }`}
                  >
                    <span className="mt-0.5 grid size-6 shrink-0 place-items-center rounded-lg bg-stone-100 text-stone-700">
                      {item.type === "security" && <ShieldCheck size={13} className="text-emerald-600" />}
                      {item.type === "note" && <FileText size={13} className="text-amber-600" />}
                      {item.type === "device" && <Smartphone size={13} className="text-sky-600" />}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs font-semibold text-stone-900 truncate">{item.title}</p>
                        <span className="text-[10px] text-stone-400 shrink-0">{item.time}</span>
                      </div>
                      <p className="text-[11px] text-stone-600 leading-snug mt-0.5">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-2 pt-2 border-t border-stone-200/70 text-center">
                <Link
                  href="/notes"
                  onClick={() => setShowNotifications(false)}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-accent hover:underline"
                >
                  <span>Go to Notes</span>
                  <ExternalLink size={11} />
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* 2. Vertical Divider '|' */}
      <span className="h-5 w-px bg-stone-300/80" />

      {/* 3. User Avatar, User Name and Dropdown Toggle */}
      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          type="button"
          onClick={() => {
            setShowProfileMenu(!showProfileMenu);
            setShowNotifications(false);
          }}
          className={`group flex items-center gap-2 rounded-full sm:rounded-xl border border-stone-200/90 bg-white/90 p-1 sm:px-2.5 sm:py-1.5 text-left shadow-2xs backdrop-blur-md transition hover:bg-stone-100/80 ${
            showProfileMenu ? "ring-2 ring-accent/30 bg-stone-100" : ""
          }`}
        >
          {/* Avatar with Green Online Status Indicator Dot */}
          <div className="relative grid size-7 sm:size-8 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#3d453b] to-[#5a6857] font-semibold text-[11px] sm:text-xs text-white shadow-xs">
            <span>{initials}</span>
            <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
          </div>

          {/* User Name & Role (Hidden or truncated on smallest screens) */}
          <div className="hidden sm:flex flex-col text-left">
            <span className="text-xs font-semibold text-stone-900 leading-tight max-w-[120px] truncate">
              {displayName}
            </span>
            <span className="text-[10px] text-stone-500 leading-none mt-0.5">
              Online
            </span>
          </div>

          {/* Small Dropdown Arrow */}
          <ChevronDown
            size={13}
            className={`text-stone-400 group-hover:text-stone-700 transition-transform duration-200 hidden sm:block ${
              showProfileMenu ? "rotate-180" : ""
            }`}
          />
        </motion.button>

        {/* User Account Popover Dropdown */}
        <AnimatePresence>
          {showProfileMenu && (
            <motion.div
              initial={{ opacity: 0, y: 8, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute right-0 top-full mt-2.5 w-64 rounded-2xl border border-stone-200/90 bg-white/95 p-2 text-stone-800 shadow-[0_20px_50px_rgba(30,28,24,0.14)] backdrop-blur-2xl ring-1 ring-black/5 z-50"
            >
              {/* User info banner */}
              <div className="flex items-center gap-2.5 border-b border-stone-200/70 p-2 pb-3">
                <div className="relative grid size-9 shrink-0 place-items-center rounded-full bg-gradient-to-tr from-[#3d453b] to-[#5a6857] font-semibold text-xs text-white shadow-xs">
                  <span>{initials}</span>
                  <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-stone-900 truncate">{displayName}</p>
                  <p className="text-[11px] text-stone-500 truncate">{user.email}</p>
                </div>
              </div>

              {/* Menu items */}
              <div className="mt-1.5 space-y-0.5 text-xs">
                <Link
                  href="/notes"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition"
                >
                  <FileText size={14} className="text-stone-500" />
                  <span>My Notes</span>
                </Link>

                <Link
                  href="/guest"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 font-medium text-stone-700 hover:bg-stone-100 hover:text-stone-900 transition"
                >
                  <QrCode size={14} className="text-stone-500" />
                  <span>Guest Clipboard Sync</span>
                </Link>
              </div>

              {/* Sign out */}
              <div className="mt-1.5 border-t border-stone-200/70 pt-1.5">
                <button
                  type="button"
                  onClick={() => void handleLogout()}
                  className="flex w-full items-center gap-2.5 rounded-xl px-2.5 py-2 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700 transition"
                >
                  <LogOut size={14} />
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

