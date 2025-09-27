import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

// Utility function to safely get the first character of a name
export function getFirstChar(name, fallback = "U") {
  if (typeof name === 'string' && name.length > 0) {
    return name.charAt(0).toUpperCase();
  }
  return fallback;
}
