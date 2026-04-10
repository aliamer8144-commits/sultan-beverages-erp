'use client'

import { useAppStore, CURRENCY_MAP, type CurrencyCode } from '@/store/app-store'

export function useCurrency() {
  const currency = useAppStore((s) => s.settings.currency)
  const symbol = CURRENCY_MAP[currency]?.symbol || CURRENCY_MAP.SAR.symbol

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('ar-SA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return {
    currency,
    symbol,
    formatAmount,
    currencyName: CURRENCY_MAP[currency]?.name || CURRENCY_MAP.SAR.name,
  }
}
