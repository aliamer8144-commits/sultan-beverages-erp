'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import {
  SlidersHorizontal,
  Search,
  Calendar,
  Plus,
  X,
  Loader2,
  RefreshCw,
  ArrowDownToLine,
  ArrowUpFromLine,
  Equal,
  PackageOpen,
  ClipboardEdit,
  AlertTriangle,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface StockAdjustmentItem {
  id: string
  productId: string
  product: { id: string; name: string; category: { name: string } | null }
  type: string
  quantity: number
  previousQty: number
  newQty: number
  reason: string
  reference: string | null
  userId: string
  userName: string | null
  createdAt: string
}

interface ProductItem {
  id: string
  name: string
  quantity: number
  category: { id: string; name: string } | null
}

interface AdjustmentStats {
  todayTotal: number
  inCount: number
  outCount: number
  adjustmentCount: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getTypeBadge(type: string) {
  switch (type) {
    case 'in':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] px-2 py-0 h-5 font-semibold badge-active">
          <ArrowDownToLine className="w-3 h-3 ml-1" />
          إضافة
        </Badge>
      )
    case 'out':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px] px-2 py-0 h-5 font-semibold badge-danger">
          <ArrowUpFromLine className="w-3 h-3 ml-1" />
          خصم
        </Badge>
      )
    case 'adjustment':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] px-2 py-0 h-5 font-semibold badge-warning">
          <Equal className="w-3 h-3 ml-1" />
          تعديل
        </Badge>
      )
    default:
      return <Badge variant="outline">{type}</Badge>
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case 'in': return 'إضافة'
    case 'out': return 'خصم'
    case 'adjustment': return 'تعديل'
    default: return type
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function StockAdjustmentsScreen() {
  const user = useAppStore((s) => s.user)

  // Filters
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Data
  const [adjustments, setAdjustments] = useState<StockAdjustmentItem[]>([])
  const [stats, setStats] = useState<AdjustmentStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  // New Adjustment Dialog
  const [newAdjOpen, setNewAdjOpen] = useState(false)
  const [products, setProducts] = useState<ProductItem[]>([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProduct, setSelectedProduct] = useState<ProductItem | null>(null)
  const [adjType, setAdjType] = useState<'in' | 'out' | 'adjustment'>('in')
  const [adjQuantity, setAdjQuantity] = useState(1)
  const [adjReason, setAdjReason] = useState('')
  const [adjReference, setAdjReference] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasActiveFilters = search.trim() || typeFilter !== 'all' || dateFrom || dateTo

  // ── Fetch Adjustments ─────────────────────────────────────────────────

  const fetchAdjustments = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (typeFilter && typeFilter !== 'all') params.set('type', typeFilter)
      if (search.trim()) params.set('search', search.trim())
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/stock-adjustments?${params.toString()}`)
      if (!res.ok) throw new Error('فشل في تحميل التعديلات')
      const data = await res.json()
      setAdjustments(data.data || [])
      setTotal(data.pagination?.total || 0)
      setTotalPages(data.pagination?.totalPages || 0)
      if (data.stats) {
        setStats(data.stats)
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل تعديلات المخزون')
      setAdjustments([])
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, search, dateFrom, dateTo])

  // ── Fetch Stats Only ──────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/stock-adjustments?dateFrom=${today}&dateTo=${today}&limit=1`)
      if (res.ok) {
        const data = await res.json()
        if (data.stats) setStats(data.stats)
      }
    } catch {
      // Silently fail for stats
    }
  }, [])

  useEffect(() => {
    fetchAdjustments()
  }, [fetchAdjustments])

  // ── Clear Filters ────────────────────────────────────────────────────

  const clearFilters = () => {
    setSearch('')
    setTypeFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  // ── New Adjustment Dialog ─────────────────────────────────────────────

  const openNewAdjustmentDialog = async () => {
    setNewAdjOpen(true)
    setSelectedProductId('')
    setSelectedProduct(null)
    setAdjType('in')
    setAdjQuantity(1)
    setAdjReason('')
    setAdjReference('')
    setSubmitting(false)

    setProductsLoading(true)
    try {
      const res = await fetch('/api/products?limit=500')
      if (res.ok) {
        const data = await res.json()
        setProducts(data.data || [])
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل المنتجات')
    } finally {
      setProductsLoading(false)
    }
  }

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId)
    const product = products.find((p) => p.id === productId)
    setSelectedProduct(product || null)
    setAdjQuantity(1)
  }

  const handleSubmitAdjustment = async () => {
    if (!selectedProductId || !adjType || !adjQuantity || adjQuantity <= 0) {
      toast.error('يرجى اختيار المنتج والنوع والكمية')
      return
    }

    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    if (adjType === 'adjustment' && adjQuantity < 0) {
      toast.error('الكمية في حالة التعديل يجب أن تكون صفر أو أكثر')
      return
    }

    if (adjType === 'out' && selectedProduct && adjQuantity > selectedProduct.quantity) {
      toast.error(`الكمية المطلوبة (${adjQuantity}) أكبر من المخزون المتاح (${selectedProduct.quantity})`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/stock-adjustments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProductId,
          type: adjType,
          quantity: adjQuantity,
          reason: adjReason,
          reference: adjReference || null,
          userId: user.id,
          userName: user.name,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(data.message || 'تم تعديل المخزون بنجاح')
        setNewAdjOpen(false)
        fetchAdjustments()
        fetchStats()
      } else {
        toast.error(data.error || 'حدث خطأ أثناء تعديل المخزون')
      }
    } catch {
      toast.error('حدث خطأ أثناء تعديل المخزون')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardEdit className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">تعديلات المخزون</h2>
            <p className="text-sm text-muted-foreground mt-0.5">تتبع جميع تعديلات كميات المنتجات</p>
          </div>
        </div>
        <Button
          onClick={openNewAdjustmentDialog}
          className="gap-2 btn-ripple shimmer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">تسجيل تعديل</span>
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        {/* Total Today */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 card-hover stat-card-gradient stat-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي اليوم</p>
              <p className="text-2xl font-bold text-foreground mt-1 number-animate-in">
                {stats?.todayTotal ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">تعديل مسجل اليوم</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <SlidersHorizontal className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        {/* In (Additions) */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 card-hover stat-card-gradient stat-card-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إضافات</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 number-animate-in">
                {stats?.inCount ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">عملية إضافة مخزون</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <ArrowDownToLine className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Out (Subtractions) */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 card-hover stat-card-gradient stat-card-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">خصومات</p>
              <p className="text-2xl font-bold text-red-600 mt-1 number-animate-in">
                {stats?.outCount ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">عملية خصم من المخزون</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <ArrowUpFromLine className="w-5 h-5 text-red-500" />
            </div>
          </div>
        </div>

        {/* Adjustments */}
        <div className="bg-card rounded-2xl border border-border/50 p-4 card-hover stat-card-gradient" style={{ '--card-gradient': 'linear-gradient(135deg, rgba(245,158,11,0.08), transparent)' } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">تعديلات يدوية</p>
              <p className="text-2xl font-bold text-amber-600 mt-1 number-animate-in">
                {stats?.adjustmentCount ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">تعديل الكمية يدوياً</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Equal className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">تصفية التعديلات</p>
          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                <X className="w-3 h-3" />
                مسح الفلاتر
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchAdjustments}
              disabled={loading}
              className="gap-1 h-7 text-xs"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              تحديث
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث باسم المنتج..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 h-9 text-sm input-glass"
            />
          </div>

          {/* Type Filter */}
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue placeholder="النوع" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الأنواع</SelectItem>
              <SelectItem value="in">إضافة (إدخال مخزون)</SelectItem>
              <SelectItem value="out">خصم (إخراج مخزون)</SelectItem>
              <SelectItem value="adjustment">تعديل يدوي</SelectItem>
            </SelectContent>
          </Select>

          {/* Date From */}
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="pr-9 h-9 text-sm input-glass"
              placeholder="من تاريخ"
            />
          </div>

          {/* Date To */}
          <div className="relative">
            <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="pr-9 h-9 text-sm input-glass"
              placeholder="إلى تاريخ"
            />
          </div>
        </div>
      </div>

      {/* Adjustments Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading ? 'جاري التحميل...' : `${total} تعديل`}
        </p>
      </div>

      {/* Adjustments Table */}
      {loading && adjustments.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">جاري تحميل التعديلات...</p>
          </div>
        </div>
      ) : adjustments.length === 0 ? (
        <div className="flex items-center justify-center py-16 empty-state">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center empty-state-icon">
              <PackageOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground empty-state-title">لا توجد تعديلات</p>
              <p className="text-xs text-muted-foreground mt-1 empty-state-description">
                {hasActiveFilters
                  ? 'لم يتم العثور على تعديلات تطابق معايير البحث'
                  : 'لم يتم تسجيل أي تعديل على المخزون بعد'}
              </p>
            </div>
            {!hasActiveFilters && (
              <Button
                onClick={openNewAdjustmentDialog}
                variant="outline"
                size="sm"
                className="gap-2 mt-2"
              >
                <Plus className="w-4 h-4" />
                تسجيل أول تعديل
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold py-3 px-4">التاريخ</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4">المنتج</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 hidden sm:table-cell">الفئة</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 text-center">النوع</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 text-center">الكمية</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 text-center hidden md:table-cell">قبل</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 text-center hidden md:table-cell">بعد</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 hidden lg:table-cell">السبب</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 hidden lg:table-cell">المرجع</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adjustments.map((adj) => (
                  <TableRow
                    key={adj.id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="py-3 px-4">
                      <span className="text-xs text-muted-foreground block">
                        {formatShortDate(adj.createdAt)}
                      </span>
                      <span className="text-[10px] text-muted-foreground/70 block">
                        {new Date(adj.createdAt).toLocaleTimeString('ar-SA', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="text-sm text-foreground font-medium">{adj.product.name}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-xs text-muted-foreground">
                        {adj.product.category?.name || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      {getTypeBadge(adj.type)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <span className={`text-sm font-bold ${
                        adj.type === 'in' ? 'text-emerald-600' :
                        adj.type === 'out' ? 'text-red-600' :
                        'text-amber-600'
                      }`}>
                        {adj.type === 'out' ? '-' : adj.type === 'in' ? '+' : ''}
                        {adj.type === 'adjustment' ? adj.newQty : adj.quantity}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center hidden md:table-cell">
                      <span className="text-xs text-muted-foreground">{adj.previousQty}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center hidden md:table-cell">
                      <span className={`text-xs font-semibold ${
                        adj.newQty > adj.previousQty ? 'text-emerald-600' :
                        adj.newQty < adj.previousQty ? 'text-red-600' :
                        'text-muted-foreground'
                      }`}>
                        {adj.newQty}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground truncate max-w-[140px] block">
                        {adj.reason || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 hidden lg:table-cell">
                      <span className="text-xs text-muted-foreground font-mono truncate max-w-[100px] block">
                        {adj.reference || '—'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            السابق
          </Button>
          <span className="text-xs text-muted-foreground px-3">
            {page} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            التالي
          </Button>
        </div>
      )}

      {/* New Adjustment Dialog */}
      <Dialog open={newAdjOpen} onOpenChange={setNewAdjOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col glass-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ClipboardEdit className="w-5 h-5 text-primary" />
              تسجيل تعديل مخزون
            </DialogTitle>
            <DialogDescription>
              اختر المنتج ونوع التعديل والكمية
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-4 pb-4">
              {/* Select Product */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">المنتج *</Label>
                <Select value={selectedProductId} onValueChange={handleSelectProduct}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder={productsLoading ? 'جاري التحميل...' : 'اختر منتج...'} />
                  </SelectTrigger>
                  <SelectContent>
                    {products.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        لا توجد منتجات
                      </div>
                    ) : (
                      products.map((prod) => (
                        <SelectItem key={prod.id} value={prod.id}>
                          <div className="flex items-center justify-between gap-4 w-full">
                            <span className="font-medium">{prod.name}</span>
                            <span className="text-muted-foreground text-xs">
                              المخزون: {prod.quantity}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Selected Product Info */}
              {selectedProduct && (
                <div className="bg-muted/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground">{selectedProduct.name}</p>
                    <p className="text-xs text-muted-foreground">
                      الفئة: {selectedProduct.category?.name || '—'} · المخزون الحالي: <span className="font-bold text-foreground">{selectedProduct.quantity}</span>
                    </p>
                  </div>
                </div>
              )}

              {/* Adjustment Type */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">نوع التعديل *</Label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjType('in')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      adjType === 'in'
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20'
                        : 'border-border/50 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10'
                    }`}
                  >
                    <ArrowDownToLine className={`w-5 h-5 ${adjType === 'in' ? 'text-emerald-600' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-semibold ${adjType === 'in' ? 'text-emerald-700 dark:text-emerald-400' : 'text-muted-foreground'}`}>
                      إضافة
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('out')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      adjType === 'out'
                        ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                        : 'border-border/50 hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-900/10'
                    }`}
                  >
                    <ArrowUpFromLine className={`w-5 h-5 ${adjType === 'out' ? 'text-red-600' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-semibold ${adjType === 'out' ? 'text-red-700 dark:text-red-400' : 'text-muted-foreground'}`}>
                      خصم
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjType('adjustment')}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      adjType === 'adjustment'
                        ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20'
                        : 'border-border/50 hover:border-amber-300 hover:bg-amber-50/50 dark:hover:bg-amber-900/10'
                    }`}
                  >
                    <Equal className={`w-5 h-5 ${adjType === 'adjustment' ? 'text-amber-600' : 'text-muted-foreground'}`} />
                    <span className={`text-xs font-semibold ${adjType === 'adjustment' ? 'text-amber-700 dark:text-amber-400' : 'text-muted-foreground'}`}>
                      تعديل
                    </span>
                  </button>
                </div>
              </div>

              {/* Quantity */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  {adjType === 'adjustment' ? 'الكمية الجديدة (القيمة المطلقة) *' : 'الكمية *'}
                </Label>
                <Input
                  type="number"
                  min={adjType === 'adjustment' ? 0 : 1}
                  value={adjQuantity}
                  onChange={(e) => setAdjQuantity(parseInt(e.target.value) || 0)}
                  className="h-10 text-sm input-glass"
                  placeholder={adjType === 'adjustment' ? 'أدخل الكمية الجديدة...' : 'أدخل الكمية...'}
                />
                {adjType === 'out' && selectedProduct && adjQuantity > selectedProduct.quantity && (
                  <p className="text-[10px] text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    الكمية تتجاوز المخزون المتاح ({selectedProduct.quantity})
                  </p>
                )}
              </div>

              {/* Quantity Preview */}
              {selectedProduct && adjQuantity > 0 && (
                <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">المخزون الحالي</span>
                    <span className="font-medium">{selectedProduct.quantity}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">
                      {adjType === 'in' ? 'الإضافة' : adjType === 'out' ? 'الخصم' : 'القيمة الجديدة'}
                    </span>
                    <span className={`font-medium ${
                      adjType === 'in' ? 'text-emerald-600' :
                      adjType === 'out' ? 'text-red-600' :
                      'text-amber-600'
                    }`}>
                      {adjType === 'out' ? '-' : ''}{adjQuantity}
                    </span>
                  </div>
                  <div className="border-t border-border/50 pt-1 flex justify-between text-sm">
                    <span className="font-semibold">النتيجة</span>
                    <span className="font-bold text-primary">
                      {adjType === 'in'
                        ? selectedProduct.quantity + adjQuantity
                        : adjType === 'out'
                        ? Math.max(0, selectedProduct.quantity - adjQuantity)
                        : adjQuantity
                      }
                    </span>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">السبب</Label>
                <Textarea
                  placeholder="أدخل سبب التعديل..."
                  value={adjReason}
                  onChange={(e) => setAdjReason(e.target.value)}
                  className="text-sm min-h-[80px] input-glass"
                />
              </div>

              {/* Reference */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">المرجع (اختياري)</Label>
                <Input
                  placeholder="مثال: رقم الفاتورة، رقم المرتجع..."
                  value={adjReference}
                  onChange={(e) => setAdjReference(e.target.value)}
                  className="h-10 text-sm input-glass"
                />
              </div>
            </div>
          </ScrollArea>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => setNewAdjOpen(false)}
              disabled={submitting}
              className="text-sm"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmitAdjustment}
              disabled={submitting || !selectedProductId || adjQuantity <= 0}
              className="gap-2 text-sm btn-ripple shimmer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ClipboardEdit className="w-4 h-4" />
              )}
              تسجيل التعديل
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
