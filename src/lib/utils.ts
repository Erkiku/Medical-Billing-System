import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export { formatINR, numberToIndianWords } from "./currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "-";
  const d = new Date(date);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

export function isNearExpiry(expiryDate: string | Date, daysThreshold = 90): boolean {
  const exp = new Date(expiryDate).getTime();
  const now = new Date().getTime();
  const diffDays = (exp - now) / (1000 * 3600 * 24);
  return diffDays > 0 && diffDays <= daysThreshold;
}

export function isExpired(expiryDate: string | Date): boolean {
  const exp = new Date(expiryDate).getTime();
  const now = new Date().getTime();
  return exp <= now;
}
