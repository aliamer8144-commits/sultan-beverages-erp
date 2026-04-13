'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Plus,
  Minus,
  Trash2,
  CreditCard,
  ShoppingCart,
  X,
  Package,
  PauseCircle,
  Clock,
  Play,
  Star,
} from 'lucide-react'
import { getRelativeTime } from '@/lib/date-utils'
import { EmptyState } from '@/components/empty-state'
import type { CartItem, HeldOrder } from '@/types'
import type { Customer } from './types'

// ─── Props ──────────────────────────────────────────────────────────────────

export interface CartPanelProps {
  // Cart data
  cart: CartItem[]
  cartDiscount: number
  cartCustomerId: string | null
  loyaltyDiscount: number
  grandTotal: number
  subtotal: number

  // Display data
  customers: Customer[]
  selectedCustomer: Customer | null
  customerPoints: number
  isLoyaltyActive: boolean
  loyaltyEnabled: boolean
  symbol: string
  formatDual: (amount: number) => { primary: string; secondary: string | null; display: string }

  // Cart callbacks
  setCartDiscount: (discount: number) => void
  setCartCustomerId: (id: string | null) => void
  updateCartQuantity: (productId: string, quantity: number) => void
  removeFromCart: (productId: string) => void

  // Action callbacks
  handleOpenPayment: () => void
  handleClearCart: () => void
  handleHoldOrder: () => void
  handleOpenLoyaltyRedeem: () => void
  handleApplyDiscount: (percent: number) => void
  handleOpenCustomDiscount: () => void

