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

export const MAX_HELD_ORDERS = 5

// ── Store ───────────────────────────────────────────────────────────

export const STORE_PERSIST_KEY = 'sultan-erp-store'
export const LANGUAGE_PERSIST_KEY = 'sultan-erp-language'
