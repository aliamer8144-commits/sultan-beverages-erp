// ─── Receipt Number Utilities ─────────────────────────────────────────
// Server-generated invoice numbers are authoritative.
// Client-side numbers are for preview only and should NOT be persisted.

/**
 * Format a receipt number for display.
 * Server-generated invoice numbers are authoritative.
 * Client-side numbers are for preview only.
 */
export function formatReceiptNo(invoiceNo?: string): string {
  if (invoiceNo) return invoiceNo
  // Temporary preview number (not persisted)
  return `TEMP-${Date.now().toString(36).toUpperCase()}`
}
