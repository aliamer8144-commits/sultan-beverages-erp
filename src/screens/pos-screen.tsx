'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { CartPanel } from './pos/cart-panel'
import { ProductGrid } from './pos/product-grid'
import { getNextReceiptNumber } from '@/lib/receipt-utils'
import { getCategoryIcon, getCategoryColor } from '@/lib/category-utils'
import { toast } from 'sonner'
import { Calculator as CalculatorWidget } from '@/components/calculator'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'
import { ConfirmDialog } from '@/components/confirm-dialog'
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
    const result = await get<{ customers: Customer[] }>('/api/customers', undefined, { showErrorToast: false })
    if (result?.customers) setCustomers(result.customers)
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
    const result = await get<{ products: any[] }>('/api/products', params, { showErrorToast: false })
    if (result) setProducts(result.products)
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
      if (!isSplitValid) return
      paid = splitCashNum + splitCardNum
    } else {
      paid = parseFloat(paidAmount)
      if (isNaN(paid) || paid < 0) return
      if (paid < grandTotal) return
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
    if (isNaN(val) || val <= 0) return
    if (customDiscountType === 'percent') {
      if (val > 100) return
      const discountAmount = (subtotal * val) / 100
      setCartDiscount(Math.round(discountAmount * 100) / 100)
    } else {
      if (val > subtotal) return
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
      const result = await get<{ invoices: LastInvoice[] }>('/api/invoices', { type: 'sale' }, { showErrorToast: false })
      if (result) setLastInvoices(result.invoices.slice(0, 3))
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
      <ProductGrid
        displayProducts={displayProducts}
        categories={categories}
        loading={loading}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        selectedCategoryId={selectedCategoryId}
        setSelectedCategoryId={setSelectedCategoryId}
        barcodeInput={barcodeInput}
        setBarcodeInput={setBarcodeInput}
        barcodeFocused={barcodeFocused}
        setBarcodeFocused={setBarcodeFocused}
        handleBarcodeScan={handleBarcodeScan}
        getCartItemQuantity={getCartItemQuantity}
        handleProductClick={handleProductClick}
        lastInvoices={lastInvoices}
        lastInvoicesLoading={lastInvoicesLoading}
        fetchLastInvoices={fetchLastInvoices}
        salesTarget={salesTarget}
        calculatorOpen={calculatorOpen}
        setCalculatorOpen={setCalculatorOpen}
        handleClearCart={handleClearCart}
        cartLength={cart.length}
        searchInputRef={searchInputRef}
        barcodeInputRef={barcodeInputRef}
        symbol={symbol}
        formatDual={formatDual}
      />

      {/* ── Left Side: Cart / Receipt ── */}
      <CartPanel
        cart={cart}
        cartDiscount={cartDiscount}
        cartCustomerId={cartCustomerId}
        loyaltyDiscount={loyaltyDiscount}
        grandTotal={grandTotal}
        subtotal={subtotal}
        customers={customers}
        selectedCustomer={selectedCustomer}
        customerPoints={customerPoints}
        isLoyaltyActive={isLoyaltyActive}
        loyaltyEnabled={loyaltySettings.loyaltyEnabled}
        symbol={symbol}
        formatDual={formatDual}
        setCartDiscount={setCartDiscount}
        setCartCustomerId={setCartCustomerId}
        updateCartQuantity={updateCartQuantity}
        removeFromCart={removeFromCart}
        handleOpenPayment={handleOpenPayment}
        handleClearCart={handleClearCart}
        handleHoldOrder={handleHoldOrder}
        handleOpenLoyaltyRedeem={handleOpenLoyaltyRedeem}
        handleApplyDiscount={handleApplyDiscount}
        handleOpenCustomDiscount={handleOpenCustomDiscount}
        heldOrders={heldOrders}
        handleRecallOrder={handleRecallOrder}
        setDeleteHeldOrderId={setDeleteHeldOrderId}
        getHeldOrderTotal={getHeldOrderTotal}
        getHeldCustomerName={getHeldCustomerName}
      />

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
