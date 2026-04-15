/**
 * Shared Types — Sultan Beverages ERP
 *
 * Single source of truth for all domain types used across
 * the application (client, server, store, screens, APIs).
 */

// ── Currency ──────────────────────────────────────────────────────────

export type CurrencyCode =
  | 'YER' | 'SAR' | 'USD' | 'EUR'
  | 'AED' | 'EGP' | 'QAR' | 'GBP'
  | 'KWD' | 'BHD' | 'OMR' | 'JOD'

export interface CurrencyMeta {
  symbol: string
  name: string
  decimalPlaces: number
}

export const CURRENCY_MAP: Record<CurrencyCode, CurrencyMeta> = {
  YER:  { symbol: 'ر.ي', name: 'ريال يمني',      decimalPlaces: 0 },
  SAR:  { symbol: 'ر.س', name: 'ريال سعودي',      decimalPlaces: 2 },
  USD:  { symbol: '$',   name: 'دولار أمريكي',    decimalPlaces: 2 },
  EUR:  { symbol: '€',   name: 'يورو',            decimalPlaces: 2 },
  AED:  { symbol: 'د.إ', name: 'درهم إماراتي',    decimalPlaces: 2 },
  EGP:  { symbol: 'ج.م', name: 'جنيه مصري',       decimalPlaces: 2 },
  QAR:  { symbol: 'ر.ق', name: 'ريال قطري',       decimalPlaces: 2 },
  GBP:  { symbol: '£',   name: 'جنيه إسترليني',   decimalPlaces: 2 },
  KWD:  { symbol: 'د.ك', name: 'دينار كويتي',     decimalPlaces: 3 },
  BHD:  { symbol: 'د.ب', name: 'دينار بحريني',    decimalPlaces: 3 },
  OMR:  { symbol: 'ر.ع', name: 'ريال عماني',      decimalPlaces: 3 },
  JOD:  { symbol: 'د.ا', name: 'دينار أردني',     decimalPlaces: 3 },
}

// ── User ─────────────────────────────────────────────────────────────

export type UserRole = 'admin' | 'manager' | 'cashier'

export interface User {
  id: string
  username: string
  name: string
  role: UserRole
  isActive: boolean
}

// ── POS Cart ─────────────────────────────────────────────────────────

export interface CartItem {
  productId: string
  variantId?: string
  name: string
  price: number
  quantity: number
  maxQuantity: number
  image?: string
}

export interface HeldOrder {
  id: string
  cart: CartItem[]
  discount: number
  customerId: string | null
  customerName: string | null
  heldAt: string
  heldBy: string
  note: string
}

// ── Settings ─────────────────────────────────────────────────────────

export type CurrencyDisplayMode =
  | 'primary-only'
  | 'secondary-parentheses'
  | 'secondary-main'

export type AnimationSpeed = 'slow' | 'normal' | 'fast'
export type CurrencyPosition = 'before' | 'after'
export type InvoiceTemplate = 'classic' | 'professional' | 'simple'

export interface SettingsState {
  // Store Information
  storeName: string
  storePhone: string
  storeAddress: string
  taxNumber: string
  storeLogoUrl: string

  // Receipt Settings
  receiptHeaderText: string
  receiptFooterText: string
  showTaxOnReceipt: boolean
  currency: CurrencyCode
  currencySymbol: string
  currencyPosition: CurrencyPosition
  decimalPlaces: number
  autoPrintOnPayment: boolean
  invoiceTemplate: InvoiceTemplate

  // POS Settings
  defaultCustomerId: string
  allowDebt: boolean
  maxDebtAmount: number
  soundOnPayment: boolean

  // Display Preferences
  animationSpeed: AnimationSpeed
  compactMode: boolean
  showProductImages: boolean

  // Dual Currency Settings
  secondaryCurrencyEnabled: boolean
  secondaryCurrency: CurrencyCode
  secondaryCurrencySymbol: string
  exchangeRate: number
  currencyDisplayMode: CurrencyDisplayMode

  // Loyalty Settings
  loyaltyEnabled: boolean
  loyaltyPointsPerUnit: number
  loyaltyRedemptionValue: number
  loyaltyMinPointsToRedeem: number
}

// ── Navigation ───────────────────────────────────────────────────────

export type Screen =
  | 'pos'
  | 'inventory'
  | 'stock-adjustments'
  | 'purchases'
  | 'customers'
  | 'invoices'
  | 'returns'
  | 'dashboard'
  | 'users'
  | 'settings'
  | 'expenses'
  | 'daily-close'
  | 'audit-log'
  | 'backup'
  | 'analytics'
  | 'sales-targets'
  | 'customer-statement'
  | 'loyalty'
  | 'product-variants'

// ── Invoice / Print ──────────────────────────────────────────────────

export interface InvoiceData {
  id: string
  invoiceNo: string
  type: 'sale' | 'purchase'
  customer: { id: string; name: string } | null
  supplier: { id: string; name: string } | null
  totalAmount: number
  discount: number
  paidAmount: number
  user: { id: string; name: string }
  items: Array<{
    id: string
    product: { id: string; name: string }
    quantity: number
    price: number
    total: number
  }>
  createdAt: string
}

// ── Translation / i18n ───────────────────────────────────────────────

export type Lang = 'ar' | 'en'
