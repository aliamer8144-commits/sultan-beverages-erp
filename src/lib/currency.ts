import { useAppStore } from '@/store/app-store'
import { CURRENCY_MAP, type CurrencyCode } from '@/types'

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

  // Format the number with Western Arabic numerals and thousand separators
  const formatted = amount.toLocaleString('ar-SA-u-nu-latn', {
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

/**
 * Convert an amount from one currency to another using an exchange rate.
 * The exchange rate represents: how many `to` units = 1 `from` unit.
 *
 * @param amount       - The amount in the source currency
 * @param exchangeRate - How many `to` currency units = 1 `from` currency unit
 */
export function convertCurrency(amount: number, exchangeRate: number): number {
  if (!exchangeRate || exchangeRate <= 0) return amount
  return amount * exchangeRate
}

/**
 * Format dual currency string based on settings.
 * Returns the formatted amount in primary and/or secondary currency.
 *
 * @param amount       - The amount in primary currency
 * @param settings     - The app settings containing dual currency config
 * @returns Formatted string(s) based on display mode
 */
export function formatDualCurrency(
  amount: number,
  settings: {
    currency: CurrencyCode
    currencySymbol: string
    currencyPosition: 'before' | 'after'
    decimalPlaces: number
    secondaryCurrencyEnabled: boolean
    secondaryCurrency: CurrencyCode
    secondaryCurrencySymbol: string
    exchangeRate: number
    currencyDisplayMode: 'primary-only' | 'secondary-parentheses' | 'secondary-main'
  }
): { primary: string; secondary: string | null; display: string } {
  const {
    currency,
    currencySymbol,
    currencyPosition,
    decimalPlaces,
    secondaryCurrencyEnabled,
    secondaryCurrency,
    secondaryCurrencySymbol,
    exchangeRate,
    currencyDisplayMode,
  } = settings

  const primaryFormatted = formatCurrency(amount, currency, currencySymbol, currencyPosition, decimalPlaces)

  if (!secondaryCurrencyEnabled || currencyDisplayMode === 'primary-only') {
    return { primary: primaryFormatted, secondary: null, display: primaryFormatted }
  }

  const secondaryMeta = CURRENCY_MAP[secondaryCurrency]
  const secondaryDecimals = secondaryMeta?.decimalPlaces ?? 2
  const convertedAmount = convertCurrency(amount, exchangeRate)
  const secondaryFormatted = formatCurrency(
    convertedAmount,
    secondaryCurrency,
    secondaryCurrencySymbol,
    currencyPosition,
    secondaryDecimals
  )

  if (currencyDisplayMode === 'secondary-parentheses') {
    return {
      primary: primaryFormatted,
      secondary: secondaryFormatted,
      display: `${primaryFormatted} (${secondaryFormatted})`,
    }
  }

  // 'secondary-main' — secondary is shown prominently, primary in parentheses
  return {
    primary: primaryFormatted,
    secondary: secondaryFormatted,
    display: `${secondaryFormatted} (${primaryFormatted})`,
  }
}
