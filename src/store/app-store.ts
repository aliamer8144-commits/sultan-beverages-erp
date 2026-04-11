import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// Currency Types
export type CurrencyCode = 'YER' | 'SAR' | 'USD' | 'EUR' | 'AED' | 'EGP' | 'QAR' | 'GBP' | 'KWD' | 'BHD' | 'OMR' | 'JOD'

export const CURRENCY_MAP: Record<CurrencyCode, { symbol: string; name: string; decimalPlaces: number }> = {
  YER: { symbol: 'ر.ي', name: 'ريال يمني', decimalPlaces: 0 },
  SAR: { symbol: 'ر.س', name: 'ريال سعودي', decimalPlaces: 2 },
  USD: { symbol: '$', name: 'دولار أمريكي', decimalPlaces: 2 },
  EUR: { symbol: '€', name: 'يورو', decimalPlaces: 2 },
  AED: { symbol: 'د.إ', name: 'درهم إماراتي', decimalPlaces: 2 },
  EGP: { symbol: 'ج.م', name: 'جنيه مصري', decimalPlaces: 2 },
  QAR: { symbol: 'ر.ق', name: 'ريال قطري', decimalPlaces: 2 },
  GBP: { symbol: '£', name: 'جنيه إسترليني', decimalPlaces: 2 },
  KWD: { symbol: 'د.ك', name: 'دينار كويتي', decimalPlaces: 3 },
  BHD: { symbol: 'د.ب', name: 'دينار بحريني', decimalPlaces: 3 },
  OMR: { symbol: 'ر.ع', name: 'ريال عماني', decimalPlaces: 3 },
  JOD: { symbol: 'د.ا', name: 'دينار أردني', decimalPlaces: 3 },
}

// Types
export interface User {
  id: string
  username: string
  name: string
  role: 'admin' | 'cashier'
  isActive: boolean
}

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
  heldAt: string // ISO date string
  heldBy: string // user name
  note: string
}

// Settings Types
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
  currencyPosition: 'before' | 'after'
  decimalPlaces: number
  autoPrintOnPayment: boolean
  invoiceTemplate: 'classic' | 'professional' | 'simple'

  // POS Settings
  defaultCustomerId: string
  allowDebt: boolean
  maxDebtAmount: number
  soundOnPayment: boolean

  // Display Preferences
  animationSpeed: 'slow' | 'normal' | 'fast'
  compactMode: boolean
  showProductImages: boolean

  // Dual Currency Settings
  secondaryCurrencyEnabled: boolean
  secondaryCurrency: CurrencyCode
  secondaryCurrencySymbol: string
  exchangeRate: number // how many secondary = 1 primary
  currencyDisplayMode: 'primary-only' | 'secondary-parentheses' | 'secondary-main'

  // Loyalty Settings
  loyaltyEnabled: boolean
  loyaltyPointsPerUnit: number
  loyaltyRedemptionValue: number
  loyaltyMinPointsToRedeem: number
}

export const defaultSettings: SettingsState = {
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
  invoiceTemplate: 'classic' as const,

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
  currencyDisplayMode: 'primary-only' as const,

  // Loyalty Settings
  loyaltyEnabled: true,
  loyaltyPointsPerUnit: 1,
  loyaltyRedemptionValue: 5,
  loyaltyMinPointsToRedeem: 100,
}

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

interface AppState {
  // Auth
  user: User | null
  isAuthenticated: boolean
  login: (user: User) => void
  logout: () => void

  // Navigation
  currentScreen: Screen
  setScreen: (screen: Screen) => void
  sidebarOpen: boolean
  setSidebarOpen: (open: boolean) => void
  toggleSidebar: () => void

  // POS Cart
  cart: CartItem[]
  addToCart: (item: Omit<CartItem, 'quantity'>) => void
  removeFromCart: (productId: string, variantId?: string) => void
  updateCartQuantity: (productId: string, quantity: number, variantId?: string) => void
  clearCart: () => void
  cartDiscount: number
  setCartDiscount: (discount: number) => void
  cartCustomerId: string | null
  setCartCustomerId: (id: string | null) => void

