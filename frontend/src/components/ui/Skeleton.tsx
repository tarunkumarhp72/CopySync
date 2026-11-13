"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-md bg-[#eee9df] before:absolute before:inset-0 before:-translate-x-full before:animate-[shimmer_1.8s_infinite] before:bg-gradient-to-r before:from-transparent before:via-white/60 before:to-transparent",
        className
      )}
      {...props}
    />
  );
}

export function NoteListSkeleton() {
  return (
    <div className="space-y-2 p-1">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="flex items-center justify-between rounded-md p-3 bg-white/60 border border-border/50 shadow-2xs"
        >
          <div className="space-y-1.5 flex-1 pr-3">
            <Skeleton className="h-3.5 w-3/4 rounded-sm" />
            <Skeleton className="h-2.5 w-1/3 rounded-xs opacity-70" />
          </div>
          <Skeleton className="h-3 w-8 rounded-xs opacity-60" />
        </div>
      ))}
    </div>
  );
}

export function NoteEditorSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-6 sm:px-12 sm:py-8 space-y-5">
      {/* Title skeleton */}
      <Skeleton className="h-9 w-64 rounded-lg" />

      {/* Editor toolbar placeholder */}
      <div className="flex items-center gap-2 rounded-xl border border-border/70 bg-white p-2 shadow-2xs">
        <Skeleton className="h-6 w-16 rounded-md" />
        <Skeleton className="h-6 w-20 rounded-md" />
        <Skeleton className="h-6 w-12 rounded-md" />
        <div className="h-4 w-px bg-border/60 mx-1" />
        <Skeleton className="h-6 w-8 rounded-md" />
        <Skeleton className="h-6 w-8 rounded-md" />
        <div className="flex-1" />
        <Skeleton className="h-6 w-20 rounded-md" />
      </div>

      {/* Canvas container placeholder matching real editor card */}
      <div className="flex-1 rounded-xl border border-border/70 bg-white p-6 shadow-2xs space-y-4">
        <Skeleton className="h-4 w-11/12 rounded-sm" />
        <Skeleton className="h-4 w-4/5 rounded-sm" />
        <Skeleton className="h-4 w-3/4 rounded-sm" />
        <div className="pt-2 space-y-3">
          <Skeleton className="h-4 w-5/6 rounded-sm" />
          <Skeleton className="h-4 w-2/3 rounded-sm" />
          <Skeleton className="h-4 w-1/2 rounded-sm" />
        </div>
      </div>
    </div>
  );
}

