'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { ConfirmDialog } from '@/components/confirm-dialog'
import { EmptyState, Pagination } from '@/components/empty-state'
import { Switch } from '@/components/ui/switch'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Checkbox } from '@/components/ui/checkbox'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { toast } from 'sonner'
import { z } from 'zod'
import { useFormValidation } from '@/hooks/use-form-validation'
import {
  Search, Plus, Pencil, Trash2, AlertTriangle, Package, Filter, Loader2,
  PackageX, X, History, PackagePlus, Download, ChevronLeft,
  ChevronRight, ArrowUpDown, ArrowUp, ArrowDown,
  ArrowLeft, CheckSquare, DollarSign, Tags, ListFilter,
  Clock, Activity, Layers, Upload,
} from 'lucide-react'
import { CsvImportDialog } from '@/components/csv-import-dialog'
import { useApi } from '@/hooks/use-api'
import { useCurrency } from '@/hooks/use-currency'
import { exportToCSV } from '@/lib/export-csv'
import { formatDateTime, formatTime } from '@/lib/date-utils'
import { format } from 'date-fns'
import { ar } from 'date-fns/locale'

import type { Product, Category, StockAdjustment } from './inventory/types'
import { adjustmentTypeConfig, movementTypeConfig } from './inventory/constants'
import { ProductFormDialog } from './inventory/product-form-dialog'
import { StockAdjustmentDialog } from './inventory/stock-adjustment-dialog'
import { ProductVariantsDialog } from './inventory/product-variants-dialog'
import { CategoryManager } from './inventory/category-manager'

// ─── Inline schemas for batch dialog validation ────────────────
const batchPriceSchema = z.object({
  priceChangeValue: z.coerce.number().positive('يرجى إدخال قيمة صحيحة'),
})

const batchCategorySchema = z.object({
  categoryId: z.string().min(1, 'يرجى اختيار التصنيف'),
})

