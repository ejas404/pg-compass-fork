import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Safely convert a value to a display string. */
export function stringify(value: unknown): string {
  if (typeof value === "object" && value !== null) return JSON.stringify(value);
  return String(value as string | number | boolean);
}