  // Held orders
  heldOrders: HeldOrder[]
  handleRecallOrder: (orderId: string) => void
  setDeleteHeldOrderId: (id: string | null) => void
  getHeldOrderTotal: (order: HeldOrder) => number
  getHeldCustomerName: (order: HeldOrder) => string | null
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CartPanel({
  cart,
  cartDiscount,
  cartCustomerId,
  loyaltyDiscount,
  grandTotal,
  subtotal,
  customers,
  selectedCustomer,
  customerPoints,
  isLoyaltyActive,
  loyaltyEnabled,
  symbol,
  formatDual,
  setCartDiscount,
  setCartCustomerId,
  updateCartQuantity,
  removeFromCart,
  handleOpenPayment,
  handleClearCart,
  handleHoldOrder,
  handleOpenLoyaltyRedeem,
  handleApplyDiscount,
  handleOpenCustomDiscount,
  heldOrders,
  handleRecallOrder,
  setDeleteHeldOrderId,
  getHeldOrderTotal,
  getHeldCustomerName,
}: CartPanelProps) {
  return (
    <div className="w-full lg:w-[360px] xl:w-[400px] 2xl:w-[420px] flex-shrink-0 border-r border-border/50 bg-card flex flex-col h-full lg:h-auto max-h-[50vh] lg:max-h-none glass-card relative">
      <div className="glow-orb-blue" />
      {/* Cart header */}
      <div className="px-4 py-3 flex items-center justify-between border-b border-border/50 flex-shrink-0">
        <div className="flex items-center gap-2">
          <ShoppingCart className="w-5 h-5 text-primary" />
          <div className="status-dot-live" />
          <h2 className="text-sm font-bold">السلة</h2>
          {cart.length > 0 && (
            <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 font-semibold ${cart.length > 0 ? 'animate-pulse-glow' : ''}`}>
              {cart.reduce((s, i) => s + i.quantity, 0)}
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1">
          {/* Held Orders Button */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="relative h-8 w-8 p-0 rounded-lg hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
              >
                <Clock className="w-4 h-4" />
                {heldOrders.length > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 min-w-[16px] h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center px-1 badge-warning animate-pulse-glow">
                    {heldOrders.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" dir="rtl" side="bottom" align="end">
              <div className="p-3 border-b border-border/50">
                <p className="text-sm font-bold flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-500" />
                  الطلبات المجمّدة
                  {heldOrders.length > 0 && (
                    <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-semibold badge-warning">
                      {heldOrders.length}
                    </Badge>
                  )}
                </p>
              </div>
              <div className="max-h-72 overflow-y-auto">
                {heldOrders.length === 0 ? (
                  <div className="p-6 text-center">
                    <div className="w-12 h-12 rounded-xl bg-muted/50 flex items-center justify-center mx-auto mb-2">
                      <Clock className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                    <p className="text-xs font-medium text-muted-foreground">لا توجد طلبات مجمّدة</p>
                    <p className="text-[10px] text-muted-foreground/50 mt-1">جمّد طلباً حالياً للعودة إليه لاحقاً</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {heldOrders.map((order) => {
                      const total = getHeldOrderTotal(order)
                      const customerName = getHeldCustomerName(order)
                      return (
                        <div key={order.id} className="px-3 py-3 hover:bg-muted/30 transition-colors animate-fade-in-up">
                          {/* Order header */}
                          <div className="flex items-center justify-between mb-1.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-mono font-bold text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded">
                                #{order.id.slice(-5).toUpperCase()}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {getRelativeTime(order.heldAt)}
                              </span>
                            </div>
                            <span className="text-xs font-bold text-primary tabular-nums">
                              {total.toFixed(2)} {symbol}
                            </span>
                          </div>
                          {/* Order details */}
                          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mb-1.5">
                            <span>{order.cart.reduce((s, i) => s + i.quantity, 0)} منتج</span>
                            {customerName && (
                              <>
                                <span className="text-border">•</span>
                                <span>{customerName}</span>
                              </>
                            )}
                            <span className="text-border">•</span>
                            <span>{order.heldBy}</span>
                          </div>
                          {/* Note */}
                          {order.note && (
                            <div className="text-[10px] text-amber-600 bg-amber-50 dark:bg-amber-950/30 rounded-md px-2 py-1 mb-2">
                              📝 {order.note}
                            </div>
                          )}
                          {/* Actions */}
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 h-7 text-[10px] font-medium gap-1 rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400 hover:bg-emerald-100 hover:text-emerald-800 dark:hover:bg-emerald-950/50 dark:hover:text-emerald-300 btn-ripple"
                              onClick={() => handleRecallOrder(order.id)}
                            >
                              <Play className="w-3 h-3" />
                              استعادة
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 px-2 text-[10px] font-medium gap-1 rounded-lg bg-destructive/5 border-destructive/20 text-destructive hover:bg-destructive/10 hover:text-destructive btn-ripple"
                              onClick={() => setDeleteHeldOrderId(order.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                              حذف
                            </Button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
          {/* Hold Order Button */}
          {cart.length > 0 && (
            <button
              onClick={handleHoldOrder}
              className="p-1.5 rounded-lg hover:bg-amber-500/10 text-muted-foreground hover:text-amber-600 transition-colors"
              title="تجميد الطلب"
            >
              <PauseCircle className="w-4 h-4" />
            </button>
          )}
          {cart.length > 0 && (
            <button
              onClick={handleClearCart}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
              title="مسح السلة"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Cart items */}
      <div className="flex-1 overflow-hidden">
        {cart.length === 0 ? (
          <EmptyState
            icon={ShoppingCart}
            title="السلة فارغة"
            description="اضغط على منتج لإضافته"
            className="h-full"
          />
        ) : (
          <ScrollArea className="h-full">
            <div className="scrollable-list p-3 space-y-0">
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="cart-item-slide-in cart-item-enter pricing-row-hover flex items-center gap-3 p-3 rounded-xl bg-muted/30 transition-colors"
                >
                  {/* Item thumbnail */}
                  {item.image ? (
                    <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Package className="w-4 h-4 text-primary" />
                    </div>
                  )}
                  {/* Item info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDual(item.price).display} × {item.quantity}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => { e.stopPropagation(); updateCartQuantity(item.productId, item.quantity - 1) }}
                      className="w-7 h-7 rounded-lg bg-card border border-border/60 flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="w-8 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); updateCartQuantity(item.productId, item.quantity + 1) }}
                      className="w-7 h-7 rounded-lg bg-card border border-border/60 flex items-center justify-center hover:bg-muted transition-colors shadow-sm"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Item total & remove */}
                  <div className="flex flex-col items-end gap-1 min-w-[70px]">
                    <span className="text-sm font-bold text-primary tabular-nums">
                      {formatDual(item.price * item.quantity).display}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); removeFromCart(item.productId) }}
                      className="p-0.5 rounded hover:bg-destructive/10 text-muted-foreground/40 hover:text-destructive transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Cart footer */}
      {cart.length > 0 && (
        <div className="border-t border-border/50 flex-shrink-0">
          {/* Customer & Discount */}
          <div className="p-4 space-y-3">
            {/* Customer selection */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">العميل (اختياري)</label>
              <Select
                value={cartCustomerId || 'none'}
                onValueChange={(val) => setCartCustomerId(val === 'none' ? null : val)}
              >
                <SelectTrigger className="h-9 rounded-xl bg-muted/30 border-0 text-sm">
                  <SelectValue placeholder="بدون عميل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">بدون عميل</SelectItem>
                  {customers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `• ${c.phone}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Loyalty points display & redeem button */}
            {selectedCustomer && loyaltyEnabled && (
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20">
                <div className="flex items-center gap-2">
                  <Star className="w-4 h-4 text-amber-500" />
                  <span className="text-xs font-medium">نقاط {selectedCustomer.name}</span>
                </div>
                <span className="text-sm font-bold text-amber-600 tabular-nums">
                  {customerPoints} <span className="text-[10px] font-normal text-muted-foreground">نقطة</span>
                </span>
              </div>
            )}

            {/* Discount */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-medium text-muted-foreground">الخصم</label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  step={0.5}
                  value={cartDiscount || ''}
                  onChange={(e) => setCartDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="h-9 rounded-xl bg-muted/30 border-0 text-sm pr-3 pl-14 tabular-nums"
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{symbol}</span>
              </div>
              {/* Quick discount buttons */}
              <div className="flex gap-1.5 flex-wrap pt-1">
                {[5, 10, 15, 20].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => handleApplyDiscount(pct)}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium transition-all duration-150 ${
                      cartDiscount > 0 && Math.round((cartDiscount / subtotal) * 100) === pct
                        ? 'bg-primary text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
                <button
                  onClick={handleOpenCustomDiscount}
                  className="px-2 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-150 flex items-center gap-0.5"
                >
                  مخصص
                </button>
              </div>
              {/* Quick amount buttons */}
              <div className="flex gap-1.5 flex-wrap pt-1">
                {[50, 100, 200, 500, 1000].map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCartDiscount(Math.min(amt, subtotal))}
                    disabled={amt > subtotal}
                    className={`px-2 py-1 rounded-md text-[10px] font-medium tabular-nums transition-all duration-150 ${
                      cartDiscount === amt
                        ? 'bg-primary text-white shadow-sm'
                        : amt > subtotal
                          ? 'bg-muted/30 text-muted-foreground/40 cursor-not-allowed'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {amt} {symbol}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <Separator />

          {/* Totals */}
          <div className="p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">المجموع الفرعي</span>
              <span className="font-medium tabular-nums">{formatDual(subtotal).display}</span>
            </div>
            {cartDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الخصم</span>
                <span className="font-medium text-destructive tabular-nums">-{formatDual(cartDiscount).display}</span>
              </div>
            )}
            {loyaltyDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground flex items-center gap-1">
                  <Star className="w-3 h-3 text-amber-500" />
                  خصم النقاط
                </span>
                <span className="font-medium text-amber-600 tabular-nums">-{formatDual(loyaltyDiscount).display}</span>
              </div>
            )}
            <Separator className="!my-2" />
            <div className="flex justify-between items-center">
              <span className="text-base font-bold">الإجمالي</span>
              <span className="text-xl font-bold text-primary tabular-nums text-gradient-green price-highlight">{formatDual(grandTotal).display}</span>
            </div>
          </div>

          {/* Loyalty redeem button */}
          {isLoyaltyActive && (
            <div className="px-4 pb-1">
              <Button
                variant="outline"
                size="sm"
                onClick={handleOpenLoyaltyRedeem}
                className="w-full h-9 rounded-xl gap-2 text-xs font-medium border-amber-500/30 bg-amber-500/5 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600 transition-colors"
              >
                <Star className="w-3.5 h-3.5" />
                استخدام النقاط ({customerPoints})
              </Button>
            </div>
          )}

          {/* Action buttons */}
          <div className="p-4 pt-0 flex gap-2">
            <Button
              onClick={handleOpenPayment}
              className="flex-1 h-12 rounded-xl text-base font-bold shadow-lg shadow-primary/25 hover:shadow-primary/35 transition-all duration-200 gap-2 btn-ripple hover-glow-green btn-neon"
            >
              <CreditCard className="w-5 h-5" />
              <span>دفع وطباعة</span>
              <kbd className="kbd mr-1 hidden sm:inline-flex">F9</kbd>
            </Button>
            <Button
              onClick={handleClearCart}
              variant="outline"
              className="h-12 px-4 rounded-xl hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
