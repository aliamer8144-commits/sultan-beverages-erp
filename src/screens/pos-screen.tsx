'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Label } from '@/components/ui/label'
import {
  Search,
  Plus,
  Minus,
  Trash2,
  CreditCard,
  Printer,
  ShoppingCart,
  X,
  Sparkles,
  CupSoda,
  Beer,
  Wine,
  Coffee,
  Droplets,
  IceCreamCone,
  GlassWater,
  Citrus,
  Flame,
  Leaf,
  LucideIcon,
  type LucideProps,
  ScanBarcode,
  RotateCcw,
  FileText,
  Zap,
  Package,
  Calculator,
  PauseCircle,
  Clock,
  Play,
  Target,
  Star,
  Banknote,
  ReceiptText,
  Percent,
} from 'lucide-react'
import { toast } from 'sonner'
import { Calculator as CalculatorWidget } from '@/components/calculator'
import { useCurrency } from '@/hooks/use-currency'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Product {
  id: string
  name: string
  price: number
  costPrice: number
  quantity: number
  minQuantity: number
  categoryId: string
  category: { id: string; name: string; icon: string }
  image?: string
  barcode?: string
  isActive: boolean
  _count?: { variants: number }
}

interface Category {
  id: string
  name: string
  icon: string
  _count?: { products: number }
}

interface Customer {
  id: string
  name: string
  phone?: string
  debt: number
  loyaltyPoints?: number
}

interface ProductVariant {
  id: string
  productId: string
  name: string
  sku?: string
  barcode?: string
  costPrice: number
  sellPrice: number
  stock: number
  isActive: boolean
}

interface LastInvoice {
  id: string
  invoiceNo: string
  totalAmount: number
  createdAt: string
  customer: { name: string } | null
}

// ─── Sales Target compact data ─────────────────────────────────
interface SalesTargetCompact {
  progressPercent: number
  targetAmount: number
  currentAmount: number
  type: string
}

// ─── Receipt number helper ─────────────────────────────────────────────

function getNextReceiptNumber(): string {
  const today = new Date()
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')
  const key = `sultan-receipt-counter-${dateStr}`
  const stored = localStorage.getItem(key)
  let seq = 1
  if (stored) {
    seq = parseInt(stored, 10) + 1
  }
  localStorage.setItem(key, seq.toString())
  return `INV-${dateStr}-${String(seq).padStart(4, '0')}`
}

function peekNextReceiptNumber(): string {
  const today = new Date()
  const dateStr = today.getFullYear().toString() +
    String(today.getMonth() + 1).padStart(2, '0') +
    String(today.getDate()).padStart(2, '0')
  const key = `sultan-receipt-counter-${dateStr}`
  const stored = localStorage.getItem(key)
  const seq = stored ? parseInt(stored, 10) + 1 : 1
  return `INV-${dateStr}-${String(seq).padStart(4, '0')}`
}

// ─── Icon mapping ────────────────────────────────────────────────────────────

const iconMap: Record<string, LucideIcon> = {
  CupSoda,
  Beer,
  Wine,
  Coffee,
  Droplets,
  IceCreamCone,
  GlassWater,
  Citrus,
  Flame,
  Leaf,
  Sparkles,
}

function getCategoryIcon(iconName: string, props: LucideProps) {
  const Icon = iconMap[iconName] || CupSoda
  return <Icon {...props} />
}

// ─── Category color palette ──────────────────────────────────────────────────

const categoryColors: Record<string, { bg: string; text: string; hover: string }> = {
  default: { bg: 'bg-primary/10', text: 'text-primary', hover: 'group-hover:bg-primary/20' },
}

