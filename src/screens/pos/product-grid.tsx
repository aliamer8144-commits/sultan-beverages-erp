'use client'

import { type RefObject } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Search,
  X,
  ScanBarcode,
  RotateCcw,
  FileText,
  ShoppingCart,
  Calculator,
  Target,
} from 'lucide-react'
import { getCategoryIcon, getCategoryColor } from '@/lib/category-utils'
import { formatShortDate } from '@/lib/date-utils'
import type { Product, Category, LastInvoice, SalesTargetCompact } from './types'

// ─── Props Interface ─────────────────────────────────────────────────────

export interface ProductGridProps {
  // Product data
  displayProducts: Product[]
  categories: Category[]
  loading: boolean

  // Filter state
  searchQuery: string
  setSearchQuery: (query: string) => void
  selectedCategoryId: string
  setSelectedCategoryId: (id: string) => void

  // Barcode
  barcodeInput: string
  setBarcodeInput: (value: string) => void
  barcodeFocused: boolean
  setBarcodeFocused: (focused: boolean) => void
  handleBarcodeScan: (barcode: string) => void

  // Cart helpers
  getCartItemQuantity: (productId: string) => number
  handleProductClick: (product: Product) => void

  // Last invoices
  lastInvoices: LastInvoice[]
  lastInvoicesLoading: boolean
  fetchLastInvoices: () => void

  // Sales target
  salesTarget: SalesTargetCompact | null

  // Calculator
  calculatorOpen: boolean
  setCalculatorOpen: (open: boolean) => void

  // Cart actions
  handleClearCart: () => void
  cartLength: number

  // Refs
  searchInputRef: RefObject<HTMLInputElement | null>
  barcodeInputRef: RefObject<HTMLInputElement | null>

  // Display
  symbol: string
  formatDual: (amount: number) => { primary: string; secondary: string | null; display: string }
}

// ─── Component ───────────────────────────────────────────────────────────

