"use client";

import { useEffect, useState } from "react";
import { NotesWorkspace } from "@/features/notes/NotesWorkspace";

export default function DashboardPage() {
  const [tokenReady, setTokenReady] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const url = new URL(window.location.href);
      const token = url.searchParams.get("token");
      if (token) {
        localStorage.setItem("copysync_token", token);
        url.searchParams.delete("token");
        window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
      }
    }
    setTokenReady(true);
  }, []);

  if (!tokenReady) return null;

  return <NotesWorkspace />;
}