const colorPalette = [
  { bg: 'bg-emerald-500/10', text: 'text-emerald-600', hover: 'group-hover:bg-emerald-500/20' },
  { bg: 'bg-amber-500/10', text: 'text-amber-600', hover: 'group-hover:bg-amber-500/20' },
  { bg: 'bg-rose-500/10', text: 'text-rose-600', hover: 'group-hover:bg-rose-500/20' },
  { bg: 'bg-violet-500/10', text: 'text-violet-600', hover: 'group-hover:bg-violet-500/20' },
  { bg: 'bg-cyan-500/10', text: 'text-cyan-600', hover: 'group-hover:bg-cyan-500/20' },
  { bg: 'bg-orange-500/10', text: 'text-orange-600', hover: 'group-hover:bg-orange-500/20' },
  { bg: 'bg-teal-500/10', text: 'text-teal-600', hover: 'group-hover:bg-teal-500/20' },
  { bg: 'bg-pink-500/10', text: 'text-pink-600', hover: 'group-hover:bg-pink-500/20' },
  { bg: 'bg-lime-500/10', text: 'text-lime-600', hover: 'group-hover:bg-lime-500/20' },
  { bg: 'bg-sky-500/10', text: 'text-sky-600', hover: 'group-hover:bg-sky-500/20' },
]

