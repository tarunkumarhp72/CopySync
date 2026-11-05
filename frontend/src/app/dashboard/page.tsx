"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function DashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Preserve any query parameters (like ?token=...)
    const query = typeof window !== "undefined" ? window.location.search : "";
    router.replace(`/notes${query}`);
  }, [router]);

  return (
    <div className="grid min-h-screen place-items-center bg-background">
      <Loader2 size={28} className="animate-spin text-accent" />
    </div>
  );
}