export function ProductGrid({
  displayProducts,
  categories,
  loading,
  searchQuery,
  setSearchQuery,
  selectedCategoryId,
  setSelectedCategoryId,
  barcodeInput,
  setBarcodeInput,
  barcodeFocused,
  setBarcodeFocused,
  handleBarcodeScan,
  getCartItemQuantity,
  handleProductClick,
  lastInvoices,
  lastInvoicesLoading,
  fetchLastInvoices,
  salesTarget,
  calculatorOpen,
  setCalculatorOpen,
  handleClearCart,
  cartLength,
  searchInputRef,
  barcodeInputRef,
  symbol,
  formatDual,
}: ProductGridProps) {
  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      {/* Search bar */}
      <div className="px-4 pt-4 pb-2 flex-shrink-0">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/60" />
          <Input
            ref={searchInputRef}
            type="text"
            placeholder="بحث عن منتج... (Ctrl+K)"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-11 rounded-xl bg-muted/50 border-0 focus-visible:ring-2 focus-visible:ring-primary/30 pr-10 pl-10 text-sm input-glow-ring"
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); searchInputRef.current?.focus() }}
              className="absolute left-3 top-1/2 -translate-y-1/2 p-0.5 rounded-full hover:bg-muted-foreground/10 transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          )}
          <kbd className="kbd absolute left-12 top-1/2 -translate-y-1/2 hidden sm:inline-flex">/</kbd>
        </div>
      </div>

      {/* Barcode scanner input */}
      <div className="px-4 pb-2 flex-shrink-0">
        <div className={`relative rounded-xl glass-card transition-all duration-300 ${barcodeFocused ? 'animate-pulse-glow ring-2 ring-primary/30' : ''}`}>
          <ScanBarcode className={`absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 transition-colors ${barcodeFocused ? 'text-primary' : 'text-muted-foreground/50'}`} />
          <Input
            ref={barcodeInputRef}
            type="text"
            placeholder="مسح الباركود... (F2)"
            value={barcodeInput}
            onChange={(e) => setBarcodeInput(e.target.value)}
            onFocus={() => setBarcodeFocused(true)}
            onBlur={() => setBarcodeFocused(false)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleBarcodeScan(barcodeInput)
              }
            }}
            className="h-9 rounded-xl bg-transparent border-0 focus-visible:ring-0 pr-9 pl-16 text-sm input-glow-ring"
          />
          <kbd className="kbd absolute left-3 top-1/2 -translate-y-1/2 hidden sm:inline-flex">F2</kbd>
        </div>
      </div>

      {/* ── Feature 1: Quick Actions Panel ── */}
      <div className="px-4 pb-2 flex-shrink-0">
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <div className="action-btn-group flex-shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-none bg-card border-border/60 hover:bg-primary/5 hover:border-primary/30 btn-ripple"
            onClick={() => searchInputRef.current?.focus()}
          >
            <Search className="w-3.5 h-3.5" />
            بحث سريع
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-none bg-card border-border/60 hover:bg-primary/5 hover:border-primary/30 btn-ripple"
            onClick={() => barcodeInputRef.current?.focus()}
          >
            <ScanBarcode className="w-3.5 h-3.5" />
            مسح الباركود
            <kbd className="kbd text-[9px] h-4 px-1 hidden sm:inline-flex">F2</kbd>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 text-xs font-medium rounded-none bg-card border-border/60 hover:bg-destructive/5 hover:border-destructive/30 hover:text-destructive btn-ripple"
            onClick={handleClearCart}
            disabled={cartLength === 0}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            إلغاء العملية
          </Button>
          </div>
          <Button
            variant="outline"
            size="sm"
            className={`flex-shrink-0 h-8 gap-1.5 text-xs font-medium rounded-lg border-border/60 btn-ripple ${calculatorOpen ? 'bg-primary/10 border-primary/30 text-primary' : 'bg-card hover:bg-violet-500/5 hover:border-violet-500/30 hover:text-violet-600'}`}
            onClick={() => setCalculatorOpen(!calculatorOpen)}
          >
            <Calculator className="w-3.5 h-3.5" />
            الآلة الحاسبة
          </Button>
          <Popover onOpenChange={(open) => open && fetchLastInvoices()}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                size="sm"
                className="flex-shrink-0 h-8 gap-1.5 text-xs font-medium rounded-lg bg-card border-border/60 hover:bg-amber-500/5 hover:border-amber-500/30 hover:text-amber-600 btn-ripple"
              >
                <FileText className="w-3.5 h-3.5" />
                آخر الفواتير
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0" dir="rtl" side="bottom" align="start">
              <div className="p-3 border-b border-border/50">
                <p className="text-sm font-bold flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  آخر الفواتير
                </p>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {lastInvoicesLoading ? (
                  <div className="p-4 flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : lastInvoices.length === 0 ? (
                  <div className="p-4 text-center">
                    <p className="text-xs text-muted-foreground">لا توجد فواتير بعد</p>
                  </div>
                ) : (
                  <div className="divide-y divide-border/30">
                    {lastInvoices.map((inv) => (
                      <div key={inv.id} className="px-3 py-2.5 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-foreground">{inv.invoiceNo}</span>
                          <span className="text-xs font-bold text-primary">
                            {formatDual(inv.totalAmount).display}
                          </span>
                        </div>
                        <div className="flex items-center justify-between mt-0.5">
                          <span className="text-[10px] text-muted-foreground">
                            {inv.customer?.name || 'عميل نقدي'}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {formatShortDate(inv.createdAt)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </div>

      {/* Category tabs */}
      <div className="px-4 pb-3 flex-shrink-0">
        {/* Sales Target Compact Progress */}
        {salesTarget && (
          <div className={`mb-3 p-2.5 rounded-xl border transition-all animate-fade-in-up ${
            salesTarget.progressPercent >= 100
              ? 'border-emerald-500/30 bg-emerald-500/5'
              : 'border-border/40 bg-muted/20'
          }`}>
            <div className="flex items-center gap-2 mb-1.5">
              <Target className={`w-3.5 h-3.5 flex-shrink-0 ${salesTarget.progressPercent >= 100 ? 'text-emerald-500' : 'text-primary'}`} />
              <span className="text-[11px] font-medium text-foreground">
                هدف المبيعات
              </span>
              <span className="text-[10px] text-muted-foreground mr-auto">
                {salesTarget.currentAmount.toFixed(0)} / {salesTarget.targetAmount.toFixed(0)} {symbol}
              </span>
              <span className={`text-[10px] font-bold tabular-nums ${
                salesTarget.progressPercent >= 80 ? 'text-emerald-600'
                : salesTarget.progressPercent >= 50 ? 'text-amber-600'
                : 'text-red-600'
              }`}>
                {salesTarget.progressPercent.toFixed(0)}%
              </span>
            </div>
            <div className="relative h-1.5 rounded-full bg-muted/60 overflow-hidden">
              <div
                className={`absolute inset-y-0 right-0 rounded-full progress-bar-animated ${
                  salesTarget.progressPercent >= 80 ? 'bg-emerald-500'
                  : salesTarget.progressPercent >= 50 ? 'bg-amber-500'
                  : 'bg-red-500'
                } ${salesTarget.progressPercent >= 100 ? 'shimmer' : ''}`}
                style={{ width: `${Math.min(salesTarget.progressPercent, 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <button
            onClick={() => setSelectedCategoryId('all')}
            className={`pos-category-pill ${selectedCategoryId === 'all' ? 'active' : ''}`}
          >
            الكل
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryId(cat.id)}
              className={`pos-category-pill flex items-center gap-1.5 ${selectedCategoryId === cat.id ? 'active' : ''}`}
            >
              {getCategoryIcon(cat.icon, { className: 'w-4 h-4' })}
              {cat.name}
              {cat._count && (
                <span className={`text-[10px] ${selectedCategoryId === cat.id ? 'text-white/70' : 'text-muted-foreground/60'}`}>
                  {cat._count.products}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Product grid */}
      <div className="flex-1 overflow-hidden px-4 pb-4">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 h-full">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="skeleton-shimmer rounded-2xl p-4">
                <div className="w-12 h-12 rounded-xl bg-muted/60 mx-auto mb-3" />
                <div className="h-3 bg-muted/60 rounded-md mx-auto mb-1 w-3/4" />
                <div className="h-5 bg-muted/60 rounded-md mx-auto w-1/2" />
              </div>
            ))}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
              <ShoppingCart className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <p className="text-sm font-medium text-muted-foreground">لا توجد منتجات</p>
            <p className="text-xs text-muted-foreground/60 mt-1">جرب تغيير البحث أو الفئة</p>
          </div>
        ) : (
          <ScrollArea className="h-full">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 pb-4 stagger-children grid-stagger card-grid-responsive">
              {displayProducts.map((product) => {
                const colors = getCategoryColor(product.categoryId)
                const inCart = getCartItemQuantity(product.id)
                const isOutOfStock = product.quantity <= 0
                const isLowStock = product.quantity > 0 && product.quantity <= product.minQuantity

                return (
                  <div
                    key={product.id}
                    onClick={() => !isOutOfStock && handleProductClick(product)}
                    className={`product-card-premium product-card card-hover bg-card rounded-2xl border border-border/50 p-4 transition-all group relative select-none ${
                      isOutOfStock
                        ? 'opacity-50 cursor-not-allowed'
                        : 'cursor-pointer hover:border-primary/30'
                    } ${inCart > 0 ? 'ring-2 ring-primary/30 border-primary/30' : ''}`}
                  >
                    {/* In-cart badge */}
                    {inCart > 0 && (
                      <div className="absolute -top-2 -left-2 badge-count shadow-lg shadow-primary/30 z-10">
                        {inCart}
                      </div>
                    )}

                    {/* Product image or Category icon */}
                    {product.image ? (
                      <div className="w-12 h-12 rounded-xl overflow-hidden mx-auto mb-3 flex items-center justify-center">
                        <img
                          src={product.image}
                          alt={product.name}
                          className="product-card-image w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className={`product-placeholder w-12 h-12 rounded-xl mx-auto mb-3 ${colors.hover} transition-colors`}>
                        {getCategoryIcon(product.category.icon || 'CupSoda', { className: `w-6 h-6` })}
                      </div>
                    )}

                    {/* Product info */}
                    <h3 className="text-sm font-semibold text-center truncate mb-1">{product.name}</h3>
                    <p className="text-lg font-bold text-primary text-center price-tag">{formatDual(product.price).display}</p>

                    {/* Stock indicator */}
                    {isOutOfStock ? (
                      <Badge variant="destructive" className="text-[10px] mt-1.5 block text-center w-fit mx-auto status-chip-danger">
                        غير متوفر
                      </Badge>
                    ) : isLowStock ? (
                      <Badge variant="destructive" className="text-[10px] mt-1.5 block text-center w-fit mx-auto bg-amber-100 text-amber-700 hover:bg-amber-100">
                        مخزون منخفض ({product.quantity})
                      </Badge>
                    ) : (
                      <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">المتاح: {product.quantity}</p>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>
    </div>
  )
}
