"use client";

import React, { ReactNode } from "react";
import { motion, HTMLMotionProps } from "motion/react";
import { cn } from "@/lib/utils";

interface ShimmerButtonProps extends HTMLMotionProps<"button"> {
  children: ReactNode;
  className?: string;
  shimmerColor?: string;
}

export function ShimmerButton({
  children,
  className,
  shimmerColor = "rgba(255, 255, 255, 0.25)",
  ...props
}: ShimmerButtonProps) {
  return (
    <motion.button
      whileHover={{ scale: 1.015 }}
      whileTap={{ scale: 0.97 }}
      className={cn(
        "group relative overflow-hidden rounded-lg bg-accent px-6 py-3 text-sm font-medium text-white shadow-sm transition-all duration-300 hover:bg-accent/90 hover:shadow-md active:shadow-xs",
        className
      )}
      {...props}
    >
      {/* Subtle sweeping shimmer sheen (ForgeUI / Uilora / VengeanceUI inspired) */}
      <span
        className="pointer-events-none absolute -inset-full top-0 block -rotate-45 transition-transform duration-1000 ease-out group-hover:translate-x-full"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${shimmerColor} 50%, transparent 100%)`,
        }}
      />
      <span className="relative z-10 flex items-center justify-center gap-2">
        {children}
      </span>
    </motion.button>
  );
}

