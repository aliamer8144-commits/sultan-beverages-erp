// ─── Receipt Number Utilities ─────────────────────────────────────────
// Client-side sequential receipt number generator for POS.
// Format: INV-YYYYMMDD-XXXX

const STORAGE_PREFIX = 'sultan-receipt-counter-'

function getTodayKey(): string {
  const today = new Date()
  return today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')
}

function formatReceiptNumber(dateStr: string, seq: number): string {
  return `INV-${dateStr}-${String(seq).padStart(4, '0')}`
}

/**
 * Generate the next receipt number AND persist the counter.
 * Call this when actually creating an invoice.
 */
export function getNextReceiptNumber(): string {
  const dateStr = getTodayKey()
  const key = STORAGE_PREFIX + dateStr
  const stored = localStorage.getItem(key)
  const seq = stored ? parseInt(stored, 10) + 1 : 1
  localStorage.setItem(key, seq.toString())
  return formatReceiptNumber(dateStr, seq)
}

/**
 * Preview the next receipt number WITHOUT persisting.
 * Use for display only (e.g., in payment dialog header).
 */
export function peekNextReceiptNumber(): string {
  const dateStr = getTodayKey()
  const key = STORAGE_PREFIX + dateStr
  const stored = localStorage.getItem(key)
  const seq = stored ? parseInt(stored, 10) + 1 : 1
  return formatReceiptNumber(dateStr, seq)
}