function getCategoryColor(categoryId: string) {
  let hash = 0
  for (let i = 0; i < categoryId.length; i++) {
    hash = categoryId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colorPalette[Math.abs(hash) % colorPalette.length]
}

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
  const { symbol, formatDual, isDualActive } = useCurrency()

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
  const selectedCustomer = cartCustomerId ? customers.find((c) => c.id === cartCustomerId) : null
  const customerPoints = selectedCustomer?.loyaltyPoints || 0
  const loyaltySettings = settings
  const isLoyaltyActive = loyaltySettings.loyaltyEnabled && !!cartCustomerId && customerPoints >= (loyaltySettings.loyaltyMinPointsToRedeem || 0)

  // ── Fetch customers (needed before loyalty handlers) ──
  const fetchCustomers = useCallback(async () => {
    try {
      const res = await fetch('/api/customers')
      const json = await res.json()
      if (json.success) {
        setCustomers(json.data)
      }
    } catch {
      // Silent fail
    }
  }, [])

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
      const res = await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomer.id,
          points: -pts,
          transactionType: 'redeemed',
          description: `استبدال ${pts} نقطة كخصم في نقطة البيع`,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const discountValue = pts * (loyaltySettings.loyaltyRedemptionValue || 0)
        setLoyaltyDiscount(discountValue)
        toast.success(`تم استبدال ${pts} نقطة — خصم ${formatDual(discountValue).display}`)
        setLoyaltyRedeemDialogOpen(false)
        fetchCustomers()
      } else {
        toast.error(data.error || 'حدث خطأ أثناء استبدال النقاط')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
    } finally {
      setRedeemingPoints(false)
    }
  }, [selectedCustomer, redeemPoints, customerPoints, loyaltySettings, formatDual, fetchCustomers])

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
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (categoryId && categoryId !== 'all') params.set('categoryId', categoryId)
      const res = await fetch(`/api/products?${params.toString()}`)
      const json = await res.json()
      if (json.success) {
        setProducts(json.data)
      }
    } catch {
      // Silent fail for POS speed
    }
  }, [])

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/categories')
      const json = await res.json()
      if (json.success) {
        setCategories(json.data)
      }
    } catch {
      // Silent fail
    }
  }, [])

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
      try {
        const res = await fetch('/api/sales-targets')
        const json = await res.json()
        if (!cancelled && json.success && json.data) {
          setSalesTarget({
            progressPercent: json.data.progressPercent,
            targetAmount: json.data.targetAmount,
            currentAmount: json.data.currentAmount,
            type: json.data.type,
          })
        }
      } catch {
        // Silent
      }
    }
    fetchTarget()
    const interval = setInterval(fetchTarget, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

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
  const change = parseFloat(paidAmount) - grandTotal

  // ── Split payment computed values ──
  const splitCashNum = parseFloat(splitCash) || 0
  const splitCardNum = parseFloat(splitCard) || 0
  const splitTotal = splitCashNum + splitCardNum
  const splitRemaining = Math.max(0, grandTotal - splitTotal)
  const isSplitValid = splitTotal >= grandTotal && splitCashNum >= 0 && splitCardNum >= 0

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
      await fetch('/api/loyalty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          points: earnedPoints,
          transactionType: 'earned',
          invoiceId,
          description: `كسب ${earnedPoints} نقطة من مشتريات بقيمة ${formatDual(totalAmount).display}`,
        }),
      })
      fetchCustomers()
    } catch {
      // Silent — don't block payment for loyalty
    }
  }, [loyaltySettings, formatDual, fetchCustomers])

  const handleConfirmPayment = useCallback(async () => {
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    // Compute the actual paid amount based on payment mode
    let paid: number
    let paymentMethod: string = 'cash'
    if (paymentTab === 'split') {
      if (!isSplitValid) {
        toast.error('المبلغ غير كافٍ لتغطية الإجمالي')
        return
      }
      paid = splitCashNum + splitCardNum
      paymentMethod = 'split'
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
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(`تم إنشاء الفاتورة ${receiptNumber} بنجاح`)
        // Auto-award loyalty points after successful payment
        awardLoyaltyPoints(json.data.id, json.data.totalAmount || subtotal, cartCustomerId)
        clearCart()
        setLoyaltyDiscount(0)
        setPaymentDialogOpen(false)
        // Refresh products to update stock
        fetchProducts(searchQuery, selectedCategoryId)
      } else {
        toast.error(json.error || 'حدث خطأ في إنشاء الفاتورة')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
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
      try {
        const res = await fetch(`/api/products?barcode=${encodeURIComponent(trimmed)}`)
        const json = await res.json()
        if (json.success && json.data.length > 0) {
          const product = json.data[0]
          handleAddToCart(product)
          toast.success(`تمت إضافة ${product.name}`)
        } else {
          toast.error('المنتج غير موجود')
        }
      } catch {
        toast.error('حدث خطأ في البحث عن المنتج')
      }
      setBarcodeInput('')
    },
    [handleAddToCart]
  )

  // ── Fetch last invoices for popover ──
  const fetchLastInvoices = useCallback(async () => {
    setLastInvoicesLoading(true)
    try {
      const res = await fetch('/api/invoices?type=sale')
      const json = await res.json()
      if (json.success) {
        setLastInvoices(json.data.slice(0, 3))
      }
    } catch {
      // Silent
    } finally {
      setLastInvoicesLoading(false)
    }
  }, [])

  // ── Open product quick view ──
  const handleProductClick = useCallback(async (product: Product) => {
    if (product.quantity <= 0) return

    // If product has variants, show variant selector
    if (product._count && product._count.variants > 0) {
      setVariantSelectorProduct(product)
      setVariantSelectorOpen(true)
      setVariantSelectorLoading(true)
      try {
        const res = await fetch(`/api/product-variants?productId=${product.id}`)
        const data = await res.json()
        if (data.success) {
          setVariantSelectorVariants(data.data.filter((v: ProductVariant) => v.isActive))
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
  }, [cart])

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

  // ── Relative time in Arabic ──
  const formatRelativeTime = useCallback((isoDate: string) => {
    const now = Date.now()
    const then = new Date(isoDate).getTime()
    const diffMs = now - then
    const diffMin = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return 'الآن'
    if (diffMin < 60) return `منذ ${diffMin} دقائق`
    if (diffHours < 24) return `منذ ${diffHours} ساعات`
    return `منذ ${diffDays} أيام`
  }, [])

  // ── Compute held order total ──
  const getHeldOrderTotal = useCallback((order: typeof heldOrders[number]) => {
    const subtotal = order.cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
    return Math.max(0, subtotal - order.discount)
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
                              {new Date(inv.createdAt).toLocaleDateString('ar-SA')}
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
                                  {formatRelativeTime(order.heldAt)}
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
            <div className="empty-state-v2 h-full flex flex-col items-center justify-center text-center px-6">
              <div className="empty-state-v2-icon w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-3 animate-pulse-glow">
                <ShoppingCart className="w-7 h-7 text-muted-foreground/30" />
              </div>
              <p className="empty-state-v2-title text-sm">السلة فارغة</p>
              <p className="empty-state-v2-description text-xs mt-1">اضغط على منتج لإضافته</p>
            </div>
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
                    <Percent className="w-2.5 h-2.5" />
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

      {/* ── Payment Dialog ── */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-lg animated-border-gradient dialog-slide-up" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              تأكيد الدفع
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Receipt number */}
            <div className="flex items-center gap-2 rounded-xl bg-muted/40 px-4 py-2.5">
              <ReceiptText className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">رقم الفاتورة:</span>
              <span className="text-sm font-bold font-mono text-primary">{peekNextReceiptNumber()}</span>
            </div>

            {/* Summary */}
            <div className="rounded-xl bg-muted/40 p-4 space-y-2.5">
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
              <Separator />
              <div className="flex justify-between items-center">
                <span className="font-bold">الإجمالي المطلوب</span>
                <span className="text-lg font-bold text-primary tabular-nums">{formatDual(grandTotal).display}</span>
              </div>
            </div>

            {/* Items count */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ShoppingCart className="w-4 h-4" />
              <span>
                {cart.reduce((s, i) => s + i.quantity, 0)} منتج — {cart.length} صنف
              </span>
            </div>

            {/* Payment method tabs */}
            <Tabs value={paymentTab} onValueChange={(v) => setPaymentTab(v as 'full' | 'split')} className="w-full">
              <TabsList className="w-full h-10">
                <TabsTrigger value="full" className="flex-1 gap-1.5 text-xs">
                  <Banknote className="w-3.5 h-3.5" />
                  دفع كامل
                </TabsTrigger>
                <TabsTrigger value="split" className="flex-1 gap-1.5 text-xs">
                  <CreditCard className="w-3.5 h-3.5" />
                  دفع مجزأ
                </TabsTrigger>
              </TabsList>

              {/* Full payment tab */}
              <TabsContent value="full" className="space-y-4 mt-4">
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">المبلغ المدفوع</Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={paidAmount}
                      onChange={(e) => setPaidAmount(e.target.value)}
                      placeholder="0.00"
                      className="h-12 rounded-xl text-lg font-bold pr-4 pl-14 tabular-nums"
                      autoFocus
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">{symbol}</span>
                  </div>
                </div>

                {/* Quick amount buttons */}
                <div className="flex gap-2 flex-wrap">
                  {[10, 20, 50, 100, 200, 500].map((amt) => (
                    <button
                      key={amt}
                      onClick={() => setPaidAmount(amt.toString())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                        parseFloat(paidAmount) === amt
                          ? 'bg-primary text-white shadow-sm'
                          : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                      }`}
                    >
                      {amt}
                    </button>
                  ))}
                </div>

                {/* Change / insufficient */}
                {paidAmount && parseFloat(paidAmount) >= grandTotal && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-700">الباقي</span>
                    <span className="text-lg font-bold text-emerald-600 tabular-nums">
                      {change.toFixed(2)} {symbol}
                    </span>
                  </div>
                )}
                {paidAmount && parseFloat(paidAmount) < grandTotal && parseFloat(paidAmount) > 0 && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-destructive">المبلغ غير كافٍ</span>
                    <span className="text-lg font-bold text-destructive tabular-nums">
                      {(grandTotal - parseFloat(paidAmount)).toFixed(2)} {symbol} متبقي
                    </span>
                  </div>
                )}
              </TabsContent>

              {/* Split payment tab */}
              <TabsContent value="split" className="space-y-4 mt-4">
                {/* Cash input */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <Banknote className="w-3.5 h-3.5 text-emerald-600" />
                    المبلغ النقدي
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={splitCash}
                      onChange={(e) => setSplitCash(e.target.value)}
                      placeholder="0.00"
                      className="h-11 rounded-xl text-base font-bold pr-4 pl-14 tabular-nums"
                      autoFocus
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">{symbol}</span>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {[10, 20, 50, 100, 200, 500].filter(a => a <= grandTotal).map((amt) => (
                      <button
                        key={`cash-${amt}`}
                        onClick={() => setSplitCash(amt.toString())}
                        className={`px-2.5 py-1 rounded-md text-[10px] font-medium transition-all duration-150 ${
                          splitCashNum === amt
                            ? 'bg-emerald-500 text-white shadow-sm'
                            : 'bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20'
                        }`}
                      >
                        {amt}
                      </button>
                    ))}
                    <button
                      onClick={() => setSplitCash(grandTotal.toString())}
                      className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-all duration-150"
                    >
                      الكامل
                    </button>
                  </div>
                </div>

                {/* Card input */}
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    المبلغ بالبطاقة
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={0}
                      step={0.5}
                      value={splitCard}
                      onChange={(e) => setSplitCard(e.target.value)}
                      placeholder="0.00"
                      className="h-11 rounded-xl text-base font-bold pr-4 pl-14 tabular-nums"
                    />
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">{symbol}</span>
                  </div>
                  <button
                    onClick={() => setSplitCard(splitRemaining.toFixed(2))}
                    className="px-2.5 py-1 rounded-md text-[10px] font-medium bg-blue-500/10 text-blue-600 hover:bg-blue-500/20 transition-all duration-150"
                  >
                    المتبقي ({splitRemaining.toFixed(2)})
                  </button>
                </div>

                {/* Split summary */}
                <div className="rounded-xl bg-muted/40 p-3 space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">نقدي + بطاقة</span>
                    <span className="font-medium tabular-nums">
                      {splitCashNum.toFixed(2)} + {splitCardNum.toFixed(2)} = {splitTotal.toFixed(2)} {symbol}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">المتبقي</span>
                    <span className={`font-bold tabular-nums ${splitRemaining > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {splitRemaining.toFixed(2)} {symbol}
                    </span>
                  </div>
                </div>

                {/* Cash change */}
                {splitCashNum > 0 && grandTotal > splitCardNum && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-emerald-700">الباقي (نقدي)</span>
                    <span className="text-lg font-bold text-emerald-600 tabular-nums">
                      {Math.max(0, splitCashNum - (grandTotal - splitCardNum)).toFixed(2)} {symbol}
                    </span>
                  </div>
                )}

                {/* Validation messages */}
                {splitTotal > 0 && splitTotal < grandTotal && (
                  <div className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-center justify-between">
                    <span className="text-sm font-medium text-destructive">المبلغ غير كافٍ</span>
                    <span className="text-base font-bold text-destructive tabular-nums">
                      {splitRemaining.toFixed(2)} {symbol} متبقي
                    </span>
                  </div>
                )}
                {isSplitValid && (
                  <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                    <span className="text-sm font-medium text-emerald-700">المبلغ مكتمل ✓</span>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setPaymentDialogOpen(false)}
              className="flex-1 h-11 rounded-xl"
              disabled={processingPayment}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmPayment}
              disabled={
                processingPayment ||
                (paymentTab === 'full' ? (!paidAmount || parseFloat(paidAmount) < grandTotal) : !isSplitValid)
              }
              className="flex-1 h-11 rounded-xl gap-2 shadow-lg shadow-primary/25"
            >
              {processingPayment ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <Printer className="w-4 h-4" />
                  <span>تأكيد الدفع</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Loyalty Redeem Dialog ── */}
      <Dialog open={loyaltyRedeemDialogOpen} onOpenChange={setLoyaltyRedeemDialogOpen}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <Star className="w-5 h-5 text-amber-500" />
              </div>
              استبدال النقاط
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Customer info */}
            {selectedCustomer && (
              <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold">{selectedCustomer.name}</p>
                  <p className="text-[10px] text-muted-foreground">رصيد النقاط</p>
                </div>
                <div className="text-left">
                  <p className="text-xl font-bold text-amber-600 tabular-nums">{customerPoints}</p>
                  <p className="text-[10px] text-muted-foreground">نقطة</p>
                </div>
              </div>
            )}

            {/* Points input */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">عدد النقاط للاستبدال</label>
              <div className="relative">
                <Input
                  type="number"
                  min={loyaltySettings.loyaltyMinPointsToRedeem || 0}
                  max={customerPoints}
                  value={redeemPoints}
                  onChange={(e) => setRedeemPoints(e.target.value)}
                  placeholder="0"
                  className="h-11 rounded-xl text-base font-bold pr-4 pl-14 tabular-nums"
                  autoFocus
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-medium">نقطة</span>
              </div>
              {redeemPoints && parseInt(redeemPoints) > customerPoints && (
                <p className="text-[11px] text-destructive">النقاط المطلوبة أكبر من المتاح ({customerPoints})</p>
              )}
            </div>

            {/* Quick points buttons */}
            <div className="flex gap-2 flex-wrap">
              {(() => {
                const minPts = loyaltySettings.loyaltyMinPointsToRedeem || 100
                const quarterPts = Math.floor(customerPoints / 4)
                const halfPts = Math.floor(customerPoints / 2)
                const buttons: Array<{ label: string; value: number }> = []
                if (quarterPts >= minPts) buttons.push({ label: `١/٤ (${quarterPts})`, value: quarterPts })
                if (halfPts >= minPts) buttons.push({ label: `نصف (${halfPts})`, value: halfPts })
                buttons.push({ label: `الكل (${customerPoints})`, value: customerPoints })
                return buttons.map((btn) => (
                  <button
                    key={btn.value}
                    onClick={() => setRedeemPoints(String(btn.value))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                      parseInt(redeemPoints) === btn.value
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-amber-500/10 text-amber-600 hover:bg-amber-500/20'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))
              })()}
            </div>

            {/* Discount preview */}
            {redeemPoints && parseInt(redeemPoints) > 0 && parseInt(redeemPoints) <= customerPoints && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">قيمة الخصم</p>
                <p className="text-lg font-bold text-emerald-600 tabular-nums">
                  {formatDual(parseInt(redeemPoints) * (loyaltySettings.loyaltyRedemptionValue || 0)).display}
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {redeemPoints} نقطة × {loyaltySettings.loyaltyRedemptionValue || 0} {symbol} = {formatDual(parseInt(redeemPoints) * (loyaltySettings.loyaltyRedemptionValue || 0)).display}
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setLoyaltyRedeemDialogOpen(false)}
              className="flex-1 h-10 rounded-xl"
              disabled={redeemingPoints}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleConfirmLoyaltyRedeem}
              disabled={redeemingPoints || !redeemPoints || parseInt(redeemPoints) <= 0 || parseInt(redeemPoints) > customerPoints}
              className="flex-1 h-10 rounded-xl gap-2 shadow-lg shadow-amber-500/25 bg-amber-500 hover:bg-amber-600 text-white"
            >
              {redeemingPoints ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري المعالجة...</span>
                </>
              ) : (
                <>
                  <Star className="w-4 h-4" />
                  <span>تأكيد الاستبدال</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Clear Cart Confirmation Dialog ── */}
      <Dialog open={clearCartDialogOpen} onOpenChange={setClearCartDialogOpen}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <RotateCcw className="w-5 h-5 text-destructive" />
              </div>
              إلغاء العملية
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-center">
            <p className="text-sm text-muted-foreground">
              هل أنت متأكد من إلغاء العملية الحالية؟
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              سيتم مسح جميع المنتجات من السلة ({cart.reduce((s, i) => s + i.quantity, 0)} منتج)
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setClearCartDialogOpen(false)}
              className="flex-1 h-10 rounded-xl"
            >
              تراجع
            </Button>
            <Button
              variant="destructive"
              onClick={confirmClearCart}
              className="flex-1 h-10 rounded-xl gap-2"
            >
              <Trash2 className="w-4 h-4" />
              إلغاء العملية
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Product Quick View Dialog (Feature 3) ── */}
      <Dialog open={!!quickViewProduct} onOpenChange={(open) => !open && setQuickViewProduct(null)}>
        <DialogContent className="sm:max-w-xs" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-base">
              تفاصيل المنتج
            </DialogTitle>
          </DialogHeader>
          {quickViewProduct && (
            <div className="space-y-4">
              {/* Product image */}
              {(() => {
                const colors = getCategoryColor(quickViewProduct.categoryId)
                return quickViewProduct.image ? (
                  <div className="product-image-lg w-full h-32">
                    <img
                      src={quickViewProduct.image}
                      alt={quickViewProduct.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="product-placeholder w-full h-32 rounded-xl">
                    {getCategoryIcon(quickViewProduct.category.icon || 'CupSoda', { className: 'w-12 h-12' })}
                  </div>
                )
              })()}
              {/* Product info */}
              <div className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold truncate">{quickViewProduct.name}</h3>
                  <p className="text-[11px] text-muted-foreground">{quickViewProduct.category.name}</p>
                </div>
              </div>

              {/* Price & Stock */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">السعر</p>
                  <p className="text-base font-bold text-primary tabular-nums">
                    {formatDual(quickViewProduct.price).display}
                  </p>
                </div>
                <div className="bg-muted/50 rounded-lg p-3 text-center">
                  <p className="text-[10px] text-muted-foreground mb-0.5">المخزون</p>
                  <p className={`text-base font-bold tabular-nums ${quickViewProduct.quantity <= quickViewProduct.minQuantity ? 'text-amber-600' : 'text-emerald-600'}`}>
                    {quickViewProduct.quantity}
                  </p>
                </div>
              </div>

              {/* Quantity selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">الكمية</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuickViewQuantity(Math.max(1, quickViewQuantity - 1))}
                    className="w-9 h-9 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <Input
                    type="number"
                    min={1}
                    max={quickViewProduct.quantity}
                    value={quickViewQuantity}
                    onChange={(e) => {
                      const val = parseInt(e.target.value) || 1
                      setQuickViewQuantity(Math.max(1, Math.min(val, quickViewProduct.quantity)))
                    }}
                    className="h-9 rounded-xl text-center text-base font-bold tabular-nums"
                    dir="ltr"
                  />
                  <button
                    onClick={() => setQuickViewQuantity(Math.min(quickViewProduct.quantity, quickViewQuantity + 1))}
                    className="w-9 h-9 rounded-xl bg-muted/50 border border-border/60 flex items-center justify-center hover:bg-muted transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {quickViewQuantity > 0 && (
                  <p className="text-[10px] text-muted-foreground text-center">
                    الإجمالي: {formatDual(quickViewProduct.price * quickViewQuantity).display}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setQuickViewProduct(null)}
              className="flex-1 h-10 rounded-xl"
            >
              إغلاق
            </Button>
            <Button
              onClick={handleQuickViewAdd}
              className="flex-1 h-10 rounded-xl gap-2 btn-ripple"
            >
              <Plus className="w-4 h-4" />
              إضافة للسلة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Variant Selector Dialog ── */}
      <Dialog open={variantSelectorOpen} onOpenChange={(open) => { setVariantSelectorOpen(open); if (!open) { setVariantSelectorProduct(null); setVariantSelectorVariants([]) } }}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right text-base flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <CupSoda className="w-4 h-4 text-violet-700 dark:text-violet-400" />
              </div>
              اختر المتغير
            </DialogTitle>
            <DialogDescription className="text-right">
              {variantSelectorProduct?.name}
            </DialogDescription>
          </DialogHeader>

          {variantSelectorLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
            </div>
          ) : variantSelectorVariants.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p className="text-sm">لا توجد متغيرات متاحة</p>
            </div>
          ) : (
            <ScrollArea className="max-h-[50vh]">
              <div className="space-y-2">
                {variantSelectorVariants.map((variant) => (
                  <button
                    key={variant.id}
                    onClick={() => variantSelectorProduct && handleVariantSelect(variantSelectorProduct, variant)}
                    disabled={variant.stock <= 0}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-right ${
                      variant.stock <= 0
                        ? 'opacity-50 cursor-not-allowed bg-muted/30'
                        : 'bg-card hover:bg-muted/50 hover:border-primary/30 cursor-pointer'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{variant.name}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {variant.sku && <span className="font-mono mr-2">{variant.sku}</span>}
                        المخزون: {variant.stock}
                      </p>
                    </div>
                    <div className="text-left flex-shrink-0">
                      <p className="text-sm font-bold text-primary tabular-nums">
                        {formatDual(variant.sellPrice).display}
                      </p>
                      {variant.stock <= 0 && (
                        <p className="text-[10px] text-destructive font-medium">غير متوفر</p>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </ScrollArea>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setVariantSelectorOpen(false)}
              className="flex-1 h-10 rounded-xl"
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Hold Order Dialog ── */}
      <Dialog open={holdDialogOpen} onOpenChange={setHoldDialogOpen}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                <PauseCircle className="w-5 h-5 text-amber-500" />
              </div>
              تجميد الطلب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Summary */}
            <div className="rounded-xl bg-muted/40 p-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">عدد المنتجات</span>
                <span className="font-medium">{cart.reduce((s, i) => s + i.quantity, 0)} منتج</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">الإجمالي</span>
                <span className="font-bold text-primary tabular-nums">{formatDual(grandTotal).display}</span>
              </div>
            </div>
            {/* Note */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">ملاحظة (اختياري)</label>
              <Input
                type="text"
                value={holdNote}
                onChange={(e) => setHoldNote(e.target.value)}
                placeholder="مثال: ينتظر العميل"
                className="h-10 rounded-xl text-sm"
                autoFocus
              />
              <div className="flex gap-1.5 flex-wrap">
                {['ينتظر العميل', 'سيكمل لاحقاً', 'استفسار عن السعر'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setHoldNote(suggestion)}
                    className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all duration-150 ${
                      holdNote === suggestion
                        ? 'bg-amber-500 text-white shadow-sm'
                        : 'bg-muted/60 text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setHoldDialogOpen(false)}
              className="flex-1 h-10 rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={confirmHoldOrder}
              className="flex-1 h-10 rounded-xl gap-2 shadow-lg shadow-amber-500/25 bg-amber-500 hover:bg-amber-600 text-white"
            >
              <PauseCircle className="w-4 h-4" />
              تجميد الطلب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Held Order Confirmation Dialog ── */}
      <Dialog open={!!deleteHeldOrderId} onOpenChange={(open) => !open && setDeleteHeldOrderId(null)}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <div className="w-9 h-9 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              حذف الطلب المجمّد
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-center">
            <p className="text-sm text-muted-foreground">
              هل أنت متأكد من حذف هذا الطلب المجمّد؟
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              لا يمكن التراجع عن هذا الإجراء
            </p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setDeleteHeldOrderId(null)}
              className="flex-1 h-10 rounded-xl"
            >
              تراجع
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDeleteHeldOrder}
              className="flex-1 h-10 rounded-xl gap-2"
            >
              <Trash2 className="w-4 h-4" />
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Custom Discount Dialog ── */}
      <Dialog open={customDiscountDialogOpen} onOpenChange={setCustomDiscountDialogOpen}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-right">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                <Percent className="w-5 h-5 text-primary" />
              </div>
              خصم مخصص
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Discount type tabs */}
            <Tabs value={customDiscountType} onValueChange={(v) => setCustomDiscountType(v as 'percent' | 'amount')} className="w-full">
              <TabsList className="w-full h-9">
                <TabsTrigger value="percent" className="flex-1 text-xs">
                  نسبة مئوية %
                </TabsTrigger>
                <TabsTrigger value="amount" className="flex-1 text-xs">
                  مبلغ ثابت
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Value input */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                {customDiscountType === 'percent' ? 'نسبة الخصم' : 'مبلغ الخصم'}
              </Label>
              <div className="relative">
                <Input
                  type="number"
                  min={0}
                  max={customDiscountType === 'percent' ? 100 : subtotal}
                  step={0.5}
                  value={customDiscountValue}
                  onChange={(e) => setCustomDiscountValue(e.target.value)}
                  placeholder={customDiscountType === 'percent' ? '0' : '0.00'}
                  className="h-12 rounded-xl text-lg font-bold pr-4 pl-14 tabular-nums"
                  autoFocus
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">
                  {customDiscountType === 'percent' ? '%' : symbol}
                </span>
              </div>
            </div>

            {/* Discount preview */}
            {customDiscountValue && parseFloat(customDiscountValue) > 0 && (
              <div className="rounded-xl bg-muted/40 p-3 space-y-2">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>المجموع الفرعي</span>
                  <span className="font-medium tabular-nums">{formatDual(subtotal).display}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-destructive">الخصم</span>
                  <span className="font-bold text-destructive tabular-nums">
                    -{customDiscountType === 'percent'
                      ? formatDual((subtotal * parseFloat(customDiscountValue)) / 100).display
                      : formatDual(parseFloat(customDiscountValue)).display
                    }
                  </span>
                </div>
                <Separator />
                <div className="flex justify-between text-sm font-bold">
                  <span>الإجمالي بعد الخصم</span>
                  <span className="text-primary tabular-nums">
                    {customDiscountType === 'percent'
                      ? formatDual(subtotal - (subtotal * parseFloat(customDiscountValue)) / 100).display
                      : formatDual(subtotal - parseFloat(customDiscountValue)).display
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setCustomDiscountDialogOpen(false)}
              className="flex-1 h-10 rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleApplyCustomDiscount}
              disabled={!customDiscountValue || parseFloat(customDiscountValue) <= 0}
              className="flex-1 h-10 rounded-xl gap-2 shadow-lg shadow-primary/25"
            >
              <Percent className="w-4 h-4" />
              تطبيق الخصم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
