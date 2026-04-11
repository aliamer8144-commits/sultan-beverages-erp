'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  ShoppingCart,
  X,
  ScanBarcode,
  RotateCcw,
  FileText,
  Package,
  Calculator,
  PauseCircle,
  Clock,
  Play,
  Target,
  Star,
} from 'lucide-react'
import { getCategoryIcon, getCategoryColor } from '@/lib/category-utils'
import { getNextReceiptNumber } from '@/lib/receipt-utils'
import { getRelativeTime, formatShortDate } from '@/lib/date-utils'
import { toast } from 'sonner'
import { Calculator as CalculatorWidget } from '@/components/calculator'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'
import { EmptyState } from '@/components/empty-state'
import { ConfirmDialog } from '@/components/confirm-dialog'
import type { CartItem } from '@/types'
import type { Product, Category, Customer, ProductVariant, LastInvoice, SalesTargetCompact } from './pos/types'
import { PaymentDialog } from './pos/payment-dialog'
import { LoyaltyRedeemDialog } from './pos/loyalty-redeem-dialog'
import { CustomDiscountDialog } from './pos/custom-discount-dialog'
import { HoldOrderDialog } from './pos/hold-order-dialog'
import { ProductQuickViewDialog } from './pos/product-quick-view-dialog'
import { VariantSelectorDialog } from './pos/variant-selector-dialog'

// ─── Component ───────────────────────────────────────────────────────────────

