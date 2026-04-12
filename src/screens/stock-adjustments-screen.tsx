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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'
import { z } from 'zod'
import { useFormValidation } from '@/hooks/use-form-validation'
import { createStockAdjustmentSchema } from '@/lib/validations'
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
  Download,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  User,
  FileText,
} from 'lucide-react'
import { exportToCSV } from '@/lib/export-csv'
import { useApi } from '@/hooks/use-api'
import { EmptyState } from '@/components/empty-state'
import { formatDate, formatTime, formatShortDate, formatDateFull } from '@/lib/date-utils'
import type { StockAdjustmentItem, ProductItem, AdjustmentStats, StockAdjustmentsResponse } from './stock-adjustments/types'
import { typeConfig } from './stock-adjustments/types'

// ─── Inline schema for create adjustment dialog ──────────────
const createAdjustmentFormSchema = createStockAdjustmentSchema.extend({
  quantity: z.coerce.number().int().positive('الكمية مطلوبة'),
})

// ── Helpers ────────────────────────────────────────────────────────────────
// formatDate, formatTime, formatShortDate imported from @/lib/date-utils
// formatDateFull replaces local getDateKey

// Type badge configuration imported from ./stock-adjustments/types

// ── Component ──────────────────────────────────────────────────────────────

export function StockAdjustmentsScreen() {
  const user = useAppStore((s) => s.user)
  const { get, post } = useApi()

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
  const limit = 25

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

  // ─── Form Validation ──────────────────────────────────────────
  const adjValidation = useFormValidation({ schema: createAdjustmentFormSchema })

  const hasActiveFilters = search.trim() || typeFilter !== 'all' || dateFrom || dateTo

  // ── Fetch Adjustments ─────────────────────────────────────────────────

  const fetchAdjustments = useCallback(async () => {
    setLoading(true)
    try {
      const result = await get<StockAdjustmentsResponse>('/api/stock-adjustments', {
        page,
        limit,
        type: typeFilter !== 'all' ? typeFilter : undefined,
        search: search.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }, { showErrorToast: false })

      if (result) {
        setAdjustments(result.adjustments || [])
        setTotal(result.pagination.total)
        setTotalPages(result.pagination.totalPages)
        if (result.stats) {
          setStats(result.stats)
        }
      } else {
        toast.error('حدث خطأ أثناء تحميل تعديلات المخزون')
        setAdjustments([])
      }
    } finally {
      setLoading(false)
    }
  }, [page, typeFilter, search, dateFrom, dateTo, get])

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

  // ── Export CSV ───────────────────────────────────────────────────────

  const handleExportCSV = () => {
    if (adjustments.length === 0) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }

    const csvData = adjustments.map((adj) => ({
      'المنتج': adj.product.name,
      'التصنيف': adj.product.category?.name || '—',
      'النوع': typeConfig[adj.type]?.label || adj.type,
      'الكمية': adj.quantity,
      'قبل': adj.previousQty,
      'بعد': adj.newQty,
      'التغيير': adj.newQty - adj.previousQty,
      'السبب': adj.reason || '—',
      'المستخدم': adj.userName || adj.userId || '—',
      'المرجع': adj.reference || '—',
      'التاريخ': new Date(adj.createdAt).toLocaleString('ar-SA'),
    }))

    exportToCSV(csvData, `stock-movements-${formatShortDate(new Date().toISOString())}`)
    toast.success('تم تصدير البيانات بنجاح')
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
    adjValidation.clearAllErrors()

    setProductsLoading(true)
    try {
      const result = await get<ProductItem[]>('/api/products', { limit: 500 }, { showErrorToast: false })
      if (result) {
        setProducts(result)
      }
    } finally {
      setProductsLoading(false)
    }
  }

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId)
    const product = products.find((p) => p.id === productId)
    setSelectedProduct(product || null)
    setAdjQuantity(1)
    adjValidation.clearFieldError('productId')
    adjValidation.clearFieldError('quantity')
  }

  const handleSubmitAdjustment = async () => {
    // Schema validation (productId, type, quantity)
    if (!adjValidation.validate({ productId: selectedProductId, type: adjType, quantity: adjQuantity })) return

    // Keep !user as toast.error (non-field error)
    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    // Cross-field: adjustment type quantity check
    if (adjType === 'adjustment' && adjQuantity < 0) {
      adjValidation.setErrorMap({ quantity: 'الكمية في حالة التعديل يجب أن تكون صفر أو أكثر' })
      return
    }

    // Cross-field: stock availability check
    if (adjType === 'out' && selectedProduct && adjQuantity > selectedProduct.quantity) {
      adjValidation.setErrorMap({ quantity: `الكمية المطلوبة (${adjQuantity}) أكبر من المخزون المتاح (${selectedProduct.quantity})` })
      return
    }

    setSubmitting(true)
    try {
      const result = await post('/api/stock-adjustments', {
        productId: selectedProductId,
        type: adjType,
        quantity: adjQuantity,
        reason: adjReason,
        reference: adjReference || null,
        referenceType: 'manual',
        userId: user.id,
        userName: user.name,
      }, { showSuccessToast: true, successMessage: 'تم إنشاء التعديل بنجاح' })

      if (result) {
        setNewAdjOpen(false)
        adjValidation.clearAllErrors()
         
        fetchAdjustments()
      }
    } finally {
      setSubmitting(false)
    }
  }

  // ── Group adjustments by date ─────────────────────────────────────────

  const groupedAdjustments: Record<string, StockAdjustmentItem[]> = {}
  for (const adj of adjustments) {
    const dateKey = formatDateFull(adj.createdAt)
    if (!groupedAdjustments[dateKey]) {
      groupedAdjustments[dateKey] = []
    }
    groupedAdjustments[dateKey].push(adj)
  }

  // ── Loading Skeleton ─────────────────────────────────────────────────

  const renderSkeleton = () => (
    <div className="space-y-6">
      {/* Stats skeleton */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 rounded-2xl skeleton-shimmer" />
        ))}
      </div>
      {/* Timeline skeleton */}
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="space-y-3">
            <div className="h-8 w-64 rounded-lg skeleton-shimmer" />
            {[1, 2, 3].map((j) => (
              <div key={j} className="h-28 rounded-xl skeleton-shimmer" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  // ── Timeline Entry ───────────────────────────────────────────────────

  const renderTimelineEntry = (adj: StockAdjustmentItem) => {
    const config = typeConfig[adj.type] || typeConfig.adjustment
    const Icon = config.icon
    const change = adj.newQty - adj.previousQty
    const isIncrease = change > 0
    const isDecrease = change < 0

    return (
      <div
        key={adj.id}
        className={`relative flex gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border border-border/50 bg-card transition-all duration-200 hover:shadow-md card-hover`}
      >
        {/* Icon & connector line */}
        <div className="flex flex-col items-center flex-shrink-0">
          <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
            config.bgClass
          }`}>
            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${config.colorClass}`} />
          </div>
          <div className={`w-0.5 flex-1 mt-2 rounded-full ${
            isIncrease ? 'bg-emerald-200 dark:bg-emerald-800/50' :
            isDecrease ? 'bg-red-200 dark:bg-red-800/50' :
            'bg-amber-200 dark:bg-amber-800/50'
          }`} />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h4 className="text-sm font-bold text-foreground truncate">
                  {adj.product.name}
                </h4>
                <Badge className={`${config.badgeClass} text-[10px] px-2 py-0 h-5 font-semibold`}>
                  {config.label}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 text-[10px] text-muted-foreground">
              <Clock className="w-3 h-3" />
              {formatTime(adj.createdAt)}
            </div>
          </div>

          {/* Stock change info */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap text-xs mb-2">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-lg px-2 py-1">
              <span className="text-muted-foreground">قبل</span>
              <span className="font-semibold text-foreground tabular-nums">{adj.previousQty}</span>
            </div>

            <ArrowRight className={`w-3.5 h-3.5 ${
              isIncrease ? 'text-emerald-500' : isDecrease ? 'text-red-500' : 'text-amber-500'
            }`} />

            <div className={`flex items-center gap-1.5 rounded-lg px-2 py-1 ${
              isIncrease ? 'bg-emerald-50 dark:bg-emerald-900/20' :
              isDecrease ? 'bg-red-50 dark:bg-red-900/20' :
              'bg-amber-50 dark:bg-amber-900/20'
            }`}>
              <span className={`font-semibold tabular-nums ${
                isIncrease ? 'text-emerald-600 dark:text-emerald-400' :
                isDecrease ? 'text-red-600 dark:text-red-400' :
                'text-amber-600 dark:text-amber-400'
              }`}>
                {adj.newQty}
              </span>
            </div>

            {/* Change indicator */}
            {change !== 0 && (
              <div className={`flex items-center gap-0.5 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                isIncrease
                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                  : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
              }`}>
                {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                {isIncrease ? '+' : ''}{change}
              </div>
            )}
          </div>

          {/* Meta info row */}
          <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
            {adj.reason && (
              <div className="flex items-center gap-1">
                <FileText className="w-3 h-3" />
                <span className="truncate max-w-[200px]">{adj.reason}</span>
              </div>
            )}
            {adj.reference && (
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <span className="opacity-50">مرجع:</span>
                {adj.reference}
              </div>
            )}
            {adj.userName && (
              <div className="flex items-center gap-1">
                <User className="w-3 h-3" />
                <span>{adj.userName}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Render ───────────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-5 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <ClipboardEdit className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">حركة المخزون</h2>
            <p className="text-sm text-muted-foreground mt-0.5">تتبع جميع حركات المنتجات والتعديلات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={loading || adjustments.length === 0}
            className="gap-1.5 text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">تصدير CSV</span>
          </Button>
          <Button
            onClick={openNewAdjustmentDialog}
            className="gap-2 btn-ripple shimmer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">تسجيل تعديل</span>
          </Button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 stagger-children">
        {/* Total Today */}
        <div className="bg-card rounded-2xl border border-border/50 p-3 sm:p-4 card-hover stat-card-gradient stat-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">إجمالي اليوم</p>
              <p className="text-xl sm:text-2xl font-bold text-foreground mt-1 number-animate-in tabular-nums">
                {stats?.todayTotal ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">حركة مسجلة</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <SlidersHorizontal className="w-4 h-4 sm:w-5 sm:h-5 text-primary" />
            </div>
          </div>
        </div>

        {/* Total Increases */}
        <div className="bg-card rounded-2xl border border-border/50 p-3 sm:p-4 card-hover stat-card-gradient stat-card-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">الإضافات</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-600 mt-1 number-animate-in tabular-nums">
                +{stats?.totalIncrease ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">وحدة واردة</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        {/* Total Decreases */}
        <div className="bg-card rounded-2xl border border-border/50 p-3 sm:p-4 card-hover stat-card-gradient stat-card-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">الخصومات</p>
              <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1 number-animate-in tabular-nums">
                -{stats?.totalDecrease ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">وحدة صادرة</p>
            </div>
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
            </div>
          </div>
        </div>

        {/* Net Change */}
        <div className="bg-card rounded-2xl border border-border/50 p-3 sm:p-4 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] sm:text-xs text-muted-foreground">صافي التغيير</p>
              <p className={`text-xl sm:text-2xl font-bold mt-1 number-animate-in tabular-nums ${
                (stats?.netChange ?? 0) >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}>
                {(stats?.netChange ?? 0) >= 0 ? '+' : ''}{stats?.netChange ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">التغير الصافي</p>
            </div>
            <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center ${
              (stats?.netChange ?? 0) >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'
            }`}>
              {(stats?.netChange ?? 0) >= 0
                ? <TrendingUp className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-500" />
                : <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-red-500" />
              }
            </div>
          </div>
        </div>

        {/* Quick type breakdown */}
        <div className="bg-card rounded-2xl border border-border/50 p-3 sm:p-4 card-hover col-span-2 lg:col-span-1">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-2">تفصيل الحركات</p>
          <div className="flex flex-wrap gap-1.5">
            {[
              { label: 'إضافة', count: stats?.inCount ?? 0, color: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30' },
              { label: 'خصم', count: stats?.outCount ?? 0, color: 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30' },
              { label: 'بيع', count: stats?.saleCount ?? 0, color: 'text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30' },
              { label: 'شراء', count: stats?.purchaseCount ?? 0, color: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-900/30' },
              { label: 'إرجاع', count: stats?.returnCount ?? 0, color: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30' },
              { label: 'تعديل', count: stats?.adjustmentCount ?? 0, color: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30' },
            ].map((item) => (
              <Badge key={item.label} className={`${item.color} border-0 text-[10px] px-2 py-0 h-5 font-semibold`}>
                {item.label}: {item.count}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">تصفية الحركات</p>
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
              <SelectItem value="sale">بيع (POS)</SelectItem>
              <SelectItem value="purchase">شراء (مشتريات)</SelectItem>
              <SelectItem value="return">إرجاع</SelectItem>
              <SelectItem value="in">إضافة يدوية</SelectItem>
              <SelectItem value="out">خصم يدوي</SelectItem>
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
          {loading ? 'جاري التحميل...' : `${total} حركة مسجلة`}
        </p>
      </div>

      {/* Timeline View */}
      {loading && adjustments.length === 0 ? (
        renderSkeleton()
      ) : adjustments.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="لا توجد حركات"
          description={
            hasActiveFilters
              ? 'لم يتم العثور على حركات تطابق معايير البحث'
              : 'لم يتم تسجيل أي حركة على المخزون بعد'
          }
          action={
            !hasActiveFilters ? (
              <Button
                onClick={openNewAdjustmentDialog}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                تسجيل أول حركة
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAdjustments).map(([dateLabel, items]) => (
            <div key={dateLabel}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex items-center gap-2 bg-muted/50 rounded-lg px-3 py-1.5">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-semibold text-foreground">{dateLabel}</span>
                </div>
                <div className="flex-1 section-divider" />
                <Badge variant="secondary" className="text-[10px] font-medium">
                  {items.length} حركة
                </Badge>
              </div>

              {/* Timeline entries */}
              <div className="space-y-2">
                {items.map(renderTimelineEntry)}
              </div>
            </div>
          ))}
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
          <div className="flex items-center gap-1">
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let pageNum: number
              if (totalPages <= 5) {
                pageNum = i + 1
              } else if (page <= 3) {
                pageNum = i + 1
              } else if (page >= totalPages - 2) {
                pageNum = totalPages - 4 + i
              } else {
                pageNum = page - 2 + i
              }
              return (
                <Button
                  key={pageNum}
                  variant={page === pageNum ? 'default' : 'outline'}
                  size="sm"
                  className="h-8 w-8 text-xs p-0"
                  onClick={() => setPage(pageNum)}
                >
                  {pageNum}
                </Button>
              )
            })}
          </div>
          <span className="text-xs text-muted-foreground px-2">
            / {totalPages}
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
      <Dialog open={newAdjOpen} onOpenChange={(open) => { setNewAdjOpen(open); if (!open) adjValidation.clearAllErrors() }}>
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
                  <SelectTrigger className={`w-full h-10 ${adjValidation.errors.productId ? 'border-destructive' : ''}`}>
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
                {adjValidation.errors.productId && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {adjValidation.errors.productId}
                  </p>
                )}
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
                  onChange={(e) => { setAdjQuantity(parseInt(e.target.value) || 0); adjValidation.clearFieldError('quantity') }}
                  className={`h-10 text-sm input-glass ${adjValidation.errors.quantity ? 'border-destructive' : ''}`}
                  placeholder={adjType === 'adjustment' ? 'أدخل الكمية الجديدة...' : 'أدخل الكمية...'}
                />
                {adjValidation.errors.quantity && (
                  <p className="text-sm text-destructive flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    {adjValidation.errors.quantity}
                  </p>
                )}
                {adjType === 'out' && selectedProduct && adjQuantity > selectedProduct.quantity && !adjValidation.errors.quantity && (
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
