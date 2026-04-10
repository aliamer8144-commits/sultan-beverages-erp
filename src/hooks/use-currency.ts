'use client'

import { useAppStore, CURRENCY_MAP, type CurrencyCode } from '@/store/app-store'
import { formatCurrency as fc, getCurrencySymbol } from '@/lib/currency'

export function useCurrency() {
  const currency = useAppStore((s) => s.settings.currency)
  const customSymbol = useAppStore((s) => s.settings.currencySymbol)
  const position = useAppStore((s) => s.settings.currencyPosition)
  const decimals = useAppStore((s) => s.settings.decimalPlaces)

  const symbol = getCurrencySymbol(currency, customSymbol)
  const currencyName = CURRENCY_MAP[currency]?.name || ''

  /**
   * Format a number using the current currency settings.
   */
  const formatCurrency = (amount: number): string => {
    return fc(amount, currency, customSymbol, position, decimals)
  }

  return {
    currency,
    symbol,
    currencyName,
    position,
    decimals,
    formatCurrency,
  }
}
