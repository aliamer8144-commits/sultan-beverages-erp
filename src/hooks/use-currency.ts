'use client'

import { useMemo } from 'react'
import { useAppStore } from '@/store/app-store'
import { CURRENCY_MAP, type CurrencyCode, type CurrencyDisplayMode } from '@/types'
import { formatCurrency as fc, getCurrencySymbol, convertCurrency, formatDualCurrency } from '@/lib/currency'

export function useCurrency() {
  const currency = useAppStore((s) => s.settings.currency)
  const customSymbol = useAppStore((s) => s.settings.currencySymbol)
  const position = useAppStore((s) => s.settings.currencyPosition)
  const decimals = useAppStore((s) => s.settings.decimalPlaces)

  const secondaryEnabled = useAppStore((s) => s.settings.secondaryCurrencyEnabled)
  const secondaryCurrency = useAppStore((s) => s.settings.secondaryCurrency)
  const secondaryCustomSymbol = useAppStore((s) => s.settings.secondaryCurrencySymbol)
  const exchangeRate = useAppStore((s) => s.settings.exchangeRate)
  const displayMode = useAppStore((s) => s.settings.currencyDisplayMode)

  const symbol = getCurrencySymbol(currency, customSymbol)
  const currencyName = CURRENCY_MAP[currency]?.name || ''
  const secondarySymbol = getCurrencySymbol(secondaryCurrency, secondaryCustomSymbol)
  const secondaryName = CURRENCY_MAP[secondaryCurrency]?.name || ''

  /**
   * Format a number using the current primary currency settings.
   */
  const formatCurrency = (amount: number): string => {
    return fc(amount, currency, customSymbol, position, decimals)
  }

  /**
   * Convert amount from primary to secondary currency.
   */
  const convertToSecondary = (amount: number): number => {
    if (!secondaryEnabled) return 0
    return convertCurrency(amount, exchangeRate)
  }

  /**
   * Format amount in secondary currency.
   */
  const formatSecondary = (amount: number): string => {
    if (!secondaryEnabled) return ''
    const converted = convertCurrency(amount, exchangeRate)
    const meta = CURRENCY_MAP[secondaryCurrency]
    return fc(converted, secondaryCurrency, secondaryCustomSymbol, position, meta?.decimalPlaces ?? 2)
  }

  /**
   * Format dual currency — shows both currencies based on display mode.
   * Returns an object with primary, secondary, and combined display string.
   */
  const formatDual = (amount: number): { primary: string; secondary: string | null; display: string } => {
    return formatDualCurrency(amount, {
      currency,
      currencySymbol: customSymbol,
      currencyPosition: position,
      decimalPlaces: decimals,
      secondaryCurrencyEnabled: secondaryEnabled,
      secondaryCurrency,
      secondaryCurrencySymbol: secondaryCustomSymbol,
      exchangeRate,
      currencyDisplayMode: displayMode,
    })
  }

  /**
   * Check if dual currency display is active.
   */
  const isDualActive = useMemo(() => {
    return secondaryEnabled && displayMode !== 'primary-only'
  }, [secondaryEnabled, displayMode])

  return {
    // Primary currency
    currency,
    symbol,
    currencyName,
    position,
    decimals,
    formatCurrency,

    // Secondary currency
    secondaryEnabled,
    secondaryCurrency,
    secondarySymbol,
    secondaryName,
    exchangeRate,
    displayMode,
    formatSecondary,
    convertToSecondary,

    // Dual display
    formatDual,
    isDualActive,
  }
}