export function InventoryScreen() {
  // API hook
  const { get, patch, del, request } = useApi()

  // Currency
  const { symbol, formatCurrency } = useCurrency()

  // Data state
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)

  // Pagination state
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)

  // Filter state
  const [search, setSearch] = useState('')
  const [categoryId, setCategoryId] = useState('all')
  const [lowStock, setLowStock] = useState(false)

  // Dialog state
  const [formOpen, setFormOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)

  // Stock adjustment dialog state
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustProduct, setAdjustProduct] = useState<Product | null>(null)

  // ─── Batch Operations State ──────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [batchSubmitting, setBatchSubmitting] = useState(false)

  // Batch price change dialog state
  const [batchPriceOpen, setBatchPriceOpen] = useState(false)
  const [batchPriceType, setBatchPriceType] = useState<'fixed' | 'percentage'>('fixed')
  const [batchPriceValue, setBatchPriceValue] = useState('')
  const [batchPercentDir, setBatchPercentDir] = useState<'increase' | 'decrease'>('increase')

  // Batch category change dialog state
  const [batchCategoryOpen, setBatchCategoryOpen] = useState(false)
  const [batchNewCategoryId, setBatchNewCategoryId] = useState('')

  // Batch status toggle dialog state
  const [batchStatusOpen, setBatchStatusOpen] = useState(false)
  const [batchNewStatus, setBatchNewStatus] = useState(true)

  // Batch delete confirmation dialog state
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false)

  // Per-product stock history popover state
  const [productHistoryId, setProductHistoryId] = useState<string | null>(null)
  const [productMovements, setProductMovements] = useState<StockAdjustment[]>([])
  const [productMovementsLoading, setProductMovementsLoading] = useState(false)

  // Stock history dialog state
  const [historyOpen, setHistoryOpen] = useState(false)
  const [adjustments, setAdjustments] = useState<StockAdjustment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyPage, setHistoryPage] = useState(1)
  const [historyTotalPages, setHistoryTotalPages] = useState(1)
  const [historyTotal, setHistoryTotal] = useState(0)
  const [historyFilterProduct, setHistoryFilterProduct] = useState('all')
  const [historyFilterType, setHistoryFilterType] = useState('all')
  const [historyDateFrom, setHistoryDateFrom] = useState<Date | undefined>()
  const [historyDateTo, setHistoryDateTo] = useState<Date | undefined>()
  const [dateFromOpen, setDateFromOpen] = useState(false)
  const [dateToOpen, setDateToOpen] = useState(false)

  // ─── Variants Dialog State ────────────────────────────────────
  const [variantsOpen, setVariantsOpen] = useState(false)
  const [variantsProduct, setVariantsProduct] = useState<Product | null>(null)

  // ─── CSV Import State ────────────────────────────────────────
  const [csvImportOpen, setCsvImportOpen] = useState(false)

  // ─── Category Management State ─────────────────────────────────
  const [catMgmtOpen, setCatMgmtOpen] = useState(false)

  // ─── Form Validation ──────────────────────────────────────────
  const batchPriceValidation = useFormValidation({ schema: batchPriceSchema })
  const batchCategoryValidation = useFormValidation({ schema: batchCategorySchema })

  // ─── Per-product stock history fetch ─────────────────────────
  const fetchProductMovements = useCallback(async (productId: string) => {
    setProductMovementsLoading(true)
    try {
      const result = await get<{ adjustments: StockAdjustment[] }>(
        '/api/stock-adjustments',
        { productId, page: 1, limit: 5 },
        { showErrorToast: false },
      )
      setProductMovements(result?.adjustments || [])
    } catch {
      setProductMovements([])
    } finally {
      setProductMovementsLoading(false)
    }
  }, [get])

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    const result = await get<Category[]>('/api/categories', undefined, { showErrorToast: false })
    if (result) {
      setCategories(result)
    }
  }, [get])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  // Fetch products (internal)
  const doFetchProducts = useCallback(async (p: number, s: string, cat: string, ls: boolean) => {
    setLoading(true)
    try {
      const result = await get<{ products: Product[]; total: number; page: number; totalPages: number }>(
        '/api/products',
        {
          search: s || undefined,
          categoryId: cat !== 'all' ? cat : undefined,
          lowStock: ls ? 'true' : undefined,
          page: p,
          limit: 50,
        },
        { showErrorToast: false },
      )
      if (result) {
        setProducts(result.products)
        setTotal(result.total)
        setPage(result.page)
        setTotalPages(result.totalPages)
      }
    } catch {
      // handled by useApi
    } finally {
      setLoading(false)
    }
  }, [get])

  // Refresh products with current state (for callbacks that don't have filter values)
  const fetchProducts = useCallback(() => {
    doFetchProducts(page, search, categoryId, lowStock)
  }, [page, search, categoryId, lowStock, doFetchProducts])

  // Debounced filter changes → reset to page 1
  const [searchTimer, setSearchTimer] = useState<NodeJS.Timeout | null>(null)
  const handleSearchChange = (value: string) => {
    setSearch(value)
    if (searchTimer) clearTimeout(searchTimer)
    const timer = setTimeout(() => {
      setPage(1)
      doFetchProducts(1, value, categoryId, lowStock)
    }, 300)
    setSearchTimer(timer)
  }

  // Filter changes (non-search) → reset to page 1
  useEffect(() => {
    setPage(1)
    doFetchProducts(1, search, categoryId, lowStock)
  }, [categoryId, lowStock])

  // Page navigation
  const goToPage = useCallback((p: number) => {
    if (p >= 1 && p <= totalPages && p !== page) {
      doFetchProducts(p, search, categoryId, lowStock)
    }
  }, [search, categoryId, lowStock, page, totalPages, doFetchProducts])

  // Form open handlers
  const openAddDialog = () => {
    setEditingProduct(null)
    setFormOpen(true)
  }

  const openEditDialog = (product: Product) => {
    setEditingProduct(product)
    setFormOpen(true)
  }

  const openDeleteDialog = (product: Product) => {
    setDeletingProduct(product)
    setDeleteOpen(true)
  }

  const handleDelete = async () => {
    if (!deletingProduct) return

    const ok = await del(`/api/products/${deletingProduct.id}`)
    if (ok) {
      setDeleteOpen(false)
      setDeletingProduct(null)
      fetchProducts()
    }
  }

  // ─── Stock History Handlers ───────────────────────────────────────
  const fetchHistory = useCallback(async (page = 1) => {
    setHistoryLoading(true)
    try {
      const result = await get<{
        adjustments: StockAdjustment[]
        pagination: { page: number; totalPages: number; total: number }
      }>(
        '/api/stock-adjustments',
        {
          page,
          limit: 15,
          productId: historyFilterProduct !== 'all' ? historyFilterProduct : undefined,
          type: historyFilterType !== 'all' ? historyFilterType : undefined,
          dateFrom: historyDateFrom ? format(historyDateFrom, 'yyyy-MM-dd') : undefined,
          dateTo: historyDateTo ? format(historyDateTo, 'yyyy-MM-dd') : undefined,
        },
        { showErrorToast: false },
      )
      if (result) {
        setAdjustments(result.adjustments)
        setHistoryPage(result.pagination.page)
        setHistoryTotalPages(result.pagination.totalPages)
        setHistoryTotal(result.pagination.total)
      }
    } catch {
      // handled by useApi
    } finally {
      setHistoryLoading(false)
    }
  }, [historyFilterProduct, historyFilterType, historyDateFrom, historyDateTo, get])

  useEffect(() => {
    if (historyOpen) {
      setHistoryPage(1)
      fetchHistory(1)
    }
  }, [historyOpen, fetchHistory])

  const handleHistoryPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= historyTotalPages) {
      setHistoryPage(newPage)
      fetchHistory(newPage)
    }
  }

  const handleExportCSV = () => {
    if (adjustments.length === 0) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }

    const headers = ['المنتج', 'التصنيف', 'النوع', 'الكمية', 'السابق', 'الجديد', 'السبب', 'المستخدم', 'المرجع', 'التاريخ']
    const rows = adjustments.map((a) => ({
      'المنتج': a.product.name,
      'التصنيف': a.product.category.name,
      'النوع': adjustmentTypeConfig[a.type]?.label || a.type,
      'الكمية': a.quantity,
      'السابق': a.previousQty,
      'الجديد': a.newQty,
      'السبب': a.reason,
      'المستخدم': a.userName || a.userId,
      'المرجع': a.reference || '',
      'التاريخ': formatDateTime(a.createdAt),
    }))

    exportToCSV(rows, `stock-adjustments-${format(new Date(), 'yyyy-MM-dd')}`, headers)
    toast.success('تم تصدير البيانات بنجاح')
  }

  // ─── Batch Selection Handlers ─────────────────────────────────
  const toggleSelectProduct = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === products.length && products.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(products.map((p) => p.id)))
    }
  }

  const clearSelection = () => {
    setSelectedIds(new Set())
  }

  const isAllSelected = products.length > 0 && selectedIds.size === products.length
  const isSomeSelected = selectedIds.size > 0

  // ─── Batch Operation Handlers ─────────────────────────────────
  const selectedProducts = products.filter((p) => selectedIds.has(p.id))

  const handleBatchPriceChange = async () => {
    if (selectedIds.size === 0) return
    if (!batchPriceValidation.validate({ priceChangeValue: batchPriceValue })) return

    setBatchSubmitting(true)
    try {
      const payload: Record<string, unknown> = {
        ids: Array.from(selectedIds),
        priceChangeType: batchPriceType,
      }

      if (batchPriceType === 'fixed') {
        payload.priceChangeValue = Number(batchPriceValue)
      } else {
        payload.priceChangeValue = batchPercentDir === 'increase'
          ? Number(batchPriceValue)
          : -Number(batchPriceValue)
      }

      const result = await patch<{ count: number }>('/api/products', payload)
      if (result) {
        toast.success(`تم تغيير سعر ${result.count} منتج بنجاح`)
        setBatchPriceOpen(false)
        setBatchPriceValue('')
        batchPriceValidation.clearAllErrors()
        clearSelection()
        fetchProducts()
      }
    } catch {
      // handled by useApi
    } finally {
      setBatchSubmitting(false)
    }
  }

  const handleBatchCategoryChange = async () => {
    if (selectedIds.size === 0) return
    if (!batchCategoryValidation.validate({ categoryId: batchNewCategoryId })) return

    setBatchSubmitting(true)
    try {
      const result = await patch<{ count: number }>('/api/products', {
        ids: Array.from(selectedIds),
        categoryId: batchNewCategoryId,
      })
      if (result) {
        toast.success(`تم نقل ${result.count} منتج إلى التصنيف الجديد`)
        setBatchCategoryOpen(false)
        setBatchNewCategoryId('')
        batchCategoryValidation.clearAllErrors()
        clearSelection()
        fetchProducts()
      }
    } catch {
      // handled by useApi
    } finally {
      setBatchSubmitting(false)
    }
  }

  const handleBatchStatusToggle = async () => {
    if (selectedIds.size === 0) return

    setBatchSubmitting(true)
    try {
      const result = await patch<{ count: number }>('/api/products', {
        ids: Array.from(selectedIds),
        isActive: batchNewStatus,
      })
      if (result) {
        toast.success(`تم ${batchNewStatus ? 'تفعيل' : 'تعطيل'} ${result.count} منتج بنجاح`)
        setBatchStatusOpen(false)
        clearSelection()
        fetchProducts()
      }
    } catch {
      // handled by useApi
    } finally {
      setBatchSubmitting(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return

    setBatchSubmitting(true)
    try {
      const ids = Array.from(selectedIds)
      const result = await request<{ count: number }>(
        '/api/products',
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ids }),
        },
        { showSuccessToast: false },
      )
      if (result) {
        toast.success(`تم حذف ${result.count} منتج بنجاح`)
        setBatchDeleteOpen(false)
        clearSelection()
        fetchProducts()
      }
    } catch {
      // handled by useApi
    } finally {
      setBatchSubmitting(false)
    }
  }

  // Count low stock items
  const lowStockCount = products.filter((p) => p.quantity <= p.minQuantity).length

  return (
    <div className="h-full flex flex-col p-4 md:p-6 gap-4 md:gap-6 bg-muted/30 animate-fade-in-up">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Package className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground heading-decoration">إدارة المخزون</h2>
            <p className="text-xs text-muted-foreground">
              {total} منتج
              {lowStockCount > 0 && (
                <span className="animate-pulse-glow inline-flex items-center px-2 py-0.5 rounded-full text-destructive font-medium mr-2 text-xs bg-destructive/10">
                  • {lowStockCount} منتج منخفض المخزون
                </span>
              )}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setCatMgmtOpen(true)}
            className="gap-2 rounded-lg"
          >
            <Tags className="w-4 h-4" />
            إدارة التصنيفات
          </Button>
          <Button
            variant="outline"
            onClick={() => setHistoryOpen(true)}
            className="gap-2 rounded-lg"
          >
            <History className="w-4 h-4" />
            سجل التعديلات
          </Button>
          <Button
            variant="outline"
            onClick={() => setCsvImportOpen(true)}
            className="gap-2 rounded-lg"
          >
            <Upload className="w-4 h-4" />
            استيراد CSV
          </Button>
          <Button onClick={openAddDialog} className="gap-2 shadow-md shadow-primary/20">
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-card rounded-xl border shadow-sm p-4 card-hover glass-card-subtle filter-bar">
        <div className="flex items-center gap-2 mb-3 filter-group">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm font-medium text-foreground">تصفية وبحث</span>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 stagger-children">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث عن منتج..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pr-9 h-10 rounded-lg"
            />
          </div>

          {/* Category filter */}
          <div className="sm:w-48">
            <Select value={categoryId} onValueChange={(val) => { setCategoryId(val) }}>
              <SelectTrigger className="h-10 rounded-lg select-enhanced">
                <SelectValue placeholder="جميع التصنيفات" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع التصنيفات</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Low Stock Toggle */}
          <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-2 border">
            <Switch
              id="low-stock-toggle"
              checked={lowStock}
              onCheckedChange={setLowStock}
            />
            <Label htmlFor="low-stock-toggle" className="text-sm cursor-pointer flex items-center gap-1.5 whitespace-nowrap">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
              مخزون منخفض
            </Label>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card rounded-xl border shadow-sm flex-1 flex flex-col overflow-hidden card-hover data-table-enhanced table-modern table-hover-highlight">
        {loading ? (
          <div className="flex-1 flex items-center justify-center loading-overlay" style={{ position: 'absolute', inset: 0 }}>
            <div className="loading-spinner" />
            <div className="loading-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <p className="loading-text">جاري تحميل المنتجات...</p>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            icon={PackageX}
            title="لا توجد منتجات"
            description="أضف منتج جديد أو عدّل عوامل التصفية"
            compact
          />
        ) : (
          <ScrollArea className="flex-1">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10 text-center">
                    <Checkbox
                      checked={isAllSelected}
                      ref={(el) => {
                        if (el) {
                          (el as unknown as HTMLInputElement).indeterminate = isSomeSelected && !isAllSelected
                        }
                      }}
                      onCheckedChange={toggleSelectAll}
                      className="mx-auto"
                      aria-label="تحديد الكل"
                    />
                  </TableHead>
                  <TableHead className="text-sm font-semibold text-foreground">المنتج</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground">التصنيف</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground text-center">الكمية</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground text-center">سعر الشراء</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground text-center">سعر البيع</TableHead>
                  <TableHead className="text-sm font-semibold text-foreground text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => {
                  const isLowStock = product.quantity <= product.minQuantity
                  const isSelected = selectedIds.has(product.id)
                  return (
                    <TableRow
                      key={product.id}
                      className={`scrollable-list-item pricing-row group transition-colors ${isSelected ? 'bg-primary/5' : ''} ${isLowStock && !isSelected ? 'bg-destructive/[0.03] hover:bg-destructive/[0.06]' : ''}`}
                    >
                      {/* Checkbox */}
                      <TableCell className="w-10 text-center">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectProduct(product.id)}
                          className="mx-auto"
                          aria-label={`تحديد ${product.name}`}
                        />
                      </TableCell>

                      {/* Product Name with image */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {product.image ? (
                            <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={product.image}
                                alt={product.name}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                              <Package className="w-4 h-4 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{product.name}</p>
                            {product.barcode && (
                              <p className="text-[10px] text-muted-foreground font-mono">{product.barcode}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Category */}
                      <TableCell>
                        <Badge variant="secondary" className="text-xs font-medium">
                          {product.category.name}
                        </Badge>
                      </TableCell>

                      {/* Quantity */}
                      <TableCell className="text-center">
                        <div className={`inline-flex flex-col items-center px-3 py-1.5 rounded-lg ${isLowStock ? 'bg-destructive/10 status-chip-danger' : 'bg-muted/50'}`}>
                          <span className={`text-sm font-bold tabular-nums tabular-nums-enhanced ${isLowStock ? 'text-destructive' : 'text-foreground'}`}>
                            {product.quantity}
                          </span>
                          {isLowStock && (
                            <span className="chip chip-warning text-[10px] flex items-center gap-0.5 mt-0.5">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              حد أدنى: {product.minQuantity}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Cost Price */}
                      <TableCell className="text-center">
                        <span className="text-sm text-muted-foreground tabular-nums">
                          {formatCurrency(product.costPrice)}
                        </span>
                      </TableCell>

                      {/* Selling Price */}
                      <TableCell className="text-center">
                        <span className="text-sm font-semibold text-foreground tabular-nums">
                          {formatCurrency(product.price)}
                        </span>
                      </TableCell>

                      {/* Actions */}
                      <TableCell className="text-center">
                        <div className="action-menu flex items-center justify-center gap-1">
                          {/* Per-product stock history button */}
                          <Popover
                            open={productHistoryId === product.id}
                            onOpenChange={(open) => {
                              if (open) {
                                setProductHistoryId(product.id)
                                fetchProductMovements(product.id)
                              } else {
                                setProductHistoryId(null)
                                setProductMovements([])
                              }
                            }}
                          >
                            <PopoverTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-blue-100 dark:hover:bg-blue-900/30 text-muted-foreground hover:text-blue-700 dark:hover:text-blue-400"
                                title="سجل الحركة"
                              >
                                <Activity className="w-4 h-4" />
                                <span className="sr-only">سجل الحركة</span>
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-80 p-0" dir="rtl" side="left" align="start">
                              {/* Popover Header */}
                              <div className="flex items-center gap-2 px-4 py-3 border-b bg-muted/30">
                                <div className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                  <Activity className="w-3.5 h-3.5 text-blue-700 dark:text-blue-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-bold text-foreground truncate">آخر الحركات</p>
                                  <p className="text-[10px] text-muted-foreground truncate">{product.name}</p>
                                </div>
                              </div>
                              {/* Popover Content */}
                              <div className="max-h-72 overflow-y-auto">
                                {productMovementsLoading ? (
                                  <div className="flex items-center justify-center py-8">
                                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                                  </div>
                                ) : productMovements.length === 0 ? (
                                  <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                                    <History className="w-8 h-8 text-muted-foreground/20 mb-2" />
                                    <p className="text-xs text-muted-foreground">لا توجد حركات مسجلة</p>
                                  </div>
                                ) : (
                                  <div className="divide-y">
                                    {productMovements.map((mov) => {
                                      const cfg = movementTypeConfig[mov.type] || movementTypeConfig.adjustment
                                      const MovIcon = cfg.icon
                                      const change = mov.newQty - mov.previousQty
                                      const isUp = change > 0
                                      const isDown = change < 0
                                      return (
                                        <div key={mov.id} className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/30 transition-colors">
                                          {/* Icon */}
                                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${cfg.bg}`}>
                                            <MovIcon className={`w-3.5 h-3.5 ${cfg.color}`} />
                                          </div>
                                          {/* Info */}
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-1 mb-0.5">
                                              <span className={`text-[10px] font-semibold ${cfg.color}`}>{cfg.label}</span>
                                              <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                                <Clock className="w-2.5 h-2.5" />
                                                {formatTime(mov.createdAt)}
                                              </span>
                                            </div>
                                            {/* Quantities */}
                                            <div className="flex items-center gap-1.5 text-[10px]">
                                              <span className="text-muted-foreground tabular-nums">{mov.previousQty}</span>
                                              <ArrowLeft className={`w-3 h-3 ${isUp ? 'text-emerald-500' : isDown ? 'text-red-500' : 'text-amber-500'}`} />
                                              <span className={`font-bold tabular-nums ${isUp ? 'text-emerald-600 dark:text-emerald-400' : isDown ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                                                {mov.newQty}
                                              </span>
                                              {change !== 0 && (
                                                <span className={`rounded-full px-1.5 py-0 text-[9px] font-bold ${
                                                  isUp ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                                                    : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}>
                                                  {isUp ? '+' : ''}{change}
                                                </span>
                                              )}
                                            </div>
                                            {/* Reason */}
                                            {mov.reason && (
                                              <p className="text-[9px] text-muted-foreground truncate mt-0.5 max-w-[180px]">{mov.reason}</p>
                                            )}
                                          </div>
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}
                              </div>
                              {/* Footer */}
                              {!productMovementsLoading && productMovements.length > 0 && (
                                <div className="border-t px-4 py-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full h-7 text-[10px] gap-1 text-muted-foreground hover:text-foreground"
                                    onClick={() => {
                                      setProductHistoryId(null)
                                      setProductMovements([])
                                      setHistoryFilterProduct(product.id)
                                      setHistoryOpen(true)
                                    }}
                                  >
                                    <History className="w-3 h-3" />
                                    عرض السجل الكامل
                                  </Button>
                                </div>
                              )}
                            </PopoverContent>
                          </Popover>
                          {/* Variants button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setVariantsProduct(product); setVariantsOpen(true) }}
                            className="h-8 w-8 p-0 hover:bg-violet-100 dark:hover:bg-violet-900/30 text-muted-foreground hover:text-violet-700 dark:hover:text-violet-400"
                            title="المتغيرات"
                          >
                            <Layers className="w-4 h-4" />
                            <span className="sr-only">المتغيرات</span>
                          </Button>
                          {/* Quick stock adjust button */}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setAdjustProduct(product); setAdjustDialogOpen(true) }}
                            className="h-8 w-8 p-0 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-400"
                            title="تعديل المخزون"
                          >
                            <PackagePlus className="w-4 h-4" />
                            <span className="sr-only">تعديل المخزون</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(product)}
                            className="h-8 w-8 p-0 hover:bg-primary/10 text-muted-foreground hover:text-primary"
                          >
                            <Pencil className="w-4 h-4" />
                            <span className="sr-only">تعديل</span>
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openDeleteDialog(product)}
                            className="h-8 w-8 p-0 hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="w-4 h-4" />
                            <span className="sr-only">حذف</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        )}
      </div>

      {/* ─── Pagination Controls ──────────────────────────────── */}
      <div className="px-4 md:px-6 py-3 flex-shrink-0">
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={goToPage} />
      </div>

      {/* ─── Floating Batch Action Bar ────────────────────────── */}
      {isSomeSelected && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 animate-fade-in-up">
          <div className="glass-card rounded-2xl shadow-xl border px-4 py-3 flex items-center gap-3">
            {/* Selected count badge */}
            <Badge variant="default" className="rounded-full px-3 py-1 text-sm font-bold gap-1.5 bg-primary shadow-md">
              <CheckSquare className="w-3.5 h-3.5" />
              {selectedIds.size}
            </Badge>

            <div className="w-px h-8 bg-border/50" />

            {/* Batch actions - scrollable on mobile */}
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBatchPriceType('fixed')
                  setBatchPriceValue('')
                  setBatchPercentDir('increase')
                  batchPriceValidation.clearAllErrors()
                  setBatchPriceOpen(true)
                }}
                className="gap-1.5 rounded-lg whitespace-nowrap text-xs shrink-0"
              >
                <DollarSign className="w-3.5 h-3.5" />
                تغيير السعر
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBatchNewCategoryId('')
                  batchCategoryValidation.clearAllErrors()
                  setBatchCategoryOpen(true)
                }}
                className="gap-1.5 rounded-lg whitespace-nowrap text-xs shrink-0"
              >
                <ListFilter className="w-3.5 h-3.5" />
                تغيير التصنيف
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setBatchNewStatus(true)
                  setBatchStatusOpen(true)
                }}
                className="gap-1.5 rounded-lg whitespace-nowrap text-xs shrink-0"
              >
                <Tags className="w-3.5 h-3.5" />
                تعديل الحالة
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBatchDeleteOpen(true)}
                className="gap-1.5 rounded-lg whitespace-nowrap text-xs text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/20 shrink-0"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف المحدد
              </Button>
            </div>

            <div className="w-px h-8 bg-border/50" />

            {/* Clear selection */}
            <Button
              variant="ghost"
              size="sm"
              onClick={clearSelection}
              className="text-xs text-muted-foreground hover:text-foreground rounded-lg whitespace-nowrap shrink-0"
            >
              إلغاء التحديد
            </Button>
          </div>
        </div>
      )}

      {/* ─── Extracted: Product Form Dialog ─────────────────────── */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditingProduct(null) }}
        editingProduct={editingProduct}
        categories={categories}
        onSaved={fetchProducts}
      />

      {/* ─── Delete Confirmation Dialog ──────────────────────────── */}
      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="تأكيد حذف المنتج"
        description={`هل أنت متأكد من حذف المنتج "${deletingProduct?.name}"؟ لا يمكن التراجع عن هذا الإجراء.`}
        onConfirm={handleDelete}
        confirmText="حذف المنتج"
        variant="destructive"
      />

      {/* ─── Extracted: Stock Adjustment Dialog ──────────────────── */}
      <StockAdjustmentDialog
        open={adjustDialogOpen}
        onOpenChange={(open) => { setAdjustDialogOpen(open); if (!open) setAdjustProduct(null) }}
        product={adjustProduct}
        onSaved={fetchProducts}
      />

      {/* ─── Stock History Dialog ────────────────────────────────── */}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-hidden flex flex-col" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <History className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              </div>
              سجل تعديلات المخزون
            </DialogTitle>
            <DialogDescription>
              عرض وتصفية جميع تعديلات المخزون
            </DialogDescription>
          </DialogHeader>

          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-muted/50 border">
            <div className="flex-1">
              <Select value={historyFilterProduct} onValueChange={(val) => setHistoryFilterProduct(val)}>
                <SelectTrigger className="h-9 rounded-lg text-xs">
                  <SelectValue placeholder="كل المنتجات" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل المنتجات</SelectItem>
                  {products.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="sm:w-36">
              <Select value={historyFilterType} onValueChange={(val) => setHistoryFilterType(val)}>
                <SelectTrigger className="h-9 rounded-lg text-xs">
                  <SelectValue placeholder="كل الأنواع" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {Object.entries(adjustmentTypeConfig).map(([key, cfg]) => (
                    <SelectItem key={key} value={key}>{cfg.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {/* Date from */}
            <Popover open={dateFromOpen} onOpenChange={setDateFromOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 rounded-lg text-xs gap-1.5 flex-1 sm:flex-none justify-center">
                  <span>{historyDateFrom ? format(historyDateFrom, 'dd/MM/yyyy') : 'من تاريخ'}</span>
                  {historyDateFrom && (
                    <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); setHistoryDateFrom(undefined) }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={historyDateFrom}
                  onSelect={(date) => { setHistoryDateFrom(date); setDateFromOpen(false) }}
                  locale={ar}
                />
              </PopoverContent>
            </Popover>
            {/* Date to */}
            <Popover open={dateToOpen} onOpenChange={setDateToOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="h-9 rounded-lg text-xs gap-1.5 flex-1 sm:flex-none justify-center">
                  <span>{historyDateTo ? format(historyDateTo, 'dd/MM/yyyy') : 'إلى تاريخ'}</span>
                  {historyDateTo && (
                    <X className="w-3 h-3" onClick={(e) => { e.stopPropagation(); setHistoryDateTo(undefined) }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={historyDateTo}
                  onSelect={(date) => { setHistoryDateTo(date); setDateToOpen(false) }}
                  locale={ar}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Stats bar */}
          <div className="flex items-center gap-4 px-1">
            <span className="text-xs text-muted-foreground">
              إجمالي: <span className="font-semibold text-foreground">{historyTotal}</span> تعديل
            </span>
            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1.5" onClick={handleExportCSV}>
              <Download className="w-3.5 h-3.5" />
              تصدير CSV
            </Button>
          </div>

          {/* Adjustments Table */}
          <div className="flex-1 overflow-hidden rounded-xl border">
            {historyLoading ? (
              <div className="h-full flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 text-primary animate-spin" />
              </div>
            ) : adjustments.length === 0 ? (
              <div className="h-full flex items-center justify-center py-12">
                <div className="text-center">
                  <History className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">لا توجد تعديلات مسجلة</p>
                </div>
              </div>
            ) : (
              <ScrollArea className="h-full max-h-[45vh]">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-xs font-semibold">المنتج</TableHead>
                      <TableHead className="text-xs font-semibold text-center">النوع</TableHead>
                      <TableHead className="text-xs font-semibold text-center">الكمية</TableHead>
                      <TableHead className="text-xs font-semibold text-center">السابق</TableHead>
                      <TableHead className="text-xs font-semibold text-center">الجديد</TableHead>
                      <TableHead className="text-xs font-semibold">السبب</TableHead>
                      <TableHead className="text-xs font-semibold text-center">التاريخ</TableHead>
                      <TableHead className="text-xs font-semibold text-center">المستخدم</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {adjustments.map((adj) => {
                      const typeCfg = adjustmentTypeConfig[adj.type] || adjustmentTypeConfig.correction
                      const TypeIcon = typeCfg.icon
                      return (
                        <TableRow key={adj.id} className="group">
                          <TableCell>
                            <p className="text-xs font-medium text-foreground truncate max-w-[120px]">
                              {adj.product.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">{adj.product.category.name}</p>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={`${typeCfg.bgColor} ${typeCfg.color} border-0 text-[10px] font-semibold gap-1 px-2`}>
                              <TypeIcon className="w-3 h-3" />
                              {typeCfg.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs font-semibold tabular-nums">{adj.quantity}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs text-muted-foreground tabular-nums">{adj.previousQty}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-xs font-bold tabular-nums text-foreground">{adj.newQty}</span>
                          </TableCell>
                          <TableCell>
                            <p className="text-xs text-foreground truncate max-w-[140px]" title={adj.reason}>
                              {adj.reason}
                            </p>
                            {adj.reference && (
                              <p className="text-[10px] text-muted-foreground font-mono">#{adj.reference}</p>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatDateTime(adj.createdAt)}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {adj.userName || adj.userId}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </ScrollArea>
            )}
          </div>

          {/* Pagination */}
          {historyTotalPages > 1 && (
            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-xs text-muted-foreground">
                صفحة {historyPage} من {historyTotalPages}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={() => handleHistoryPageChange(1)}
                  disabled={historyPage <= 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={() => handleHistoryPageChange(historyPage - 1)}
                  disabled={historyPage <= 1}
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
                {/* Page numbers */}
                {Array.from({ length: Math.min(5, historyTotalPages) }, (_, i) => {
                  let pageNum: number
                  if (historyTotalPages <= 5) {
                    pageNum = i + 1
                  } else if (historyPage <= 3) {
                    pageNum = i + 1
                  } else if (historyPage >= historyTotalPages - 2) {
                    pageNum = historyTotalPages - 4 + i
                  } else {
                    pageNum = historyPage - 2 + i
                  }
                  return (
                    <Button
                      key={pageNum}
                      variant={historyPage === pageNum ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 w-8 p-0 rounded-lg text-xs"
                      onClick={() => handleHistoryPageChange(pageNum)}
                    >
                      {pageNum}
                    </Button>
                  )
                })}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={() => handleHistoryPageChange(historyPage + 1)}
                  disabled={historyPage >= historyTotalPages}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 w-8 p-0 rounded-lg"
                  onClick={() => handleHistoryPageChange(historyTotalPages)}
                  disabled={historyPage >= historyTotalPages}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <DialogFooter className="pt-3 border-t">
            <Button variant="outline" onClick={() => setHistoryOpen(false)} className="rounded-lg">
              إغلاق
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Batch Price Change Dialog ────────────────────────── */}
      <Dialog open={batchPriceOpen} onOpenChange={(open) => { setBatchPriceOpen(open); if (!open) { setBatchPriceValue(''); batchPriceValidation.clearAllErrors() } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-9 h-9 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
                <DollarSign className="w-5 h-5 text-amber-700 dark:text-amber-400" />
              </div>
              تغيير سعر المنتجات المحددة
            </DialogTitle>
            <DialogDescription>
              تغيير سعر {selectedIds.size} منتج محدد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Price mode selector */}
            <RadioGroup
              value={batchPriceType}
              onValueChange={(val) => { setBatchPriceType(val as 'fixed' | 'percentage'); setBatchPriceValue('') }}
              className="grid grid-cols-2 gap-3"
            >
              <label className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                batchPriceType === 'fixed'
                  ? 'bg-primary/5 border-primary text-primary'
                  : 'border-border hover:border-muted-foreground/30'
              }`}>
                <RadioGroupItem value="fixed" className="sr-only" />
                <DollarSign className="w-5 h-5" />
                <span className="text-sm font-semibold">سعر ثابت</span>
                <span className="text-[10px] text-muted-foreground">تحديد سعر موحد للجميع</span>
              </label>
              <label className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 cursor-pointer transition-all ${
                batchPriceType === 'percentage'
                  ? 'bg-primary/5 border-primary text-primary'
                  : 'border-border hover:border-muted-foreground/30'
              }`}>
                <RadioGroupItem value="percentage" className="sr-only" />
                <ArrowUpDown className="w-5 h-5" />
                <span className="text-sm font-semibold">نسبة مئوية</span>
                <span className="text-[10px] text-muted-foreground">زيادة أو نقصان بنسبة %</span>
              </label>
            </RadioGroup>

            {/* Value input */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                {batchPriceType === 'fixed' ? 'السعر الجديد' : 'النسبة المئوية'}
              </Label>
              {batchPriceType === 'fixed' ? (
                <div className="relative">
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={batchPriceValue}
                    onChange={(e) => { setBatchPriceValue(e.target.value); batchPriceValidation.clearFieldError('priceChangeValue') }}
                    className={`h-10 rounded-lg text-left tabular-nums pl-14 ${batchPriceValidation.errors.priceChangeValue ? 'border-destructive' : ''}`}
                    dir="ltr"
                    autoFocus
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{symbol}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1000"
                      placeholder="0"
                      value={batchPriceValue}
                      onChange={(e) => { setBatchPriceValue(e.target.value); batchPriceValidation.clearFieldError('priceChangeValue') }}
                      className={`h-10 rounded-lg text-left tabular-nums pl-8 ${batchPriceValidation.errors.priceChangeValue ? 'border-destructive' : ''}`}
                      dir="ltr"
                      autoFocus
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  <RadioGroup
                    value={batchPercentDir}
                    onValueChange={(val) => setBatchPercentDir(val as 'increase' | 'decrease')}
                    className="flex gap-1"
                  >
                    <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                      batchPercentDir === 'increase'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-500 text-emerald-700 dark:text-emerald-400'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}>
                      <RadioGroupItem value="increase" className="sr-only" />
                      <ArrowUp className="w-3.5 h-3.5" />
                      زيادة
                    </label>
                    <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg border cursor-pointer text-xs font-medium transition-all ${
                      batchPercentDir === 'decrease'
                        ? 'bg-red-100 dark:bg-red-900/30 border-red-500 text-red-700 dark:text-red-400'
                        : 'border-border hover:border-muted-foreground/30'
                    }`}>
                      <RadioGroupItem value="decrease" className="sr-only" />
                      <ArrowDown className="w-3.5 h-3.5" />
                      نقصان
                    </label>
                  </RadioGroup>
                </div>
              )}
            </div>
            {batchPriceValidation.errors.priceChangeValue && (
              <p className="text-sm text-destructive flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5" />
                {batchPriceValidation.errors.priceChangeValue}
              </p>
            )}

            {/* Preview table for percentage mode */}
            {batchPriceType === 'percentage' && batchPriceValue && Number(batchPriceValue) > 0 && (
              <div className="glass-card rounded-xl p-3 max-h-48 overflow-y-auto">
                <p className="text-xs font-semibold text-foreground mb-2">معاينة الأسعار الجديدة:</p>
                <div className="space-y-1.5">
                  {selectedProducts.map((p) => {
                    const mult = batchPercentDir === 'increase' ? 1 : -1
                    const newPrice = Math.max(0, Number((p.price * (1 + mult * Number(batchPriceValue) / 100)).toFixed(2)))
                    return (
                      <div key={p.id} className="flex items-center justify-between text-xs">
                        <span className="text-foreground truncate max-w-[140px]">{p.name}</span>
                        <div className="flex items-center gap-2 tabular-nums">
                          <span className="text-muted-foreground line-through">{p.price.toLocaleString('ar-SA')}</span>
                          <ArrowLeft className="w-3 h-3 text-muted-foreground" />
                          <span className={`font-bold ${newPrice > p.price ? 'text-emerald-600' : newPrice < p.price ? 'text-red-600' : 'text-foreground'}`}>
                            {newPrice.toLocaleString('ar-SA')} {symbol}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Preview for fixed mode */}
            {batchPriceType === 'fixed' && batchPriceValue && Number(batchPriceValue) > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                سيتم تعيين سعر <span className="font-bold text-foreground">{Number(batchPriceValue).toLocaleString('ar-SA')} {symbol}</span> لجميع المنتجات المحددة
              </p>
            )}
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBatchPriceOpen(false)} disabled={batchSubmitting} className="rounded-lg">
              إلغاء
            </Button>
            <Button
              onClick={handleBatchPriceChange}
              disabled={batchSubmitting || !batchPriceValue || Number(batchPriceValue) <= 0}
              className="gap-2 rounded-lg shadow-md shadow-primary/20 btn-ripple"
            >
              {batchSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <DollarSign className="w-4 h-4" />
              تطبيق على {selectedIds.size} منتج
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Batch Category Change Dialog ─────────────────────── */}
      <Dialog open={batchCategoryOpen} onOpenChange={(open) => { setBatchCategoryOpen(open); if (!open) { setBatchNewCategoryId(''); batchCategoryValidation.clearAllErrors() } }}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <div className="w-9 h-9 rounded-lg bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <ListFilter className="w-5 h-5 text-blue-700 dark:text-blue-400" />
              </div>
              تغيير تصنيف المنتجات المحددة
            </DialogTitle>
            <DialogDescription>
              نقل {selectedIds.size} منتج إلى تصنيف آخر
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            <div className="glass-card rounded-xl p-3 max-h-32 overflow-y-auto">
              <p className="text-xs font-semibold text-foreground mb-2">المنتجات المحددة:</p>
              <div className="flex flex-wrap gap-1">
                {selectedProducts.map((p) => (
                  <Badge key={p.id} variant="secondary" className="text-[10px]">
                    {p.name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">التصنيف الجديد</Label>
              <Select value={batchNewCategoryId} onValueChange={(val) => { setBatchNewCategoryId(val); batchCategoryValidation.clearFieldError('categoryId') }}>
                <SelectTrigger className={`h-10 rounded-lg ${batchCategoryValidation.errors.categoryId ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder="اختر التصنيف الجديد" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {batchCategoryValidation.errors.categoryId && (
                <p className="text-sm text-destructive flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  {batchCategoryValidation.errors.categoryId}
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="pt-4 border-t gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setBatchCategoryOpen(false)} disabled={batchSubmitting} className="rounded-lg">
              إلغاء
            </Button>
            <Button
              onClick={handleBatchCategoryChange}
              disabled={batchSubmitting || !batchNewCategoryId}
              className="gap-2 rounded-lg shadow-md shadow-primary/20 btn-ripple"
            >
              {batchSubmitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <ListFilter className="w-4 h-4" />
              نقل المنتجات
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Batch Status Toggle Dialog ───────────────────────── */}
      <ConfirmDialog
        open={batchStatusOpen}
        onOpenChange={setBatchStatusOpen}
        title={batchNewStatus ? 'تفعيل المنتجات المحددة' : 'تعطيل المنتجات المحددة'}
        description={`هل تريد ${batchNewStatus ? 'تفعيل' : 'تعطيل'} ${selectedIds.size} منتج؟`}
        onConfirm={handleBatchStatusToggle}
        confirmText={batchNewStatus ? 'تفعيل' : 'تعطيل'}
        loading={batchSubmitting}
      />

      {/* ─── Batch Delete Confirmation Dialog ─────────────────── */}
      <ConfirmDialog
        open={batchDeleteOpen}
        onOpenChange={setBatchDeleteOpen}
        title="تأكيد حذف المنتجات المحددة"
        description={`هل أنت متأكد من حذف ${selectedIds.size} منتج؟ لا يمكن التراجع عن هذا الإجراء.`}
        onConfirm={handleBatchDelete}
        confirmText="حذف الكل"
        variant="destructive"
        loading={batchSubmitting}
      />

      {/* ─── Extracted: Product Variants Dialog ──────────────────── */}
      <ProductVariantsDialog
        open={variantsOpen}
        onOpenChange={(open) => { setVariantsOpen(open); if (!open) setVariantsProduct(null) }}
        product={variantsProduct}
      />

      {/* ─── Extracted: Category Manager ────────────────────────── */}
      <CategoryManager
        open={catMgmtOpen}
        onOpenChange={setCatMgmtOpen}
        categories={categories}
        onUpdated={fetchCategories}
      />

      {/* ─── CSV Import Dialog ── */}
      <CsvImportDialog
        open={csvImportOpen}
        onOpenChange={setCsvImportOpen}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        onImportComplete={() => { fetchProducts(); fetchCategories() }}
      />
    </div>
  )
}