  // Computed
  cartTotal: () => number
  cartItemCount: () => number

  // Held Orders
  heldOrders: HeldOrder[]
  holdCurrentOrder: (note?: string) => string
  recallOrder: (orderId: string) => void
  deleteHeldOrder: (orderId: string) => void

  // Settings
  settings: SettingsState
  updateSettings: (settings: Partial<SettingsState>) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false, cart: [], cartDiscount: 0, cartCustomerId: null }),

      // Navigation
      currentScreen: 'pos',
      setScreen: (screen) => set({ currentScreen: screen }),
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

      // POS Cart
      cart: [],
      addToCart: (item) => {
        const { cart } = get()
        const key = item.variantId || item.productId
        const existing = cart.find((c) => (c.variantId || c.productId) === key)
        if (existing) {
          if (existing.quantity < item.maxQuantity) {
            set({
              cart: cart.map((c) =>
                (c.variantId || c.productId) === key
                  ? { ...c, quantity: Math.min(c.quantity + 1, item.maxQuantity) }
                  : c
              ),
            })
          }
        } else {
          set({ cart: [...cart, { ...item, quantity: 1 }] })
        }
      },
      removeFromCart: (productId, variantId) => {
        const key = variantId || productId
        set({ cart: get().cart.filter((c) => (c.variantId || c.productId) !== key) })
      },
      updateCartQuantity: (productId, quantity, variantId) => {
        const key = variantId || productId
        if (quantity <= 0) {
          get().removeFromCart(productId, variantId)
          return
        }
        set({
          cart: get().cart.map((c) =>
            (c.variantId || c.productId) === key
              ? { ...c, quantity: Math.min(quantity, c.maxQuantity) }
              : c
          ),
        })
      },
      clearCart: () => set({ cart: [], cartDiscount: 0, cartCustomerId: null }),
      cartDiscount: 0,
      setCartDiscount: (discount) => set({ cartDiscount: discount }),
      cartCustomerId: null,
      setCartCustomerId: (id) => set({ cartCustomerId: id }),

      // Computed
      cartTotal: () => {
        const { cart, cartDiscount } = get()
        const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
        return Math.max(0, subtotal - cartDiscount)
      },
      cartItemCount: () => {
        return get().cart.reduce((sum, item) => sum + item.quantity, 0)
      },

      // Held Orders
      heldOrders: [],
      holdCurrentOrder: (note = '', customerName?: string | null) => {
        const { cart, cartDiscount, cartCustomerId, user } = get()
        const id = Date.now().toString(36)
        const heldOrder: HeldOrder = {
          id,
          cart: [...cart],
          discount: cartDiscount,
          customerId: cartCustomerId,
          customerName: customerName || null,
          heldAt: new Date().toISOString(),
          heldBy: user?.name || 'مستخدم',
          note,
        }
        const updated = [...get().heldOrders, heldOrder]
        // Limit to max 5 held orders (remove oldest)
        const trimmed = updated.length > 5 ? updated.slice(updated.length - 5) : updated
        set({ heldOrders: trimmed, cart: [], cartDiscount: 0, cartCustomerId: null })
        return id
      },
      recallOrder: (orderId) => {
        const { heldOrders, cart } = get()
        const held = heldOrders.find((o) => o.id === orderId)
        if (!held) return
        set({
          cart: [...cart, ...held.cart],
          cartDiscount: held.discount,
          cartCustomerId: held.customerId,
          heldOrders: heldOrders.filter((o) => o.id !== orderId),
        })
      },
      deleteHeldOrder: (orderId) => {
        set({ heldOrders: get().heldOrders.filter((o) => o.id !== orderId) })
      },

      // Settings
      settings: defaultSettings,
      updateSettings: (newSettings) =>
        set((s) => ({ settings: { ...s.settings, ...newSettings } })),
    }),
    {
      name: 'sultan-erp-store',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        currentScreen: state.currentScreen,
        sidebarOpen: state.sidebarOpen,
        settings: state.settings,
        heldOrders: state.heldOrders,
      }),
    }
  )
)
