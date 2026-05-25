import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTimeRemaining(expiresAt: string | Date): {
  minutes: number;
  seconds: number;
  total: number;
  isExpired: boolean;
} {
  const expiry = new Date(expiresAt).getTime();
  const now = Date.now();
  const diff = expiry - now;

  if (diff <= 0) {
    return { minutes: 0, seconds: 0, total: 0, isExpired: true };
  }

  const total = Math.floor(diff / 1000);
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;

  return { minutes, seconds, total, isExpired: false };
}
