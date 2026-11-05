"use client";

import { cn } from "@/lib/utils";

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  className?: string;
}

export function Skeleton({ className, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-md bg-neutral-200/80 dark:bg-neutral-800/80",
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
          className="flex items-center justify-between rounded-sm p-3 bg-white/50 border border-border/40"
        >
          <div className="space-y-1.5 flex-1 pr-3">
            <Skeleton className="h-3.5 w-3/4 rounded-sm" />
            <Skeleton className="h-2.5 w-1/3 rounded-xs opacity-60" />
          </div>
          <Skeleton className="h-3 w-8 rounded-xs opacity-50" />
        </div>
      ))}
    </div>
  );
}

export function NoteEditorSkeleton() {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-5 py-8 sm:px-12 space-y-6">
      {/* Title skeleton */}
      <Skeleton className="h-9 w-1/2 rounded-md" />

      {/* Editor toolbar placeholder */}
      <div className="flex items-center gap-2 border-b border-border/60 pb-3">
        <Skeleton className="h-6 w-16 rounded-xs" />
        <Skeleton className="h-6 w-20 rounded-xs" />
        <Skeleton className="h-6 w-12 rounded-xs" />
        <div className="flex-1" />
        <Skeleton className="h-6 w-24 rounded-xs" />
      </div>

      {/* Body paragraphs */}
      <div className="space-y-3 pt-2">
        <Skeleton className="h-4 w-full rounded-xs" />
        <Skeleton className="h-4 w-5/6 rounded-xs" />
        <Skeleton className="h-4 w-4/6 rounded-xs" />
        <Skeleton className="h-4 w-full rounded-xs pt-4" />
        <Skeleton className="h-4 w-3/4 rounded-xs" />
      </div>
    </div>
  );
}