export function POSScreen() {
  const {
    cart,
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    cartDiscount,
    setCartDiscount,
    cartCustomerId,
    setCartCustomerId,
    cartTotal,
    user,
    settings,
    heldOrders,
    holdCurrentOrder,
    recallOrder,
    deleteHeldOrder,
  } = useAppStore()
  const { symbol, formatDual } = useCurrency()

  // ── Data state ──
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  // ── Filter state ──
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all')

  // ── Payment dialog ──
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [paidAmount, setPaidAmount] = useState('')
  const [processingPayment, setProcessingPayment] = useState(false)

  // ── Loyalty state ──
  const [loyaltyRedeemDialogOpen, setLoyaltyRedeemDialogOpen] = useState(false)
  const [redeemPoints, setRedeemPoints] = useState('')
  const [redeemingPoints, setRedeemingPoints] = useState(false)
  const [loyaltyDiscount, setLoyaltyDiscount] = useState(0)

  // ── Compute selected customer ──
  const selectedCustomer = cartCustomerId ? (customers.find((c) => c.id === cartCustomerId) ?? null) : null
  const customerPoints = selectedCustomer?.loyaltyPoints || 0
  const loyaltySettings = settings
  const isLoyaltyActive = loyaltySettings.loyaltyEnabled && !!cartCustomerId && customerPoints >= (loyaltySettings.loyaltyMinPointsToRedeem || 0)

  // ── useApi hook ──
  const { get, post } = useApi()

  // ── Fetch customers (needed before loyalty handlers) ──
  const fetchCustomers = useCallback(async () => {
    const result = await get<any[]>('/api/customers', undefined, { showErrorToast: false })
    if (result) setCustomers(result)
  }, [get])

  // ── Loyalty redeem handler ──
  const handleOpenLoyaltyRedeem = useCallback(() => {
    if (!isLoyaltyActive) return
    setRedeemPoints('')
    setLoyaltyRedeemDialogOpen(true)
  }, [isLoyaltyActive])

  const handleConfirmLoyaltyRedeem = useCallback(async () => {
    if (!selectedCustomer || !redeemPoints) return
    const pts = parseInt(redeemPoints)
    if (!pts || pts < (loyaltySettings.loyaltyMinPointsToRedeem || 0)) {
      toast.error(`الحد الأدنى للاستبدال ${loyaltySettings.loyaltyMinPointsToRedeem || 0} نقطة`)
      return
    }
    if (pts > customerPoints) {
      toast.error('النقاط المطلوبة أكبر من رصيد العميل')
      return
    }

    setRedeemingPoints(true)
    try {
      const result = await post('/api/loyalty', {
        customerId: selectedCustomer.id,
        points: -pts,
        transactionType: 'redeemed',
        description: `استبدال ${pts} نقطة كخصم في نقطة البيع`,
      }, { showErrorToast: false })
      if (result) {
        const discountValue = pts * (loyaltySettings.loyaltyRedemptionValue || 0)
        setLoyaltyDiscount(discountValue)
        toast.success(`تم استبدال ${pts} نقطة — خصم ${formatDual(discountValue).display}`)
        setLoyaltyRedeemDialogOpen(false)
        fetchCustomers()
      } else {
        toast.error('حدث خطأ أثناء استبدال النقاط')
      }
    } finally {
      setRedeemingPoints(false)
    }
  }, [selectedCustomer, redeemPoints, customerPoints, loyaltySettings, formatDual, fetchCustomers, post])

  // ── Reset loyalty discount when customer changes ──
  useEffect(() => {
    setLoyaltyDiscount(0)
  }, [cartCustomerId])

  // ── Barcode state ──
  const [barcodeInput, setBarcodeInput] = useState('')
  const [barcodeFocused, setBarcodeFocused] = useState(false)

  // ── Clear cart confirmation ──
  const [clearCartDialogOpen, setClearCartDialogOpen] = useState(false)

  // ── Last invoices popover ──
  const [lastInvoices, setLastInvoices] = useState<LastInvoice[]>([])
  const [lastInvoicesLoading, setLastInvoicesLoading] = useState(false)

  // ── Product quick view ──
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null)
  const [quickViewQuantity, setQuickViewQuantity] = useState(1)

  // ── Variant selector ──
  const [variantSelectorOpen, setVariantSelectorOpen] = useState(false)
  const [variantSelectorProduct, setVariantSelectorProduct] = useState<Product | null>(null)
  const [variantSelectorVariants, setVariantSelectorVariants] = useState<ProductVariant[]>([])
  const [variantSelectorLoading, setVariantSelectorLoading] = useState(false)

  // ── Calculator widget ──
  const [calculatorOpen, setCalculatorOpen] = useState(false)

  // ── Split payment state ──
  const [paymentTab, setPaymentTab] = useState<'full' | 'split'>('full')
  const [splitCash, setSplitCash] = useState('')
  const [splitCard, setSplitCard] = useState('')

  // ── Custom discount dialog state ──
  const [customDiscountDialogOpen, setCustomDiscountDialogOpen] = useState(false)
  const [customDiscountValue, setCustomDiscountValue] = useState('')
  const [customDiscountType, setCustomDiscountType] = useState<'percent' | 'amount'>('percent')

  // ── Hold order ──
  const [holdDialogOpen, setHoldDialogOpen] = useState(false)
  const [holdNote, setHoldNote] = useState('')

  // ── Delete held order confirmation ──
  const [deleteHeldOrderId, setDeleteHeldOrderId] = useState<string | null>(null)

  // ── Sales target progress ──
  const [salesTarget, setSalesTarget] = useState<SalesTargetCompact | null>(null)

  // ── Refs ──
  const searchInputRef = useRef<HTMLInputElement>(null)
  const barcodeInputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // ── Fetch data ──
  const fetchProducts = useCallback(async (search = '', categoryId = '') => {
    const params: Record<string, string | undefined> = {}
    if (search) params.search = search
    if (categoryId && categoryId !== 'all') params.categoryId = categoryId
    const result = await get<any[]>('/api/products', params, { showErrorToast: false })
    if (result) setProducts(result)
  }, [get])

  const fetchCategories = useCallback(async () => {
    const result = await get<any[]>('/api/categories', undefined, { showErrorToast: false })
    if (result) setCategories(result)
  }, [get])

  useEffect(() => {
    const init = async () => {
      setLoading(true)
      await Promise.all([fetchProducts(), fetchCategories(), fetchCustomers()])
      setLoading(false)
    }
    init()
  }, [fetchProducts, fetchCategories, fetchCustomers])

  // ── Fetch sales target ──
  useEffect(() => {
    let cancelled = false
    const fetchTarget = async () => {
      const json = await get<any>('/api/sales-targets', undefined, { showErrorToast: false })
      if (!cancelled && json && json.progressPercent !== undefined) {
        setSalesTarget({
          progressPercent: json.progressPercent,
          targetAmount: json.targetAmount,
          currentAmount: json.currentAmount,
          type: json.type,
        })
      }
    }
    fetchTarget()
    const interval = setInterval(fetchTarget, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [get])

  // ── Debounced search ──
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      fetchProducts(searchQuery, selectedCategoryId)
    }, 150)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchQuery, selectedCategoryId, fetchProducts])

  // ── Cart helpers ──
  const handleAddToCart = useCallback(
    (product: Product, quantity = 1) => {
      if (product.quantity <= 0) {
        toast.error('المنتج غير متوفر في المخزون')
        return
      }
      for (let i = 0; i < quantity; i++) {
        addToCart({
          productId: product.id,
          name: product.name,
          price: product.price,
          maxQuantity: product.quantity,
          image: product.image,
        })
      }
    },
    [addToCart]
  )

  const getCartItemQuantity = useCallback(
    (productId: string) => {
      return cart.find((item) => item.productId === productId)?.quantity || 0
    },
    [cart]
  )

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const effectiveTotal = Math.max(0, cartTotal() - loyaltyDiscount)
  const grandTotal = effectiveTotal

  // ── Split payment computed values (needed for handleConfirmPayment) ──
  const splitCashNum = parseFloat(splitCash) || 0
  const splitCardNum = parseFloat(splitCard) || 0
  const isSplitValid = (splitCashNum + splitCardNum) >= grandTotal && splitCashNum >= 0 && splitCardNum >= 0

  // ── Payment ──
  const handleOpenPayment = useCallback(() => {
    if (cart.length === 0) return
    setPaidAmount(grandTotal.toFixed(2))
    setPaymentTab('full')
    setSplitCash('')
    setSplitCard('')
    setPaymentDialogOpen(true)
  }, [cart.length, grandTotal])

  // ── Auto-award loyalty points after payment ──
  const awardLoyaltyPoints = useCallback(async (invoiceId: string, totalAmount: number, customerId: string | null) => {
    if (!loyaltySettings.loyaltyEnabled || !customerId || totalAmount <= 0) return
    try {
      const earnedPoints = Math.floor(totalAmount * (loyaltySettings.loyaltyPointsPerUnit || 0))
      if (earnedPoints <= 0) return
      await post('/api/loyalty', {
        customerId,
        points: earnedPoints,
        transactionType: 'earned',
        invoiceId,
        description: `كسب ${earnedPoints} نقطة من مشتريات بقيمة ${formatDual(totalAmount).display}`,
      }, { showErrorToast: false })
      fetchCustomers()
    } catch {
      // Silent — don't block payment for loyalty
    }
  }, [loyaltySettings, formatDual, fetchCustomers, post])

  const handleConfirmPayment = useCallback(async () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    // Compute the actual paid amount based on payment mode
    let paid: number
    if (paymentTab === 'split') {
      if (!isSplitValid) {
        toast.error('المبلغ غير كافٍ لتغطية الإجمالي')
        return
      }
      paid = splitCashNum + splitCardNum
    } else {
      paid = parseFloat(paidAmount)
      if (isNaN(paid) || paid < 0) {
        toast.error('يرجى إدخال مبلغ صحيح')
        return
      }
      if (paid < grandTotal) {
        toast.error('المبلغ المدفوع أقل من الإجمالي')
        return
      }
    }

    // Generate and store receipt number
    const receiptNumber = getNextReceiptNumber()

    setProcessingPayment(true)
    try {
      const result = await post<any>('/api/invoices', {
        type: 'sale',
        customerId: cartCustomerId || null,
        discount: cartDiscount,
        paidAmount: paid,
        userId: user.id,
        items: cart.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.price,
        })),
      }, { showErrorToast: false })

      if (result) {
        toast.success(`تم إنشاء الفاتورة ${receiptNumber} بنجاح`)
        // Auto-award loyalty points after successful payment
        awardLoyaltyPoints(result.id, result.totalAmount || subtotal, cartCustomerId)
        clearCart()
        setLoyaltyDiscount(0)
        setPaymentDialogOpen(false)
        // Refresh products to update stock
        fetchProducts(searchQuery, selectedCategoryId)
      } else {
        toast.error('حدث خطأ في إنشاء الفاتورة')
      }
    } finally {
      setProcessingPayment(false)
    }
  }, [
    user,
    paidAmount,
    grandTotal,
    cart,
    cartCustomerId,
    cartDiscount,
    clearCart,
    fetchProducts,
    searchQuery,
    selectedCategoryId,
    awardLoyaltyPoints,
    subtotal,
    loyaltyDiscount,
    paymentTab,
    splitCashNum,
    splitCardNum,
    isSplitValid,
    post,
  ])

  const handleClearCart = useCallback(() => {
    if (cart.length === 0) return
    setClearCartDialogOpen(true)
  }, [cart.length])

  const confirmClearCart = useCallback(() => {
    clearCart()
    setClearCartDialogOpen(false)
    toast.success('تم مسح السلة')
  }, [clearCart])

  // ── Quick discount handler ──
  const handleApplyDiscount = useCallback((percent: number) => {
    const discountAmount = (subtotal * percent) / 100
    setCartDiscount(Math.round(discountAmount * 100) / 100)
  }, [subtotal, setCartDiscount])

  const handleOpenCustomDiscount = useCallback(() => {
    setCustomDiscountValue('')
    setCustomDiscountType('percent')
    setCustomDiscountDialogOpen(true)
  }, [])

  const handleApplyCustomDiscount = useCallback(() => {
    const val = parseFloat(customDiscountValue)
    if (isNaN(val) || val <= 0) {
      toast.error('يرجى إدخال قيمة صحيحة')
      return
    }
    if (customDiscountType === 'percent') {
      if (val > 100) {
        toast.error('نسبة الخصم لا يمكن أن تتجاوز 100%')
        return
      }
      const discountAmount = (subtotal * val) / 100
      setCartDiscount(Math.round(discountAmount * 100) / 100)
    } else {
      if (val > subtotal) {
        toast.error('مبلغ الخصم لا يمكن أن يتجاوز المجموع الفرعي')
        return
      }
      setCartDiscount(Math.round(val * 100) / 100)
    }
    setCustomDiscountDialogOpen(false)
    toast.success('تم تطبيق الخصم')
  }, [customDiscountValue, customDiscountType, subtotal, setCartDiscount])

  // ── Hold order handler ──
  const handleHoldOrder = useCallback(() => {
    if (cart.length === 0) return
    setHoldNote('')
    setHoldDialogOpen(true)
  }, [cart.length])

  const confirmHoldOrder = useCallback(() => {
    const customerName = selectedCustomer?.name || null
    const id = holdCurrentOrder(holdNote, customerName)
    setHoldDialogOpen(false)
    setHoldNote('')
    toast.success(`تم تجميد الطلب (#${id})`)
  }, [holdCurrentOrder, holdNote, selectedCustomer])

  // ── Recall order handler ──
  const handleRecallOrder = useCallback((orderId: string) => {
    recallOrder(orderId)
    toast.success('تم استعادة الطلب إلى السلة')
  }, [recallOrder])

  // ── Delete held order handler ──
  const confirmDeleteHeldOrder = useCallback(() => {
    if (!deleteHeldOrderId) return
    deleteHeldOrder(deleteHeldOrderId)
    setDeleteHeldOrderId(null)
    toast.success('تم حذف الطلب المجمّد')
  }, [deleteHeldOrderId, deleteHeldOrder])

  // ── Barcode scan handler ──
  const handleBarcodeScan = useCallback(
    async (barcode: string) => {
      const trimmed = barcode.trim()
      if (!trimmed) return
      const result = await get<any[]>('/api/products', { barcode: trimmed }, { showErrorToast: false })
      if (result && result.length > 0) {
        const product = result[0]
        handleAddToCart(product)
        toast.success(`تمت إضافة ${product.name}`)
      } else {
        toast.error('المنتج غير موجود')
      }
      setBarcodeInput('')
    },
    [handleAddToCart, get]
  )

  // ── Fetch last invoices for popover ──
  const fetchLastInvoices = useCallback(async () => {
    setLastInvoicesLoading(true)
    try {
      const result = await get<any[]>('/api/invoices', { type: 'sale' }, { showErrorToast: false })
      if (result) setLastInvoices(result.slice(0, 3))
    } finally {
      setLastInvoicesLoading(false)
    }
  }, [get])

  // ── Open product quick view ──
  const handleProductClick = useCallback(async (product: Product) => {
    if (product.quantity <= 0) return

    // If product has variants, show variant selector
    if (product._count && product._count.variants > 0) {
      setVariantSelectorProduct(product)
      setVariantSelectorOpen(true)
      setVariantSelectorLoading(true)
      try {
        const result = await get<any[]>('/api/product-variants', { productId: product.id }, { showErrorToast: false })
        if (result) {
          setVariantSelectorVariants(result.filter((v: ProductVariant) => v.isActive))
        } else {
          toast.error('فشل في تحميل المتغيرات')
          setVariantSelectorOpen(false)
        }
      } catch {
        toast.error('حدث خطأ في تحميل المتغيرات')
        setVariantSelectorOpen(false)
      } finally {
        setVariantSelectorLoading(false)
      }
      return
    }

    // No variants — show quick view as before
    setQuickViewProduct(product)
    const inCart = cart.find((c) => c.productId === product.id)?.quantity || 0
    setQuickViewQuantity(inCart > 0 ? 1 : 1)
  }, [cart, get])

  const handleVariantSelect = useCallback((product: Product, variant: ProductVariant) => {
    if (variant.stock <= 0) {
      toast.error('هذا المتغير غير متوفر في المخزون')
      return
    }
    const displayName = `${product.name} (${variant.name})`
    addToCart({
      productId: product.id,
      variantId: variant.id,
      name: displayName,
      price: variant.sellPrice,
      maxQuantity: variant.stock,
      image: product.image,
    })
    toast.success(`تمت إضافة ${displayName}`)
    setVariantSelectorOpen(false)
    setVariantSelectorProduct(null)
    setVariantSelectorVariants([])
  }, [addToCart])

  const handleQuickViewAdd = useCallback(() => {
    if (!quickViewProduct) return
    handleAddToCart(quickViewProduct, quickViewQuantity)
    toast.success(`تمت إضافة ${quickViewProduct.name} (${quickViewQuantity})`)
    setQuickViewProduct(null)
    setQuickViewQuantity(1)
  }, [quickViewProduct, quickViewQuantity, handleAddToCart])

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // Ctrl+K or / — focus search (only when not already in an input)
      if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && !isInput) {
        e.preventDefault()
        searchInputRef.current?.focus()
        return
      }

      // F2 — focus barcode input
      if (e.key === 'F2') {
        e.preventDefault()
        barcodeInputRef.current?.focus()
        return
      }

      // F9 — trigger payment
      if (e.key === 'F9' && cart.length > 0 && !paymentDialogOpen) {
        e.preventDefault()
        handleOpenPayment()
        return
      }

      // Escape — clear search or close dialog
      if (e.key === 'Escape') {
        if (paymentDialogOpen) {
          setPaymentDialogOpen(false)
        } else if (clearCartDialogOpen) {
          setClearCartDialogOpen(false)
        } else if (holdDialogOpen) {
          setHoldDialogOpen(false)
        } else if (deleteHeldOrderId) {
          setDeleteHeldOrderId(null)
        } else if (quickViewProduct) {
          setQuickViewProduct(null)
        } else if (variantSelectorOpen) {
          setVariantSelectorOpen(false)
        } else if (document.activeElement === barcodeInputRef.current) {
          setBarcodeInput('')
          barcodeInputRef.current?.blur()
        } else if (document.activeElement === searchInputRef.current) {
          setSearchQuery('')
          searchInputRef.current?.blur()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [cart.length, paymentDialogOpen, clearCartDialogOpen, holdDialogOpen, deleteHeldOrderId, quickViewProduct, variantSelectorOpen, handleOpenPayment])

  // ── Compute held order total ──
  const getHeldOrderTotal = useCallback((order: typeof heldOrders[number]) => {
    const orderSubtotal = order.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return Math.max(0, orderSubtotal - order.discount)
  }, [])

  // ── Get customer name from held order ──
  const getHeldCustomerName = useCallback((order: typeof heldOrders[number]) => {
    if (order.customerName) return order.customerName
    if (order.customerId) {
      const customer = customers.find((c) => c.id === order.customerId)
      return customer?.name || 'عميل'
    }
    return null
  }, [customers])

  const displayProducts = products.filter((p) => p.isActive !== false)

  // ─── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="h-full flex flex-col lg:flex-row gap-0 animate-fade-in-up" dir="rtl">
      {/* ── Right Side: Product Grid ── */}
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
              disabled={cart.length === 0}
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

      {/* ── Left Side: Cart / Receipt ── */}
      <div className="w-full lg:w-[400px] xl:w-[420px] flex-shrink-0 border-r border-border/50 bg-card flex flex-col h-full lg:h-auto max-h-[50vh] lg:max-h-none glass-card relative">
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
                                className="flex-1 h-7 text-[10px] font-medium gap-1 rounded-lg bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100 hover:text-emerald-800 btn-ripple"
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
              {selectedCustomer && loyaltySettings.loyaltyEnabled && (
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

      {/* ── Calculator Widget ── */}
      <CalculatorWidget
        isOpen={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        onUseResult={(result) => {
          if (paymentDialogOpen) {
            setPaidAmount(result.toFixed(2))
          }
        }}
      />

      {/* ── Extracted Dialog Components ── */}

      <PaymentDialog
        open={paymentDialogOpen}
        onOpenChange={setPaymentDialogOpen}
        subtotal={subtotal}
        cartDiscount={cartDiscount}
        loyaltyDiscount={loyaltyDiscount}
        grandTotal={grandTotal}
        cart={cart}
        paymentTab={paymentTab}
        paidAmount={paidAmount}
        processingPayment={processingPayment}
        setPaymentTab={setPaymentTab}
        setPaidAmount={setPaidAmount}
        splitCash={splitCash}
        splitCard={splitCard}
        setSplitCash={setSplitCash}
        setSplitCard={setSplitCard}
        onConfirmPayment={handleConfirmPayment}
        symbol={symbol}
        formatDual={formatDual}
      />

      <LoyaltyRedeemDialog
        open={loyaltyRedeemDialogOpen}
        onOpenChange={setLoyaltyRedeemDialogOpen}
        selectedCustomer={selectedCustomer}
        customerPoints={customerPoints}
        redeemPoints={redeemPoints}
        setRedeemPoints={setRedeemPoints}
        redeemingPoints={redeemingPoints}
        loyaltySettings={loyaltySettings}
        onConfirmRedeem={handleConfirmLoyaltyRedeem}
        formatDual={formatDual}
        symbol={symbol}
      />

      <ConfirmDialog
        open={clearCartDialogOpen}
        onOpenChange={setClearCartDialogOpen}
        title="إلغاء العملية"
        description={`سيتم مسح جميع المنتجات من السلة (${cart.reduce((s, i) => s + i.quantity, 0)} منتج)`}
        onConfirm={confirmClearCart}
        confirmText="إلغاء العملية"
        cancelText="تراجع"
        variant="destructive"
      />

      <ProductQuickViewDialog
        open={!!quickViewProduct}
        onOpenChange={(open) => !open && setQuickViewProduct(null)}
        product={quickViewProduct}
        quickViewQuantity={quickViewQuantity}
        setQuickViewQuantity={setQuickViewQuantity}
        onAddToCart={handleQuickViewAdd}
        formatDual={formatDual}
        getCategoryIcon={getCategoryIcon}
        getCategoryColor={getCategoryColor}
      />

      <VariantSelectorDialog
        open={variantSelectorOpen}
        onOpenChange={(open) => { setVariantSelectorOpen(open); if (!open) { setVariantSelectorProduct(null); setVariantSelectorVariants([]) } }}
        product={variantSelectorProduct}
        variants={variantSelectorVariants}
        loading={variantSelectorLoading}
        onSelectVariant={handleVariantSelect}
        formatDual={formatDual}
      />

      <HoldOrderDialog
        open={holdDialogOpen}
        onOpenChange={setHoldDialogOpen}
        holdNote={holdNote}
        setHoldNote={setHoldNote}
        grandTotal={grandTotal}
        formatDual={formatDual}
        cartItemCount={cart.reduce((s, i) => s + i.quantity, 0)}
        onConfirmHold={confirmHoldOrder}
      />

      <ConfirmDialog
        open={!!deleteHeldOrderId}
        onOpenChange={(open) => !open && setDeleteHeldOrderId(null)}
        title="حذف الطلب المجمّد"
        description="هل أنت متأكد من حذف هذا الطلب المجمّد؟ لا يمكن التراجع عن هذا الإجراء"
        onConfirm={confirmDeleteHeldOrder}
        confirmText="حذف"
        cancelText="تراجع"
        variant="destructive"
      />

      <CustomDiscountDialog
        open={customDiscountDialogOpen}
        onOpenChange={setCustomDiscountDialogOpen}
        customDiscountValue={customDiscountValue}
        setCustomDiscountValue={setCustomDiscountValue}
        customDiscountType={customDiscountType}
        setCustomDiscountType={setCustomDiscountType}
        subtotal={subtotal}
        symbol={symbol}
        formatDual={formatDual}
        onApplyDiscount={handleApplyCustomDiscount}
      />
    </div>
  )
}
