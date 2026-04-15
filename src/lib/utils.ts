import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** Generate a short unique ID for file names (using built-in crypto with rejection sampling) */
export function nanoid(size = 12): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const mask = (2 << (Math.log(chars.length - 1) / Math.LN2)) - 1
  const step = Math.ceil((1.6 * mask * size) / chars.length)
  let id = ''
  while (id.length < size) {
    const bytes = crypto.getRandomValues(new Uint8Array(step))
    for (let i = 0; i < step && id.length < size; i++) {
      const idx = bytes[i] & mask
      if (idx < chars.length) {
        id += chars[idx]
      }
    }
  }
  return id
}
