import { useAppStore, CURRENCY_MAP, type CurrencyCode } from '@/store/app-store'

/**
 * Format a number as currency string.
 * Uses the app's currency settings (from Zustand store) when called via useCurrency hook,
 * or accepts explicit overrides.
 *
 * @param amount       - The numeric amount to format
 * @param currencyCode - Currency code (e.g. 'YER', 'SAR'). Falls back to YER
 * @param symbol       - Override symbol. If empty string '', uses CURRENCY_MAP default
 * @param position     - 'before' | 'after'. Default 'after' (Arabic convention)
 * @param decimals     - Number of decimal places. Default from CURRENCY_MAP or 0
 */
export function formatCurrency(
  amount: number,
  currencyCode?: CurrencyCode,
  symbol?: string,
  position?: 'before' | 'after',
  decimals?: number
): string {
  const code = currencyCode || 'YER'
  const meta = CURRENCY_MAP[code]

  // Determine the effective symbol
  const effectiveSymbol = symbol !== undefined
    ? (symbol === '' ? meta?.symbol || '' : symbol)
    : (meta?.symbol || '')

  // Determine decimal places
  const effectiveDecimals = decimals !== undefined
    ? decimals
    : (meta?.decimalPlaces ?? 0)

  // Format the number with Arabic-Indic digits and thousand separators
  const formatted = amount.toLocaleString('ar-SA', {
    minimumFractionDigits: effectiveDecimals,
    maximumFractionDigits: effectiveDecimals,
  })

  // Build the final string based on position
  const space = effectiveSymbol ? ' ' : ''
  if (position === 'before') {
    return `${effectiveSymbol}${space}${formatted}`
  }
  return `${formatted}${space}${effectiveSymbol}`
}

/**
 * Get the effective currency symbol, respecting custom override.
 */
export function getCurrencySymbol(
  currencyCode: CurrencyCode,
  customSymbol?: string
): string {
  if (customSymbol && customSymbol.trim() !== '') {
    return customSymbol.trim()
  }
  return CURRENCY_MAP[currencyCode]?.symbol || ''
}

/**
 * Format currency using current app settings from the store.
 * This can be used outside React components (e.g. in tooltip functions).
 */
export function formatWithSettings(amount: number): string {
  const settings = useAppStore.getState().settings
  return formatCurrency(
    amount,
    settings.currency,
    settings.currencySymbol,
    settings.currencyPosition,
    settings.decimalPlaces
  )
}
