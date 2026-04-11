'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { Search, Plus, Pencil, Trash2, Truck, ShoppingCart, Package, Wallet, History, Banknote, AlertCircle, TrendingDown, Star, Globe, Phone, ChevronDown } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'
import { EmptyState } from '@/components/empty-state'
import { StarRating } from '@/components/star-rating'
import { formatShortDate } from '@/lib/date-utils'
import type { Supplier, Product, PurchaseItem, SupplierPayment } from './purchases/types'
import { PAYMENT_TERMS } from './purchases/types'

// Types imported from ./purchases/types


export function PurchasesScreen() {
  const { user } = useAppStore()
  const { formatCurrency } = useCurrency()
  const { get, post, put, del } = useApi()

  // ==================== Suppliers State ====================
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    phone2: '',
    address: '',
    website: '',
    paymentTerms: 'نقدي',
    notes: '',
  })
  const [supplierLoading, setSupplierLoading] = useState(false)
  const [supplierSort, setSupplierSort] = useState<string>('createdAt')

  // ==================== Supplier Payment State ====================
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false)
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null)
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentMethod, setPaymentMethod] = useState('cash')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [paymentSubmitting, setPaymentSubmitting] = useState(false)

  // ── Payment history dialog state ──
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false)
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null)
  const [paymentHistory, setPaymentHistory] = useState<SupplierPayment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // ==================== Purchase Invoice State ====================
  const [products, setProducts] = useState<Product[]>([])
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [itemQuantity, setItemQuantity] = useState<number>(1)
  const [itemCostPrice, setItemCostPrice] = useState<number>(0)
  const [submittingInvoice, setSubmittingInvoice] = useState(false)

  // ==================== Load Data ====================
  const fetchSuppliers = useCallback(async (search = '', sortBy = 'createdAt') => {
    const result = await get<Supplier[]>('/api/suppliers', { search: search || undefined, sortBy: sortBy || undefined })
    if (result) {
      setSuppliers(result)
    }
  }, [get])

  const fetchProducts = useCallback(async () => {
    const result = await get<Product[]>('/api/products')
    if (result) {
      setProducts(result)
    }
  }, [get])

  useEffect(() => {
    fetchSuppliers('', supplierSort)
    fetchProducts()
  }, [fetchSuppliers, fetchProducts, supplierSort])

  // Debounced search for suppliers
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers(supplierSearch, supplierSort)
    }, 400)
    return () => clearTimeout(timer)
  }, [supplierSearch, supplierSort, fetchSuppliers])

  // ==================== Supplier Rating Dialog State ====================
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false)
  const [ratingSupplier, setRatingSupplier] = useState<Supplier | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingReview, setRatingReview] = useState('')
  const [ratingSubmitting, setRatingSubmitting] = useState(false)
  const [ratingHover, setRatingHover] = useState(0)

  // ==================== Supplier Rating Handler ====================
  const openRatingDialog = (supplier: Supplier) => {
    setRatingSupplier(supplier)
    setRatingValue(0)
    setRatingReview('')
    setRatingHover(0)
    setRatingDialogOpen(true)
  }

  const handleSubmitRating = async () => {
    if (!ratingSupplier || ratingValue === 0) {
      toast.error('يرجى اختيار تقييم')
      return
    }

    setRatingSubmitting(true)
    try {
      const result = await post('/api/supplier-rating', {
        supplierId: ratingSupplier.id,
        rating: ratingValue,
        review: ratingReview.trim() || undefined,
        userName: user?.name || undefined,
      }, {
        showSuccessToast: true,
        successMessage: `تم تقييم المورد ${ratingValue} نجوم`,
      })
      if (result) {
        setRatingDialogOpen(false)
        setRatingSupplier(null)
        fetchSuppliers(supplierSearch, supplierSort)
      }
    } finally {
      setRatingSubmitting(false)
    }
  }

  // ==================== Suppliers Handlers ====================
  const openAddSupplierDialog = () => {
    setEditingSupplier(null)
    setSupplierForm({ name: '', phone: '', phone2: '', address: '', website: '', paymentTerms: 'نقدي', notes: '' })
    setSupplierDialogOpen(true)
  }

  const openEditSupplierDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      phone: supplier.phone || '',
      phone2: supplier.phone2 || '',
      address: supplier.address || '',
      website: supplier.website || '',
      paymentTerms: supplier.paymentTerms || 'نقدي',
      notes: supplier.notes || '',
    })
    setSupplierDialogOpen(true)
  }

  const handleSaveSupplier = async () => {
    if (!supplierForm.name.trim()) {
      toast.error('يرجى إدخال اسم المورد')
      return
    }

    setSupplierLoading(true)
    try {
      const isEditing = !!editingSupplier
      const result = isEditing
        ? await put(`/api/suppliers/${editingSupplier.id}`, supplierForm, {
            showSuccessToast: true,
            successMessage: 'تم تحديث المورد بنجاح',
          })
        : await post('/api/suppliers', supplierForm, {
            showSuccessToast: true,
            successMessage: 'تم إضافة المورد بنجاح',
          })
      if (result) {
        setSupplierDialogOpen(false)
        fetchSuppliers(supplierSearch, supplierSort)
      }
    } finally {
      setSupplierLoading(false)
    }
  }

  const handleDeleteSupplier = async (supplier: Supplier) => {
    await del(`/api/suppliers/${supplier.id}`)
    fetchSuppliers(supplierSearch, supplierSort)
  }

  // ==================== Supplier Payment Handlers ====================
  const openPaymentDialogForSupplier = (supplier: Supplier) => {
    setPaymentSupplier(supplier)
    setPaymentAmount('')
    setPaymentMethod('cash')
    setPaymentNotes('')
    setOpenPaymentDialog(true)
  }

  const handleRecordSupplierPayment = async () => {
    if (!paymentSupplier) return
    const amount = parseFloat(paymentAmount)
    if (!amount || amount <= 0) {
      toast.error('يرجى إدخال مبلغ صحيح')
      return
    }
    if (amount > paymentSupplier.remainingBalance) {
      toast.error('المبلغ أكبر من الرصيد المتبقي')
      return
    }

    setPaymentSubmitting(true)
    try {
      const methodLabel = paymentMethod === 'cash' ? 'نقدي' : paymentMethod === 'transfer' ? 'تحويل' : 'شيك'
      const result = await post('/api/supplier-payments', {
        supplierId: paymentSupplier.id,
        amount,
        method: paymentMethod,
        notes: paymentNotes.trim() || null,
      }, {
        showSuccessToast: true,
        successMessage: `تم تسجيل دفعة ${formatCurrency(amount)} (${methodLabel}) للمورد ${paymentSupplier.name}`,
      })
      if (result) {
        setOpenPaymentDialog(false)
        setPaymentSupplier(null)
        fetchSuppliers(supplierSearch, supplierSort)
      }
    } finally {
      setPaymentSubmitting(false)
    }
  }

  const openPaymentHistory = async (supplier: Supplier) => {
    setHistorySupplier(supplier)
    setPaymentHistory([])
    setOpenHistoryDialog(true)
    setHistoryLoading(true)
    try {
      const result = await get<SupplierPayment[]>('/api/supplier-payments', { supplierId: supplier.id }, { showErrorToast: false })
      if (result) {
        setPaymentHistory(result)
      }
    } finally {
      setHistoryLoading(false)
    }
  }

  // ==================== Purchase Invoice Handlers ====================
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  useEffect(() => {
    if (selectedProduct) {
      setItemCostPrice(selectedProduct.costPrice)
    }
  }, [selectedProduct])

  const handleAddItem = () => {
    if (!selectedProductId) {
      toast.error('يرجى اختيار منتج')
      return
    }
    if (itemQuantity <= 0) {
      toast.error('يرجى إدخال كمية صحيحة')
      return
    }
    if (itemCostPrice <= 0) {
      toast.error('يرجى إدخال سعر شراء صحيح')
      return
    }

    const existingIndex = purchaseItems.findIndex(
      (item) => item.productId === selectedProductId
    )
    if (existingIndex >= 0) {
      const updatedItems = [...purchaseItems]
      updatedItems[existingIndex] = {
        ...updatedItems[existingIndex],
        quantity: updatedItems[existingIndex].quantity + itemQuantity,
        costPrice: itemCostPrice,
      }
      setPurchaseItems(updatedItems)
    } else {
      setPurchaseItems([
        ...purchaseItems,
        {
          productId: selectedProductId,
          productName: selectedProduct?.name || '',
          quantity: itemQuantity,
          costPrice: itemCostPrice,
        },
      ])
    }

    setSelectedProductId('')
    setItemQuantity(1)
    setItemCostPrice(0)
  }

  const handleRemoveItem = (productId: string) => {
    setPurchaseItems(purchaseItems.filter((item) => item.productId !== productId))
  }

  const handleUpdateItemQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      handleRemoveItem(productId)
      return
    }
    setPurchaseItems(
      purchaseItems.map((item) =>
        item.productId === productId ? { ...item, quantity: newQuantity } : item
      )
    )
  }

  const handleUpdateItemPrice = (productId: string, newPrice: number) => {
    setPurchaseItems(
      purchaseItems.map((item) =>
        item.productId === productId ? { ...item, costPrice: Math.max(0, newPrice) } : item
      )
    )
  }

  const totalAmount = purchaseItems.reduce(
    (sum, item) => sum + item.quantity * item.costPrice,
    0
  )

  const handleSubmitInvoice = async () => {
    if (!selectedSupplierId) {
      toast.error('يرجى اختيار المورد')
      return
    }
    if (purchaseItems.length === 0) {
      toast.error('يرجى إضافة منتج واحد على الأقل')
      return
    }
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    setSubmittingInvoice(true)
    try {
      const result = await post('/api/invoices', {
        type: 'purchase',
        supplierId: selectedSupplierId,
        discount: 0,
        paidAmount: totalAmount,
        userId: user.id,
        items: purchaseItems.map((item) => ({
          productId: item.productId,
          quantity: item.quantity,
          price: item.costPrice,
        })),
      }, {
        showSuccessToast: true,
        successMessage: 'تم إنشاء فاتورة الشراء بنجاح',
      })
      if (result) {
        setSelectedSupplierId('')
        setPurchaseItems([])
        setSelectedProductId('')
        setItemQuantity(1)
        setItemCostPrice(0)
        fetchSuppliers(supplierSearch, supplierSort)
      }
    } finally {
      setSubmittingInvoice(false)
    }
  }

  // ==================== Stats ====================
  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.remainingBalance > 0 ? s.remainingBalance : 0), 0)
  const suppliersWithBalance = suppliers.filter((s) => s.remainingBalance > 0).length
  const averageRating = suppliers.length > 0 ? suppliers.reduce((sum, s) => sum + s.rating, 0) / suppliers.length : 0

  // ==================== Render ====================
  return (
    <div className="h-full flex flex-col animate-fade-in-up">
      <div className="flex-1 overflow-hidden p-4 md:p-6">
        <Tabs defaultValue="suppliers" className="h-full flex flex-col" dir="rtl">
          <TabsList className="bg-muted/80 self-start mb-4">
            <TabsTrigger value="suppliers" className="gap-2">
              <Truck className="w-4 h-4" />
              الموردين
            </TabsTrigger>
            <TabsTrigger value="purchase" className="gap-2">
              <ShoppingCart className="w-4 h-4" />
              فاتورة شراء جديدة
            </TabsTrigger>
          </TabsList>

          {/* ==================== Suppliers Tab ==================== */}
          <TabsContent value="suppliers" className="flex-1 overflow-hidden flex flex-col mt-0">

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4 stagger-children">
              <div className="rounded-xl border bg-card p-3 shadow-sm card-hover">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                    <Truck className="w-4 h-4 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">إجمالي الموردين</p>
                    <p className="text-base font-bold number-animate-in">{suppliers.length}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm stat-card-gradient stat-card-red card-hover">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10">
                    <TrendingDown className="w-4 h-4 text-red-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">إجمالي المستحقات</p>
                    <p className="text-base font-bold text-destructive tabular-nums number-animate-in">
                      {formatCurrency(totalOutstanding)}
                    </p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm card-hover hidden md:block">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10">
                    <AlertCircle className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">موردين برصيد مستحق</p>
                    <p className="text-base font-bold number-animate-in">{suppliersWithBalance}</p>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border bg-card p-3 shadow-sm card-hover hidden md:block">
                <div className="flex items-center gap-2.5">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-400/10">
                    <Star className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-[11px] text-muted-foreground">متوسط التقييم</p>
                    <div className="flex items-center gap-1.5">
                      <StarRating rating={Math.round(averageRating * 10) / 10} size="sm" />
                      <span className="text-sm font-bold tabular-nums">{(Math.round(averageRating * 10) / 10).toFixed(1)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <div className="relative flex-1 sm:flex-none sm:w-72">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="بحث عن مورد..."
                    value={supplierSearch}
                    onChange={(e) => setSupplierSearch(e.target.value)}
                    className="pr-10 h-10 rounded-xl input-glass"
                  />
                </div>
                <Select value={supplierSort} onValueChange={setSupplierSort}>
                  <SelectTrigger className="h-10 w-auto min-w-[150px] rounded-xl text-xs">
                    <SelectValue placeholder="ترتيب حسب" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt">الأحدث أولاً</SelectItem>
                    <SelectItem value="rating">حسب التقييم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={openAddSupplierDialog}
                className="gap-2 rounded-xl shadow-sm btn-ripple"
              >
                <Plus className="w-4 h-4" />
                إضافة مورد
              </Button>
            </div>

            {/* Table */}
            <div className="flex-1 rounded-xl border bg-card overflow-hidden">
              <ScrollArea className="h-[calc(100vh-380px)]">
                <Table className="table-enhanced">
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-right font-semibold">الاسم والتقييم</TableHead>
                      <TableHead className="text-right font-semibold">الهاتف</TableHead>
                      <TableHead className="text-right font-semibold hidden md:table-cell">شروط الدفع</TableHead>
                      <TableHead className="text-right font-semibold text-center">إجمالي المشتريات</TableHead>
                      <TableHead className="text-right font-semibold text-center">المتبقي</TableHead>
                      <TableHead className="text-right font-semibold w-[160px]">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="stagger-children">
                    {suppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <EmptyState
                            icon={Truck}
                            title={supplierSearch ? 'لا توجد نتائج للبحث' : 'لا يوجد موردين بعد'}
                            description={supplierSearch ? 'جرب كلمات بحث أخرى' : 'ابدأ بإضافة مورد جديد'}
                            action={
                              !supplierSearch ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={openAddSupplierDialog}
                                  className="gap-2 rounded-xl"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  إضافة مورد جديد
                                </Button>
                              ) : undefined
                            }
                            compact
                          />
                        </TableCell>
                      </TableRow>
                    ) : (
                      suppliers.map((supplier) => (
                        <TableRow key={supplier.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <div className="flex items-center gap-2.5">
                              <div>
                                <p className="font-medium text-sm">{supplier.name}</p>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <button
                                    type="button"
                                    onClick={() => openRatingDialog(supplier)}
                                    className="flex items-center gap-0.5 cursor-pointer hover:scale-105 transition-transform"
                                    title="انقر للتقييم"
                                  >
                                    <StarRating
                                      rating={supplier.rating}
                                      size="sm"
                                    />
                                    <ChevronDown className="w-3 h-3 text-muted-foreground/50" />
                                  </button>
                                  {supplier.ratingCount > 0 && (
                                    <span className="text-[10px] text-muted-foreground">
                                      ({supplier.ratingCount})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground" dir="ltr">
                            <div className="flex flex-col gap-0.5">
                              <span className="text-xs">{supplier.phone || '—'}</span>
                              {supplier.phone2 && (
                                <span className="text-[10px] text-muted-foreground/60">{supplier.phone2}</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">
                            <span className="text-xs px-2 py-0.5 rounded-md bg-muted/60 font-medium">
                              {supplier.paymentTerms}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm tabular-nums">
                              {formatCurrency(supplier.totalPurchases)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            {supplier.remainingBalance > 0 ? (
                              <span className="badge-danger font-bold text-xs px-2.5 py-0.5 rounded-full tabular-nums">
                                {formatCurrency(supplier.remainingBalance)}
                              </span>
                            ) : (
                              <span className="badge-active text-xs px-2.5 py-0.5 rounded-full">
                                {formatCurrency(0)}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              {supplier.remainingBalance > 0 && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600"
                                  onClick={() => openPaymentDialogForSupplier(supplier)}
                                  title="تسجيل دفعة"
                                >
                                  <Wallet className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 hover:bg-primary/10 hover:text-primary"
                                onClick={() => openPaymentHistory(supplier)}
                                title="سجل الدفعات"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                                onClick={() => openEditSupplierDialog(supplier)}
                                title="تعديل"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteSupplier(supplier)}
                                title="حذف"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </ScrollArea>
            </div>

            {/* Count badge */}
            {suppliers.length > 0 && (
              <div className="mt-3 text-xs text-muted-foreground text-center">
                إجمالي الموردين: {suppliers.length}
                {suppliersWithBalance > 0 && (
                  <span className="text-destructive mr-2">
                    • {suppliersWithBalance} مورد برصيد مستحق ({formatCurrency(totalOutstanding)})
                  </span>
                )}
              </div>
            )}
          </TabsContent>

          {/* ==================== Purchase Invoice Tab ==================== */}
          <TabsContent value="purchase" className="flex-1 overflow-hidden flex flex-col mt-0">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1 overflow-hidden">
              {/* Left Column - Form */}
              <div className="flex flex-col gap-4 overflow-auto">
                {/* Supplier Selection */}
                <div className="bg-card rounded-xl border p-4 space-y-3 card-hover">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">بيانات المورد</h3>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">اختر المورد</Label>
                    <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                      <SelectTrigger className="h-10 rounded-xl">
                        <SelectValue placeholder="اختر المورد..." />
                      </SelectTrigger>
                      <SelectContent>
                        {suppliers.map((supplier) => (
                          <SelectItem key={supplier.id} value={supplier.id}>
                            <span className="flex items-center gap-2">
                              <span>{supplier.name}</span>
                              {supplier.rating > 0 && (
                                <span className="text-amber-400 text-xs">★ {supplier.rating.toFixed(1)}</span>
                              )}
                              {supplier.remainingBalance > 0 && (
                                <span className="text-xs text-destructive">
                                  ({formatCurrency(supplier.remainingBalance)})
                                </span>
                              )}
                            </span>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {selectedSupplierId && (
                      <div className="flex items-center justify-between rounded-lg bg-muted/40 p-2.5">
                        <span className="text-xs text-muted-foreground">الرصيد المتبقي</span>
                        <span className={`text-sm font-bold tabular-nums ${
                          (suppliers.find(s => s.id === selectedSupplierId)?.remainingBalance ?? 0) > 0
                            ? 'text-destructive' : 'text-emerald-600'
                        }`}>
                          {formatCurrency(suppliers.find(s => s.id === selectedSupplierId)?.remainingBalance ?? 0)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Add Item Form */}
                <div className="bg-card rounded-xl border p-4 space-y-3 card-hover">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="w-4 h-4 text-primary" />
                    <h3 className="font-semibold text-sm">إضافة منتج</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">المنتج</Label>
                      <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue placeholder="اختر المنتج..." />
                        </SelectTrigger>
                        <SelectContent>
                          {products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              <span className="flex items-center gap-2">
                                <span>{product.name}</span>
                                <span className="text-muted-foreground text-xs">
                                  (المخزون: {product.quantity})
                                </span>
                              </span>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">الكمية</Label>
                        <Input
                          type="number"
                          min={1}
                          value={itemQuantity}
                          onChange={(e) => setItemQuantity(parseInt(e.target.value) || 0)}
                          className="h-10 rounded-xl"
                          placeholder="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">سعر الشراء</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={itemCostPrice || ''}
                          onChange={(e) => setItemCostPrice(parseFloat(e.target.value) || 0)}
                          className="h-10 rounded-xl"
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <Button
                      onClick={handleAddItem}
                      className="w-full gap-2 rounded-xl"
                      variant="outline"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة للقائمة
                    </Button>
                  </div>
                </div>
              </div>

              {/* Right Column - Items & Total */}
              <div className="flex flex-col overflow-hidden">
                <div className="bg-card rounded-xl border flex-1 flex flex-col overflow-hidden glass-card">
                  <div className="flex items-center justify-between p-4 pb-3">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-primary" />
                      <h3 className="font-semibold text-sm">المنتجات المضافة</h3>
                      {purchaseItems.length > 0 && (
                        <span className="bg-primary/10 text-primary text-xs font-medium px-2 py-0.5 rounded-full">
                          {purchaseItems.length}
                        </span>
                      )}
                    </div>
                  </div>

                  {purchaseItems.length === 0 ? (
                    <div className="flex-1 flex items-center justify-center p-6">
                      <div className="text-center text-muted-foreground">
                        <Package className="w-10 h-10 mx-auto opacity-30 mb-2" />
                        <p className="text-sm">لم تتم إضافة منتجات بعد</p>
                        <p className="text-xs mt-1">اختر منتجاً من القائمة على اليسار</p>
                      </div>
                    </div>
                  ) : (
                    <ScrollArea className="flex-1 px-4 pb-2">
                      <div className="space-y-2">
                        {purchaseItems.map((item) => (
                          <div
                            key={item.productId}
                            className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border/50 group"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium truncate">{item.productName}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                المجموع: {formatCurrency(item.quantity * item.costPrice)}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-20">
                                <Label className="text-[10px] text-muted-foreground">الكمية</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={item.quantity}
                                  onChange={(e) =>
                                    handleUpdateItemQuantity(
                                      item.productId,
                                      parseInt(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 text-xs rounded-lg text-center"
                                />
                              </div>
                              <div className="w-24">
                                <Label className="text-[10px] text-muted-foreground">السعر</Label>
                                <Input
                                  type="number"
                                  min={0}
                                  step={0.01}
                                  value={item.costPrice || ''}
                                  onChange={(e) =>
                                    handleUpdateItemPrice(
                                      item.productId,
                                      parseFloat(e.target.value) || 0
                                    )
                                  }
                                  className="h-8 text-xs rounded-lg text-center"
                                />
                              </div>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive flex-shrink-0 mt-4"
                                onClick={() => handleRemoveItem(item.productId)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Total & Submit */}
                  <div className="border-t border-border/50 p-4 space-y-3 bg-muted/20 rounded-b-xl">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">المجموع الكلي</span>
                      <span className="text-xl font-bold text-primary tabular-nums">
                        {formatCurrency(totalAmount)}
                      </span>
                    </div>
                    <Button
                      onClick={handleSubmitInvoice}
                      disabled={submittingInvoice || purchaseItems.length === 0 || !selectedSupplierId}
                      className="w-full h-11 rounded-xl font-semibold shadow-md shadow-primary/20 gap-2 btn-ripple"
                    >
                      {submittingInvoice ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          <span>جاري إنشاء الفاتورة...</span>
                        </>
                      ) : (
                        <>
                          <ShoppingCart className="w-4 h-4" />
                          إنشاء فاتورة الشراء
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* ==================== Add/Edit Supplier Dialog ==================== */}
      <Dialog open={supplierDialogOpen} onOpenChange={setSupplierDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingSupplier ? (
                <>
                  <Pencil className="w-4 h-4 text-primary" />
                  تعديل المورد
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 text-primary" />
                  إضافة مورد جديد
                </>
              )}
            </DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh]">
            <div className="space-y-4 py-2 px-1">
              {/* Rating Display */}
              {editingSupplier && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/30">
                  <Star className="w-5 h-5 text-amber-500" />
                  <div>
                    <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">التقييم الحالي</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <StarRating rating={editingSupplier.rating} size="sm" />
                      <span className="text-xs text-muted-foreground">
                        ({editingSupplier.ratingCount} تقييم)
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="glass-card rounded-xl p-4 space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="supplier-name">اسم المورد *</Label>
                  <Input
                    id="supplier-name"
                    placeholder="أدخل اسم المورد"
                    value={supplierForm.name}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, name: e.target.value })
                    }
                    className="h-10 rounded-xl"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="supplier-phone" className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      رقم الهاتف
                    </Label>
                    <Input
                      id="supplier-phone"
                      placeholder="رقم الهاتف"
                      value={supplierForm.phone}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, phone: e.target.value })
                      }
                      className="h-10 rounded-xl"
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="supplier-phone2" className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      هاتف احتياطي
                    </Label>
                    <Input
                      id="supplier-phone2"
                      placeholder="رقم احتياطي"
                      value={supplierForm.phone2}
                      onChange={(e) =>
                        setSupplierForm({ ...supplierForm, phone2: e.target.value })
                      }
                      className="h-10 rounded-xl"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-address">العنوان</Label>
                  <Input
                    id="supplier-address"
                    placeholder="أدخل العنوان"
                    value={supplierForm.address}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, address: e.target.value })
                    }
                    className="h-10 rounded-xl"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-website" className="flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-muted-foreground" />
                    الموقع الإلكتروني
                  </Label>
                  <Input
                    id="supplier-website"
                    placeholder="https://example.com"
                    value={supplierForm.website}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, website: e.target.value })
                    }
                    className="h-10 rounded-xl"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-payment-terms">شروط الدفع</Label>
                  <Select
                    value={supplierForm.paymentTerms}
                    onValueChange={(val) => setSupplierForm({ ...supplierForm, paymentTerms: val })}
                  >
                    <SelectTrigger className="h-10 rounded-xl">
                      <SelectValue placeholder="شروط الدفع" />
                    </SelectTrigger>
                    <SelectContent>
                      {PAYMENT_TERMS.map((term) => (
                        <SelectItem key={term.value} value={term.value}>
                          {term.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier-notes">ملاحظات</Label>
                  <Textarea
                    id="supplier-notes"
                    placeholder="ملاحظات إضافية عن المورد..."
                    value={supplierForm.notes}
                    onChange={(e) =>
                      setSupplierForm({ ...supplierForm, notes: e.target.value })
                    }
                    className="rounded-xl resize-none min-h-[80px]"
                    rows={3}
                  />
                </div>
              </div>
            </div>
          </ScrollArea>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setSupplierDialogOpen(false)}
              className="rounded-xl"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSaveSupplier}
              disabled={supplierLoading}
              className="rounded-xl gap-2"
            >
              {supplierLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري الحفظ...</span>
                </>
              ) : editingSupplier ? (
                <>
                  <Pencil className="w-4 h-4" />
                  حفظ التعديلات
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4" />
                  إضافة المورد
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Record Payment Dialog ==================== */}
      <Dialog open={openPaymentDialog} onOpenChange={setOpenPaymentDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10">
                <Wallet className="h-5 w-5 text-emerald-600" />
              </div>
              تسجيل دفعة مورد
            </DialogTitle>
          </DialogHeader>
          {paymentSupplier && (
            <div className="space-y-4 py-2">
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold">{paymentSupplier.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">المبلغ المستحق</p>
                  </div>
                  <span className="text-lg font-bold text-destructive tabular-nums">
                    {formatCurrency(paymentSupplier.remainingBalance)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>المبلغ *</Label>
                <Input
                  type="number"
                  min={0}
                  step={0.01}
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="h-10 rounded-xl"
                  placeholder="0.00"
                  dir="ltr"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-lg"
                    onClick={() => setPaymentAmount(String(Math.ceil(paymentSupplier.remainingBalance / 4)))}
                  >
                    الربع
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-lg"
                    onClick={() => setPaymentAmount(String(Math.ceil(paymentSupplier.remainingBalance / 2)))}
                  >
                    النصف
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs rounded-lg"
                    onClick={() => setPaymentAmount(String(paymentSupplier.remainingBalance))}
                  >
                    الكل
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>طريقة الدفع</Label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { value: 'cash', label: 'نقدي', icon: Banknote },
                    { value: 'transfer', label: 'تحويل', icon: Wallet },
                    { value: 'check', label: 'شيك', icon: Wallet },
                  ].map((m) => (
                    <Button
                      key={m.value}
                      type="button"
                      variant={paymentMethod === m.value ? 'default' : 'outline'}
                      size="sm"
                      className="rounded-lg text-xs"
                      onClick={() => setPaymentMethod(m.value)}
                    >
                      {m.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>ملاحظات</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="rounded-xl resize-none"
                  rows={2}
                  placeholder="ملاحظات إضافية (اختياري)"
                />
              </div>

              <Button
                onClick={handleRecordSupplierPayment}
                disabled={paymentSubmitting || !paymentAmount}
                className="w-full gap-2 rounded-xl btn-ripple"
              >
                {paymentSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>جاري التسجيل...</span>
                  </>
                ) : (
                  <>
                    <Wallet className="w-4 h-4" />
                    تسجيل الدفعة
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== Payment History Dialog ==================== */}
      <Dialog open={openHistoryDialog} onOpenChange={setOpenHistoryDialog}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10">
                <History className="h-5 w-5 text-blue-600" />
              </div>
              سجل الدفعات
            </DialogTitle>
          </DialogHeader>
          {historySupplier && (
            <div className="space-y-3 py-2">
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-sm font-semibold">{historySupplier.name}</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  إجمالي المدفوع: <span className="text-emerald-600 font-bold">{formatCurrency(historySupplier.totalPaid)}</span>
                </p>
              </div>

              <ScrollArea className="max-h-[300px]">
                {historyLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                  </div>
                ) : paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="w-8 h-8 mx-auto opacity-30 mb-2" />
                    <p className="text-sm">لا توجد دفعات سابقة</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {paymentHistory.map((payment) => (
                      <div key={payment.id} className="rounded-lg border p-3 bg-card/50">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-bold text-emerald-600 tabular-nums">
                              {formatCurrency(payment.amount)}
                            </p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {payment.method === 'cash' ? 'نقدي' : payment.method === 'transfer' ? 'تحويل' : 'شيك'}
                            </p>
                          </div>
                          <p className="text-[10px] text-muted-foreground">
                            {formatShortDate(payment.createdAt)}
                          </p>
                        </div>
                        {payment.notes && (
                          <p className="text-xs text-muted-foreground mt-1.5 border-t border-border/30 pt-1.5">
                            {payment.notes}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ==================== Supplier Rating Dialog ==================== */}
      <Dialog open={ratingDialogOpen} onOpenChange={setRatingDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
                <Star className="h-5 w-5 text-amber-500" />
              </div>
              تقييم المورد
            </DialogTitle>
          </DialogHeader>
          {ratingSupplier && (
            <div className="space-y-4 py-2">
              {/* Supplier Info */}
              <div className="glass-card rounded-xl p-3">
                <p className="text-sm font-bold">{ratingSupplier.name}</p>
                {ratingSupplier.ratingCount > 0 && (
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    المتوسط الحالي: {ratingSupplier.rating.toFixed(1)} ({ratingSupplier.ratingCount} تقييم)
                  </p>
                )}
              </div>

              {/* Star Selection */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">اختر التقييم</Label>
                <div className="flex items-center gap-1 justify-center py-2">
                  {[1, 2, 3, 4, 5].map((star) => {
                    const filled = star <= (ratingHover || ratingValue)
                    return (
                      <button
                        key={star}
                        type="button"
                        className="cursor-pointer hover:scale-125 transition-transform p-1"
                        onMouseEnter={() => setRatingHover(star)}
                        onMouseLeave={() => setRatingHover(0)}
                        onClick={() => setRatingValue(star)}
                      >
                        <Star
                          className={`w-8 h-8 ${
                            filled
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-transparent text-muted-foreground/30'
                          }`}
                        />
                      </button>
                    )
                  })}
                </div>
                {ratingValue > 0 && (
                  <p className="text-xs text-center text-muted-foreground">
                    {ratingValue === 1 && 'سيئ'}
                    {ratingValue === 2 && 'مقبول'}
                    {ratingValue === 3 && 'جيد'}
                    {ratingValue === 4 && 'جيد جداً'}
                    {ratingValue === 5 && 'ممتاز'}
                  </p>
                )}
              </div>

              {/* Review Text */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  ملاحظات <span className="text-muted-foreground text-xs">(اختياري)</span>
                </Label>
                <Textarea
                  placeholder="أضف تعليقاً على تقييمك..."
                  value={ratingReview}
                  onChange={(e) => setRatingReview(e.target.value)}
                  className="rounded-xl min-h-[80px] resize-none"
                  maxLength={200}
                />
                <p className="text-[10px] text-muted-foreground text-left" dir="ltr">
                  {ratingReview.length}/200
                </p>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setRatingDialogOpen(false)}
              disabled={ratingSubmitting}
              className="rounded-lg"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmitRating}
              disabled={ratingSubmitting || ratingValue === 0}
              className="gap-2 rounded-lg bg-amber-500 hover:bg-amber-600 text-white"
            >
              {ratingSubmitting && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
              <Star className="w-4 h-4" />
              إرسال التقييم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
