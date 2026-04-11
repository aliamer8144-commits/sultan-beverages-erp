/**
 * App Store — Sultan Beverages ERP
 *
 * Central Zustand store for authentication, navigation, POS cart,
 * held orders, and settings. Persisted to localStorage.
 *
 * Types are defined in @/types — re-exported here for backward compatibility.
 */

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

import { DEFAULT_SETTINGS, MAX_HELD_ORDERS, STORE_PERSIST_KEY } from '@/lib/constants'
import type { User, CartItem, HeldOrder, SettingsState, Screen } from '@/types'

// Types are imported from @/types. No re-exports — consumers import directly from @/types.

// ── Store Interface ─────────────────────────────────────────────────

interface AppState {
  // Auth
  user: User | null
  isAuthenticated: boolean
  token: string | null
  login: (user: User, token: string) => void
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
  holdCurrentOrder: (note?: string, customerName?: string | null) => string
  recallOrder: (orderId: string) => void
  deleteHeldOrder: (orderId: string) => void

  // Settings
  settings: SettingsState
  updateSettings: (settings: Partial<SettingsState>) => void
}

// ── Store Implementation ────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Auth
      user: null,
      isAuthenticated: false,
      token: null,
      login: (user, token) => set({ user, isAuthenticated: true, token }),
      logout: () => set({ user: null, isAuthenticated: false, token: null, cart: [], cartDiscount: 0, cartCustomerId: null }),

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
                  : c,
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
              : c,
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
        const trimmed = updated.length > MAX_HELD_ORDERS
          ? updated.slice(updated.length - MAX_HELD_ORDERS)
          : updated

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
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((s) => ({ settings: { ...s.settings, ...newSettings } })),
    }),
    {
      name: STORE_PERSIST_KEY,
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        currentScreen: state.currentScreen,
        sidebarOpen: state.sidebarOpen,
        settings: state.settings,
        heldOrders: state.heldOrders,
      }),
    },
  ),
)
