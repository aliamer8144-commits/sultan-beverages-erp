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
import { Search, Plus, Pencil, Trash2, Truck, ShoppingCart, Package, Wallet, History, Banknote, AlertCircle, TrendingDown } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useCurrency } from '@/hooks/use-currency'

// Types
interface Supplier {
  id: string
  name: string
  phone: string | null
  address: string | null
  isActive: boolean
  totalPurchases: number
  totalPaid: number
  remainingBalance: number
}

interface Product {
  id: string
  name: string
  costPrice: number
  quantity: number
  category: { id: string; name: string }
}

interface PurchaseItem {
  productId: string
  productName: string
  quantity: number
  costPrice: number
}

interface SupplierPayment {
  id: string
  supplierId: string
  amount: number
  method: string
  notes: string | null
  createdAt: string
}

export function PurchasesScreen() {
  const { user } = useAppStore()
  const { formatCurrency, symbol } = useCurrency()

  // ==================== Suppliers State ====================
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [supplierSearch, setSupplierSearch] = useState('')
  const [supplierDialogOpen, setSupplierDialogOpen] = useState(false)
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null)
  const [supplierForm, setSupplierForm] = useState({
    name: '',
    phone: '',
    address: '',
  })
  const [supplierLoading, setSupplierLoading] = useState(false)

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
  const [invoiceLoading, setInvoiceLoading] = useState(false)

  // ==================== Load Data ====================
  const fetchSuppliers = useCallback(async (search = '') => {
    try {
      const params = search ? `?search=${encodeURIComponent(search)}` : ''
      const res = await fetch(`/api/suppliers${params}`)
      const data = await res.json()
      if (data.success) {
        setSuppliers(data.data)
      }
    } catch {
      toast.error('فشل في تحميل الموردين')
    }
  }, [])

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/products')
      const data = await res.json()
      if (data.success) {
        setProducts(data.data)
      }
    } catch {
      toast.error('فشل في تحميل المنتجات')
    }
  }, [])

  useEffect(() => {
    fetchSuppliers()
    fetchProducts()
  }, [fetchSuppliers, fetchProducts])

  // Debounced search for suppliers
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchSuppliers(supplierSearch)
    }, 400)
    return () => clearTimeout(timer)
  }, [supplierSearch, fetchSuppliers])

  // ==================== Suppliers Handlers ====================
  const openAddSupplierDialog = () => {
    setEditingSupplier(null)
    setSupplierForm({ name: '', phone: '', address: '' })
    setSupplierDialogOpen(true)
  }

  const openEditSupplierDialog = (supplier: Supplier) => {
    setEditingSupplier(supplier)
    setSupplierForm({
      name: supplier.name,
      phone: supplier.phone || '',
      address: supplier.address || '',
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
      const res = await fetch('/api/suppliers', {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          isEditing
            ? { id: editingSupplier.id, ...supplierForm }
            : supplierForm
        ),
      })
      const data = await res.json()

      if (data.success) {
        toast.success(isEditing ? 'تم تحديث المورد بنجاح' : 'تم إضافة المورد بنجاح')
        setSupplierDialogOpen(false)
        fetchSuppliers(supplierSearch)
      } else {
        toast.error(data.error || 'حدث خطأ أثناء الحفظ')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
    } finally {
      setSupplierLoading(false)
    }
  }

  const handleDeleteSupplier = async (supplier: Supplier) => {
    try {
      const res = await fetch('/api/suppliers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: supplier.id }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('تم حذف المورد بنجاح')
        fetchSuppliers(supplierSearch)
      } else {
        toast.error(data.error || 'فشل في حذف المورد')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
    }
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
      const res = await fetch('/api/supplier-payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: paymentSupplier.id,
          amount,
          method: paymentMethod,
          notes: paymentNotes.trim() || null,
        }),
      })
      const data = await res.json()
      if (data.success) {
        const methodLabel = paymentMethod === 'cash' ? 'نقدي' : paymentMethod === 'transfer' ? 'تحويل' : 'شيك'
        toast.success(`تم تسجيل دفعة ${formatCurrency(amount)} (${methodLabel}) للمورد ${paymentSupplier.name}`)
        setOpenPaymentDialog(false)
        setPaymentSupplier(null)
        fetchSuppliers(supplierSearch)
      } else {
        toast.error(data.error || 'حدث خطأ أثناء تسجيل الدفعة')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
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
      const res = await fetch(`/api/supplier-payments?supplierId=${supplier.id}`)
      const data = await res.json()
      if (data.success) {
        setPaymentHistory(data.data)
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل سجل الدفعات')
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

    // Check if product already exists in the list
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

    // Reset form
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
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
        }),
      })
      const data = await res.json()

      if (data.success) {
        toast.success('تم إنشاء فاتورة الشراء بنجاح')
        // Reset form
        setSelectedSupplierId('')
        setPurchaseItems([])
        setSelectedProductId('')
        setItemQuantity(1)
        setItemCostPrice(0)
        fetchSuppliers(supplierSearch)
      } else {
        toast.error(data.error || 'فشل في إنشاء فاتورة الشراء')
      }
    } catch {
      toast.error('حدث خطأ في الاتصال بالخادم')
    } finally {
      setSubmittingInvoice(false)
    }
  }

  // ==================== Stats ====================
  const totalOutstanding = suppliers.reduce((sum, s) => sum + (s.remainingBalance > 0 ? s.remainingBalance : 0), 0)
  const suppliersWithBalance = suppliers.filter((s) => s.remainingBalance > 0).length

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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4 stagger-children">
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
            </div>

            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="relative w-full sm:w-72">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="بحث عن مورد..."
                  value={supplierSearch}
                  onChange={(e) => setSupplierSearch(e.target.value)}
                  className="pr-10 h-10 rounded-xl input-glass"
                />
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
              <ScrollArea className="h-[calc(100vh-340px)]">
                <Table className="table-enhanced">
                  <TableHeader className="bg-muted/50 sticky top-0 z-10">
                    <TableRow>
                      <TableHead className="text-right font-semibold">الاسم</TableHead>
                      <TableHead className="text-right font-semibold">الهاتف</TableHead>
                      <TableHead className="text-right font-semibold hidden md:table-cell">العنوان</TableHead>
                      <TableHead className="text-right font-semibold text-center">إجمالي المشتريات</TableHead>
                      <TableHead className="text-right font-semibold text-center">المدفوع</TableHead>
                      <TableHead className="text-right font-semibold text-center">المتبقي</TableHead>
                      <TableHead className="text-right font-semibold w-[160px]">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody className="stagger-children">
                    {suppliers.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground empty-state">
                            <Truck className="w-12 h-12 opacity-20 empty-state-icon" />
                            <p className="text-sm empty-state-title">
                              {supplierSearch ? 'لا توجد نتائج للبحث' : 'لا يوجد موردين بعد'}
                            </p>
                            <p className="text-xs empty-state-description">
                              {supplierSearch ? 'جرب كلمات بحث أخرى' : 'ابدأ بإضافة مورد جديد'}
                            </p>
                            {!supplierSearch && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={openAddSupplierDialog}
                                className="mt-2 gap-2 rounded-xl"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                إضافة مورد جديد
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      suppliers.map((supplier) => (
                        <TableRow key={supplier.id} className="group hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">{supplier.name}</TableCell>
                          <TableCell className="text-muted-foreground" dir="ltr">
                            {supplier.phone || '—'}
                          </TableCell>
                          <TableCell className="text-muted-foreground hidden md:table-cell">
                            {supplier.address || '—'}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm tabular-nums">
                              {formatCurrency(supplier.totalPurchases)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm tabular-nums text-emerald-600">
                              {formatCurrency(supplier.totalPaid)}
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
                          {(suppliers.find(s => s.id === selectedSupplierId)?.remainingBalance ?? 0).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
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
                {/* Items List */}
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
                                المجموع: {(item.quantity * item.costPrice).toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
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
                        {totalAmount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
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
        <DialogContent className="sm:max-w-md" dir="rtl">
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

          <div className="space-y-4 py-2 glass-card rounded-xl p-4">
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
            <div className="space-y-2">
              <Label htmlFor="supplier-phone">رقم الهاتف</Label>
              <Input
                id="supplier-phone"
                placeholder="أدخل رقم الهاتف"
                value={supplierForm.phone}
                onChange={(e) =>
                  setSupplierForm({ ...supplierForm, phone: e.target.value })
                }
                className="h-10 rounded-xl"
                dir="ltr"
              />
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
          </div>

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
              {/* Supplier info */}
              <div className="rounded-xl bg-muted/40 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold">{paymentSupplier.name}</p>
                    {paymentSupplier.phone && (
                      <p className="text-xs text-muted-foreground" dir="ltr">{paymentSupplier.phone}</p>
                    )}
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground">الرصيد المتبقي</p>
                    <p className="text-base font-bold text-destructive tabular-nums">
                      {paymentSupplier.remainingBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                    </p>
                  </div>
                </div>
                <div className="mt-2 pt-2 border-t border-border/50 flex items-center justify-between text-xs text-muted-foreground">
                  <span>إجمالي المشتريات: <span className="tabular-nums font-medium">{paymentSupplier.totalPurchases.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span></span>
                  <span>المدفوع: <span className="tabular-nums font-medium text-emerald-600">{paymentSupplier.totalPaid.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س</span></span>
                </div>
              </div>

              {/* Amount */}
              <div className="space-y-1.5">
                <Label>مبلغ الدفعة <span className="text-destructive">*</span></Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={0}
                    step={0.01}
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className="h-11 text-base font-bold pr-4 pl-14 tabular-nums input-glass"
                    dir="ltr"
                    autoFocus
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground font-medium">ر.س</span>
                </div>
                {paymentAmount && parseFloat(paymentAmount) > paymentSupplier.remainingBalance && (
                  <p className="text-[11px] text-destructive">المبلغ يتجاوز الرصيد المتبقي</p>
                )}
              </div>

              {/* Quick amount buttons */}
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setPaymentAmount(String(paymentSupplier.remainingBalance / 4))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 bg-muted/60 text-muted-foreground hover:bg-muted"
                >
                  ربع ({(paymentSupplier.remainingBalance / 4).toFixed(2)})
                </button>
                <button
                  onClick={() => setPaymentAmount(String(paymentSupplier.remainingBalance / 2))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 bg-muted/60 text-muted-foreground hover:bg-muted"
                >
                  النصف ({(paymentSupplier.remainingBalance / 2).toFixed(2)})
                </button>
                <button
                  onClick={() => setPaymentAmount(String(paymentSupplier.remainingBalance))}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20"
                >
                  الكل ({paymentSupplier.remainingBalance.toFixed(2)})
                </button>
              </div>

              {/* Payment method */}
              <div className="space-y-1.5">
                <Label>طريقة الدفع</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash" className="gap-2">
                      <span className="flex items-center gap-2">
                        <Banknote className="w-4 h-4" />
                        نقدي
                      </span>
                    </SelectItem>
                    <SelectItem value="transfer" className="gap-2">
                      <span className="flex items-center gap-2">
                        <Wallet className="w-4 h-4" />
                        تحويل
                      </span>
                    </SelectItem>
                    <SelectItem value="check" className="gap-2">
                      <span className="flex items-center gap-2">
                        <Truck className="w-4 h-4" />
                        شيك
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label>ملاحظات (اختياري)</Label>
                <Textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="أضف ملاحظات حول الدفعة..."
                  className="h-16 rounded-xl bg-muted/30 border-0 text-sm resize-none"
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setOpenPaymentDialog(false)}
              className="flex-1 h-10 rounded-xl"
              disabled={paymentSubmitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleRecordSupplierPayment}
              disabled={paymentSubmitting || !paymentAmount || parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > (paymentSupplier?.remainingBalance || 0)}
              className="flex-1 h-10 rounded-xl gap-2 shadow-lg shadow-emerald-500/25 btn-ripple"
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
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ==================== Payment History Dialog ==================== */}
      <Dialog open={openHistoryDialog} onOpenChange={setOpenHistoryDialog}>
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col glass-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                <History className="h-5 w-5 text-primary" />
              </div>
              سجل الدفعات — {historySupplier?.name}
            </DialogTitle>
          </DialogHeader>
          {historySupplier && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <div className="mb-3 rounded-xl bg-muted/40 p-3">
                <div className="flex items-center justify-between">
                  <div className="flex gap-4 text-xs text-muted-foreground">
                    <span>إجمالي المشتريات: <span className="tabular-nums font-medium">{historySupplier.totalPurchases.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span></span>
                    <span>المدفوع: <span className="tabular-nums font-medium text-emerald-600">{historySupplier.totalPaid.toLocaleString('ar-SA', { minimumFractionDigits: 2 })}</span></span>
                  </div>
                  <div className="text-left">
                    <p className="text-[10px] text-muted-foreground">المتبقي</p>
                    <p className={`text-sm font-bold tabular-nums ${historySupplier.remainingBalance > 0 ? 'text-destructive' : 'text-emerald-600'}`}>
                      {historySupplier.remainingBalance.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                    </p>
                  </div>
                </div>
              </div>
              {historyLoading ? (
                <div className="flex-1 flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : paymentHistory.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center py-8 text-center">
                  <History className="w-10 h-10 text-muted-foreground/30 mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد دفعات مسجلة</p>
                  <p className="text-xs text-muted-foreground mt-1">لم يتم تسجيل أي دفعة لهذا المورد بعد</p>
                </div>
              ) : (
                <ScrollArea className="flex-1">
                  <div className="space-y-2 pb-2">
                    {paymentHistory.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-white dark:bg-card border border-border/40 hover:bg-muted/30 transition-colors card-hover"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10 flex-shrink-0">
                          {payment.method === 'cash' ? (
                            <Banknote className="w-4 h-4 text-emerald-600" />
                          ) : payment.method === 'transfer' ? (
                            <Wallet className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Truck className="w-4 h-4 text-emerald-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-emerald-600 tabular-nums">
                            -{payment.amount.toLocaleString('ar-SA', { minimumFractionDigits: 2 })} ر.س
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {payment.method === 'cash' ? 'نقدي' : payment.method === 'transfer' ? 'تحويل' : 'شيك'}
                            {payment.notes && ` • ${payment.notes}`}
                          </p>
                        </div>
                        <p className="text-[10px] text-muted-foreground flex-shrink-0">
                          {new Date(payment.createdAt).toLocaleDateString('ar-SA', {
                            year: 'numeric',
                            month: '2-digit',
                            day: '2-digit',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
