"use client";

import { cn } from "@/lib/utils";

type SkeletonProps = {
  className?: string;
};

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-2xl bg-gradient-to-r from-gray-100 via-gray-50 to-gray-100 dark:from-white/10 dark:via-white/5 dark:to-white/10",
        className
      )}
    />
  );
}
