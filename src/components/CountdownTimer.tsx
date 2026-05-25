"use client";

import { useEffect, useState } from "react";
import { formatTimeRemaining } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  expiresAt: string;
  onExpire?: () => void;
  className?: string;
}

export function CountdownTimer({ expiresAt, onExpire, className }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState(formatTimeRemaining(expiresAt));

  useEffect(() => {
    if (timeLeft.isExpired) {
      onExpire?.();
      return;
    }

    const interval = setInterval(() => {
      const remaining = formatTimeRemaining(expiresAt);
      setTimeLeft(remaining);

      if (remaining.isExpired) {
        clearInterval(interval);
        onExpire?.();
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [expiresAt, onExpire, timeLeft.isExpired]);

  const isUrgent = !timeLeft.isExpired && timeLeft.total < 120; // < 2 minutes
  const isWarning = !timeLeft.isExpired && timeLeft.total < 300; // < 5 minutes

  if (timeLeft.isExpired) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <div className="h-2 w-2 rounded-full bg-red-500" />
        <span className="text-red-400 font-mono font-semibold text-sm">Expired</span>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div
        className={cn(
          "h-2 w-2 rounded-full",
          isUrgent ? "bg-red-500 animate-pulse" : isWarning ? "bg-amber-500" : "bg-emerald-500"
        )}
      />
      <div className="flex items-center gap-1 font-mono">
        <span
          className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            isUrgent ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400"
          )}
        >
          {String(timeLeft.minutes).padStart(2, "0")}
        </span>
        <span className="text-white/40 text-xl font-bold">:</span>
        <span
          className={cn(
            "text-2xl font-bold tabular-nums tracking-tight",
            isUrgent ? "text-red-400" : isWarning ? "text-amber-400" : "text-emerald-400"
          )}
        >
          {String(timeLeft.seconds).padStart(2, "0")}
        </span>
      </div>
      <span className="text-white/40 text-xs">remaining</span>
    </div>
  );
}
