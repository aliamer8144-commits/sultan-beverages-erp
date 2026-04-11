/**
 * Application Constants — Sultan Beverages ERP
 *
 * Centralized constants to keep them out of store/lib files.
 */

import type { SettingsState } from '@/types'

// ── Defaults ────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: SettingsState = {
  // Store Information
  storeName: 'السلطان للمشروبات',
  storePhone: '',
  storeAddress: '',
  taxNumber: '',
  storeLogoUrl: '',

  // Receipt Settings
  receiptHeaderText: '',
  receiptFooterText: 'شكراً لتعاملكم معنا',
  showTaxOnReceipt: true,
  currency: 'YER',
  currencySymbol: '',
  currencyPosition: 'after',
  decimalPlaces: 0,
  autoPrintOnPayment: false,
  invoiceTemplate: 'classic',

  // POS Settings
  defaultCustomerId: '',
  allowDebt: true,
  maxDebtAmount: 5000,
  soundOnPayment: true,

  // Display Preferences
  animationSpeed: 'normal',
  compactMode: false,
  showProductImages: true,

  // Dual Currency Settings
  secondaryCurrencyEnabled: false,
  secondaryCurrency: 'SAR',
  secondaryCurrencySymbol: '',
  exchangeRate: 1,
  currencyDisplayMode: 'primary-only',

  // Loyalty Settings
  loyaltyEnabled: true,
  loyaltyPointsPerUnit: 1,
  loyaltyRedemptionValue: 5,
  loyaltyMinPointsToRedeem: 100,
}

// ── Pagination & Limits ─────────────────────────────────────────────

export const ITEMS_PER_PAGE = 20
export const MAX_ITEMS_PER_PAGE = 100
export const MAX_HELD_ORDERS = 5

// ── UI ──────────────────────────────────────────────────────────────

export const DEBOUNCE_MS = 250
export const TOAST_DURATION = 3000
export const ANIMATION_DURATION = {
  slow: 500,
  normal: 300,
  fast: 150,
} as const

// ── Store ───────────────────────────────────────────────────────────

export const STORE_PERSIST_KEY = 'sultan-erp-store'
export const LANGUAGE_PERSIST_KEY = 'sultan-erp-language'
