'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useFormValidation } from '@/hooks/use-form-validation'
import { invoiceItemSchema } from '@/lib/validations'
import { Search, Plus, Pencil, Trash2, Truck, ShoppingCart, Package, Wallet, History, AlertCircle, TrendingDown, Star, ChevronDown, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'
import { EmptyState } from '@/components/empty-state'
import { StarRating } from '@/components/star-rating'
import type { Supplier, Product, PurchaseItem } from './purchases/types'

import { SupplierFormDialog } from './purchases/supplier-form-dialog'
import { SupplierPaymentDialog } from './purchases/supplier-payment-dialog'
import { PaymentHistoryDialog } from './purchases/payment-history-dialog'
import { RatingDialog } from './purchases/rating-dialog'

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
  const [suppliersLoading, setSuppliersLoading] = useState(true)
  const [supplierSort, setSupplierSort] = useState<string>('createdAt')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [supplierTotal, setSupplierTotal] = useState(0)

  // ==================== Supplier Payment State ====================
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false)
  const [paymentSupplier, setPaymentSupplier] = useState<Supplier | null>(null)

  // ── Payment history dialog state ──
  const [openHistoryDialog, setOpenHistoryDialog] = useState(false)
  const [historySupplier, setHistorySupplier] = useState<Supplier | null>(null)

  // ==================== Purchase Invoice State ====================
  const [products, setProducts] = useState<Product[]>([])
  const [purchaseItems, setPurchaseItems] = useState<PurchaseItem[]>([])
  const [selectedSupplierId, setSelectedSupplierId] = useState('')
  const [selectedProductId, setSelectedProductId] = useState('')
  const [itemQuantity, setItemQuantity] = useState<number>(1)
  const [itemCostPrice, setItemCostPrice] = useState<number>(0)
  const [submittingInvoice, setSubmittingInvoice] = useState(false)

  // ==================== Supplier Rating Dialog State ====================
  const [ratingDialogOpen, setRatingDialogOpen] = useState(false)
  const [ratingSupplier, setRatingSupplier] = useState<Supplier | null>(null)

  // ==================== Load Data ====================
  const doFetchSuppliers = useCallback(async (s: string, sortBy: string, p: number) => {
    setSuppliersLoading(true)
    try {
      const result = await get<{ suppliers: Supplier[]; total: number; page: number; totalPages: number }>('/api/suppliers', { search: s || undefined, sortBy: sortBy || undefined, page: p, limit: 50 })
      if (result) {
        setSuppliers(result.suppliers)
        setSupplierTotal(result.total)
        setPage(result.page)
        setTotalPages(result.totalPages)
      }
    } finally {
      setSuppliersLoading(false)
    }
  }, [get])

  const fetchSuppliers = useCallback((s = '', sortBy = 'createdAt') => {
    doFetchSuppliers(s, sortBy, page)
  }, [page, doFetchSuppliers])

  const fetchProducts = useCallback(async () => {
    const result = await get<{ products: Product[] }>('/api/products', { limit: 100 })
    if (result) {
      setProducts(result.products)
    }
  }, [get])

  useEffect(() => {
    doFetchSuppliers('', supplierSort, 1)
    fetchProducts()
  }, [supplierSort, doFetchSuppliers, fetchProducts])

  // Debounced search for suppliers
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1)
      doFetchSuppliers(supplierSearch, supplierSort, 1)
    }, 400)
    return () => clearTimeout(timer)
  }, [supplierSearch, doFetchSuppliers])

  // Page navigation
  const goToSupplierPage = useCallback((p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) {
      doFetchSuppliers(supplierSearch, supplierSort, p)
    }
  }, [supplierSearch, supplierSort, page, totalPages, doFetchSuppliers])

  // ==================== Supplier Rating Handler ====================
  const openRatingDialog = (supplier: Supplier) => {
    setRatingSupplier(supplier)
    setRatingDialogOpen(true)
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
    setOpenPaymentDialog(true)
  }

  const openPaymentHistory = (supplier: Supplier) => {
    setHistorySupplier(supplier)
    setOpenHistoryDialog(true)
  }

  // ==================== Purchase Invoice Handlers ====================
  const selectedProduct = products.find((p) => p.id === selectedProductId)

  useEffect(() => {
    if (selectedProduct) {
      setItemCostPrice(selectedProduct.costPrice)
    }
  }, [selectedProduct])

  const itemV = useFormValidation({ schema: invoiceItemSchema })
  const invoiceV = useFormValidation({ schema: invoiceItemSchema })

  const handleAddItem = () => {
    if (!itemV.validate({ productId: selectedProductId, quantity: itemQuantity, price: itemCostPrice })) return

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
    itemV.clearAllErrors()
    invoiceV.clearFieldError('items')
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
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    const invoiceErrors: Record<string, string> = {}
    if (!selectedSupplierId) {
      invoiceErrors.supplierId = 'يرجى اختيار المورد'
    }
    if (purchaseItems.length === 0) {
      invoiceErrors.items = 'يجب إضافة منتج واحد على الأقل'
    }
    if (Object.keys(invoiceErrors).length > 0) {
      invoiceV.setErrorMap(invoiceErrors)
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
        invoiceV.clearAllErrors()
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
                    <p className="text-base font-bold number-animate-in">{supplierTotal}</p>
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
                    {suppliersLoading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex items-center justify-center gap-3">
                            <Loader2 className="w-6 h-6 text-primary animate-spin" />
                            <span className="text-sm text-muted-foreground">جاري تحميل الموردين...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : suppliers.length === 0 ? (
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
                                  aria-label="تسجيل دفعة"
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
                                aria-label="سجل الدفعات"
                              >
                                <History className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-primary/10 hover:text-primary"
                                onClick={() => openEditSupplierDialog(supplier)}
                                title="تعديل"
                                aria-label="تعديل"
                              >
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 rounded-lg hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDeleteSupplier(supplier)}
                                title="حذف"
                                aria-label="حذف"
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
                إجمالي الموردين: {supplierTotal}
                {suppliersWithBalance > 0 && (
                  <span className="text-destructive mr-2">
                    • {suppliersWithBalance} مورد برصيد مستحق ({formatCurrency(totalOutstanding)})
                  </span>
                )}
              </div>
            )}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-3 flex items-center justify-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page <= 1}
                  onClick={() => goToSupplierPage(page - 1)}
                  aria-label="الصفحة السابقة"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => {
                    if (p === 1 || p === totalPages) return true
                    if (Math.abs(p - page) <= 1) return true
                    return false
                  })
                  .reduce<(number | 'ellipsis')[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - arr[idx - 1] > 1) {
                      acc.push('ellipsis')
                    }
                    acc.push(p)
                    return acc
                  }, [])
                  .map((item, idx) =>
                    item === 'ellipsis' ? (
                      <span key={`e-${idx}`} className="text-xs text-muted-foreground px-1">...</span>
                    ) : (
                      <Button
                        key={item}
                        variant={item === page ? 'default' : 'outline'}
                        size="icon"
                        className="h-8 w-8 text-xs"
                        onClick={() => goToSupplierPage(item)}
                      >
                        {item}
                      </Button>
                    ),
                  )}
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={page >= totalPages}
                  onClick={() => goToSupplierPage(page + 1)}
                  aria-label="الصفحة التالية"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
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
                    <Select value={selectedSupplierId} onValueChange={(val) => {
                      setSelectedSupplierId(val)
                      invoiceV.clearFieldError('supplierId')
                    }}>
                      <SelectTrigger className={`h-10 rounded-xl${invoiceV.errors.supplierId ? ' border-destructive' : ''}`}>
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
                    {invoiceV.errors.supplierId && (
                      <p className="text-sm text-destructive">{invoiceV.errors.supplierId}</p>
                    )}
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
                      <Select value={selectedProductId} onValueChange={(val) => {
                        setSelectedProductId(val)
                        itemV.clearFieldError('productId')
                      }}>
                        <SelectTrigger className={`h-10 rounded-xl${itemV.errors.productId ? ' border-destructive' : ''}`}>
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
                      {itemV.errors.productId && (
                        <p className="text-sm text-destructive">{itemV.errors.productId}</p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">الكمية</Label>
                        <Input
                          type="number"
                          min={1}
                          value={itemQuantity}
                          onChange={(e) => {
                            setItemQuantity(parseInt(e.target.value) || 0)
                            itemV.clearFieldError('quantity')
                          }}
                          className={`h-10 rounded-xl${itemV.errors.quantity ? ' border-destructive' : ''}`}
                          placeholder="0"
                        />
                        {itemV.errors.quantity && (
                          <p className="text-sm text-destructive">{itemV.errors.quantity}</p>
                        )}
                      </div>
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">سعر الشراء</Label>
                        <Input
                          type="number"
                          min={0}
                          step={0.01}
                          value={itemCostPrice || ''}
                          onChange={(e) => {
                            setItemCostPrice(parseFloat(e.target.value) || 0)
                            itemV.clearFieldError('price')
                          }}
                          className={`h-10 rounded-xl${itemV.errors.price ? ' border-destructive' : ''}`}
                          placeholder="0.00"
                        />
                        {itemV.errors.price && (
                          <p className="text-sm text-destructive">{itemV.errors.price}</p>
                        )}
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
                                aria-label="إزالة"
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
                    {invoiceV.errors.items && (
                      <p className="text-sm text-destructive">{invoiceV.errors.items}</p>
                    )}
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

      {/* ── Extracted Dialogs ── */}
      <SupplierFormDialog
        open={supplierDialogOpen}
        onOpenChange={setSupplierDialogOpen}
        editingSupplier={editingSupplier}
        supplierForm={supplierForm}
        setSupplierForm={setSupplierForm}
        onSave={handleSaveSupplier}
        loading={supplierLoading}
      />

      <SupplierPaymentDialog
        open={openPaymentDialog}
        onOpenChange={setOpenPaymentDialog}
        supplier={paymentSupplier}
        onSuccess={() => fetchSuppliers(supplierSearch, supplierSort)}
      />

      <PaymentHistoryDialog
        open={openHistoryDialog}
        onOpenChange={setOpenHistoryDialog}
        supplier={historySupplier}
      />

      <RatingDialog
        open={ratingDialogOpen}
        onOpenChange={setRatingDialogOpen}
        supplier={ratingSupplier}
        onSuccess={() => fetchSuppliers(supplierSearch, supplierSort)}
      />
    </div>
  )
}
