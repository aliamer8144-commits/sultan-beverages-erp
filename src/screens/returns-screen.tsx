'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, CURRENCY_MAP } from '@/store/app-store'
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
  RotateCcw,
  Search,
  Calendar,
  Plus,
  X,
  Loader2,
  Check,
  XCircle,
  RefreshCw,
  Filter,
  PackageOpen,
  AlertTriangle,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────────────

interface ReturnItem {
  id: string
  returnNo: string
  invoiceId: string
  invoice: { id: string; invoiceNo: string; type: string }
  productId: string
  product: { id: string; name: string }
  quantity: number
  unitPrice: number
  totalAmount: number
  reason: string
  status: string
  userId: string
  userName: string | null
  createdAt: string
  updatedAt: string
}

interface SaleInvoice {
  id: string
  invoiceNo: string
  type: string
  customer: { id: string; name: string } | null
  totalAmount: number
  items: InvoiceItemData[]
}

interface InvoiceItemData {
  id: string
  productId: string
  product: { id: string; name: string }
  quantity: number
  price: number
  total: number
}

interface ReturnStats {
  todayTotal: number
  pendingCount: number
  approvedCount: number
  todayAmount: number
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('ar-SA', {
    style: 'currency',
    currency: 'SAR',
    minimumFractionDigits: 2,
  }).format(amount)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'pending':
      return (
        <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0 text-[10px] px-2 py-0 h-5 font-semibold status-chip-warning">
          قيد المراجعة
        </Badge>
      )
    case 'approved':
      return (
        <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px] px-2 py-0 h-5 font-semibold status-chip-success">
          موافق عليه
        </Badge>
      )
    case 'rejected':
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0 text-[10px] px-2 py-0 h-5 font-semibold status-chip-danger">
          مرفوض
        </Badge>
      )
    default:
      return null
  }
}

// ── Component ──────────────────────────────────────────────────────────────

export function ReturnsScreen() {
  const user = useAppStore((s) => s.user)
  const settings = useAppStore((s) => s.settings)
  const currencySymbol = CURRENCY_MAP[settings.currency]?.symbol || 'ر.س'

  // Filters
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  // Data
  const [returns, setReturns] = useState<ReturnItem[]>([])
  const [stats, setStats] = useState<ReturnStats | null>(null)
  const [loading, setLoading] = useState(false)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const limit = 20

  // New Return Dialog
  const [newReturnOpen, setNewReturnOpen] = useState(false)
  const [saleInvoices, setSaleInvoices] = useState<SaleInvoice[]>([])
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('')
  const [selectedInvoice, setSelectedInvoice] = useState<SaleInvoice | null>(null)
  const [selectedProductId, setSelectedProductId] = useState('')
  const [selectedProductItem, setSelectedProductItem] = useState<InvoiceItemData | null>(null)
  const [returnQuantity, setReturnQuantity] = useState(1)
  const [returnReason, setReturnReason] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasActiveFilters = search.trim() || statusFilter !== 'all' || dateFrom || dateTo

  // ── Fetch Returns ─────────────────────────────────────────────────────

  const fetchReturns = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (statusFilter && statusFilter !== 'all') params.set('status', statusFilter)
      if (search.trim()) params.set('search', search.trim())
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/returns?${params.toString()}`)
      if (!res.ok) throw new Error('فشل في تحميل المرتجعات')
      const data = await res.json()
      setReturns(data.data || [])
      setTotal(data.total || 0)
      setTotalPages(data.totalPages || 0)
    } catch {
      toast.error('حدث خطأ أثناء تحميل المرتجعات')
      setReturns([])
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, search, dateFrom, dateTo])

  // ── Fetch Stats ──────────────────────────────────────────────────────

  const fetchStats = useCallback(async () => {
    try {
      // Fetch today's returns
      const today = new Date().toISOString().split('T')[0]
      const res = await fetch(`/api/returns?dateFrom=${today}&dateTo=${today}&limit=1000`)
      if (res.ok) {
        const data = await res.json()
        const todayReturns = data.data || []

        // Fetch all pending returns
        const pendingRes = await fetch('/api/returns?status=pending&limit=1000')
        const pendingData = pendingRes.ok ? await pendingRes.json() : { data: [] }

        // Fetch all approved returns
        const approvedRes = await fetch('/api/returns?status=approved&dateFrom=${today}&limit=1000')
        const approvedData = approvedRes.ok ? await approvedRes.json() : { data: [] }

        setStats({
          todayTotal: todayReturns.length,
          pendingCount: (pendingData.data || []).length,
          approvedCount: approvedData.data ? approvedData.data.filter((r: ReturnItem) => {
            const d = new Date(r.createdAt).toISOString().split('T')[0]
            return d === today
          }).length : 0,
          todayAmount: todayReturns.reduce((sum: number, r: ReturnItem) => sum + r.totalAmount, 0),
        })
      }
    } catch {
      // Silently fail for stats
    }
  }, [])

  useEffect(() => {
    fetchReturns()
    fetchStats()
  }, [fetchReturns, fetchStats])

  // ── Clear Filters ────────────────────────────────────────────────────

  const clearFilters = () => {
    setSearch('')
    setStatusFilter('all')
    setDateFrom('')
    setDateTo('')
  }

  // ── Update Return Status ─────────────────────────────────────────────

  const handleUpdateStatus = async (id: string, status: 'approved' | 'rejected') => {
    try {
      const res = await fetch('/api/returns', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success(
          status === 'approved' ? 'تم قبول المرتجع بنجاح' : 'تم رفض المرتجع'
        )
        fetchReturns()
        fetchStats()
      } else {
        toast.error(data.error || 'حدث خطأ')
      }
    } catch {
      toast.error('حدث خطأ أثناء تحديث حالة المرتجع')
    }
  }

  // ── New Return Dialog Handlers ───────────────────────────────────────

  const openNewReturnDialog = async () => {
    setNewReturnOpen(true)
    setSelectedInvoiceId('')
    setSelectedInvoice(null)
    setSelectedProductId('')
    setSelectedProductItem(null)
    setReturnQuantity(1)
    setReturnReason('')
    setSubmitting(false)

    try {
      const res = await fetch('/api/invoices?type=sale')
      if (res.ok) {
        const data = await res.json()
        setSaleInvoices(data.data || [])
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل الفواتير')
    }
  }

  const handleSelectInvoice = (invoiceId: string) => {
    setSelectedInvoiceId(invoiceId)
    setSelectedProductId('')
    setSelectedProductItem(null)
    setReturnQuantity(1)

    const invoice = saleInvoices.find((inv) => inv.id === invoiceId)
    setSelectedInvoice(invoice || null)
  }

  const handleSelectProduct = (productId: string) => {
    setSelectedProductId(productId)
    setReturnQuantity(1)

    if (selectedInvoice) {
      const item = selectedInvoice.items.find((i) => i.productId === productId)
      setSelectedProductItem(item || null)
    }
  }

  const handleSubmitReturn = async () => {
    if (!selectedInvoiceId || !selectedProductId || !returnQuantity || returnQuantity <= 0) {
      toast.error('يرجى اختيار الفاتورة والمنتج والكمية')
      return
    }

    if (!user) {
      toast.error('يرجى تسجيل الدخول أولاً')
      return
    }

    if (!selectedProductItem) return

    if (returnQuantity > selectedProductItem.quantity) {
      toast.error('الكمية المرتجعة لا يمكن أن تتجاوز كمية الفاتورة')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: selectedInvoiceId,
          productId: selectedProductId,
          quantity: returnQuantity,
          reason: returnReason,
          userId: user.id,
          userName: user.name,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('تم إنشاء المرتجع بنجاح')
        setNewReturnOpen(false)
        fetchReturns()
        fetchStats()
      } else {
        toast.error(data.error || 'حدث خطأ أثناء إنشاء المرتجع')
      }
    } catch {
      toast.error('حدث خطأ أثناء إنشاء المرتجع')
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
            <RotateCcw className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">المرتجعات</h2>
            <p className="text-sm text-muted-foreground mt-0.5">إدارة عمليات إرجاع المنتجات</p>
          </div>
        </div>
        <Button
          onClick={openNewReturnDialog}
          className="gap-2 btn-ripple shimmer"
        >
          <Plus className="w-4 h-4" />
          <span className="hidden sm:inline">إرجاع جديد</span>
        </Button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
        <div className="bg-card rounded-2xl border border-border/50 p-4 card-hover stat-card-gradient stat-card-blue">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">مرتجعات اليوم</p>
              <p className="text-2xl font-bold text-foreground mt-1 number-animate-in">
                {stats?.todayTotal ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">عملية إرجاع</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <RotateCcw className="w-5 h-5 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-4 card-hover stat-card-gradient" style={{ '--card-gradient': 'linear-gradient(135deg, rgba(245,158,11,0.08), transparent)' } as React.CSSProperties}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">قيد المراجعة</p>
              <p className="text-2xl font-bold text-amber-600 mt-1 number-animate-in">
                {stats?.pendingCount ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">مرتجع بانتظار الموافقة</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-4 card-hover stat-card-gradient stat-card-green">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">الموافق عليها</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 number-animate-in">
                {stats?.approvedCount ?? 0}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">مرتجع تمت الموافقة عليه</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Check className="w-5 h-5 text-emerald-500" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-2xl border border-border/50 p-4 card-hover stat-card-gradient stat-card-red">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي مبلغ اليوم</p>
              <p className="text-2xl font-bold text-foreground mt-1 number-animate-in">
                {stats?.todayAmount?.toFixed(2) ?? '0.00'}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{currencySymbol}</p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <span className="text-lg font-bold text-red-500">💰</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-card rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-semibold text-foreground">تصفية المرتجعات</p>
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
              onClick={() => { fetchReturns(); fetchStats() }}
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
              placeholder="بحث برقم المرتجع..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pr-9 h-9 text-sm input-glass"
            />
          </div>

          {/* Status Filter */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue placeholder="الحالة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">الكل</SelectItem>
              <SelectItem value="pending">قيد المراجعة</SelectItem>
              <SelectItem value="approved">موافق عليه</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
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

      {/* Returns Count */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground">
          {loading ? 'جاري التحميل...' : `${total} مرتجع`}
        </p>
      </div>

      {/* Returns Table */}
      {loading && returns.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <p className="text-sm text-muted-foreground">جاري تحميل المرتجعات...</p>
          </div>
        </div>
      ) : returns.length === 0 ? (
        <div className="flex items-center justify-center py-16 empty-state">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center empty-state-icon">
              <PackageOpen className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground empty-state-title">لا توجد مرتجعات</p>
              <p className="text-xs text-muted-foreground mt-1 empty-state-description">
                {hasActiveFilters
                  ? 'لم يتم العثور على مرتجعات تطابق معايير البحث'
                  : 'لم يتم تسجيل أي عملية إرجاع بعد'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/50 overflow-hidden">
          <ScrollArea className="max-h-[500px]">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead className="text-xs font-semibold py-3 px-4">رقم المرتجع</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4">رقم الفاتورة</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4">المنتج</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 text-center">الكمية</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 text-left">المبلغ</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 hidden md:table-cell">السبب</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 text-center">الحالة</TableHead>
                  <TableHead className="text-xs font-semibold py-3 px-4 text-center">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {returns.map((ret) => (
                  <TableRow
                    key={ret.id}
                    className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                  >
                    <TableCell className="py-3 px-4">
                      <span className="text-sm font-mono font-medium text-primary">{ret.returnNo}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="text-sm font-mono text-foreground">{ret.invoice.invoiceNo}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4">
                      <span className="text-sm text-foreground font-medium">{ret.product.name}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      <span className="text-sm font-semibold text-foreground">{ret.quantity}</span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-left">
                      <span className="text-sm font-bold text-foreground">
                        {formatCurrency(ret.totalAmount)}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 hidden md:table-cell">
                      <span className="text-xs text-muted-foreground truncate max-w-[120px] block">
                        {ret.reason || '—'}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      {getStatusBadge(ret.status)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center">
                      {ret.status === 'pending' && (
                        <div className="flex items-center justify-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600 hover:bg-emerald-500/10 hover:text-emerald-600 shimmer"
                            onClick={() => handleUpdateStatus(ret.id, 'approved')}
                            title="موافقة"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:bg-destructive/10 hover:text-destructive"
                            onClick={() => handleUpdateStatus(ret.id, 'rejected')}
                            title="رفض"
                          >
                            <XCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
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

      {/* New Return Dialog */}
      <Dialog open={newReturnOpen} onOpenChange={setNewReturnOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col glass-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-primary" />
              إرجاع جديد
            </DialogTitle>
            <DialogDescription>
              اختر الفاتورة والمنتج المراد إرجاعه
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-4 pb-4">
              {/* Select Invoice */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">اختر فاتورة البيع</Label>
                <Select value={selectedInvoiceId} onValueChange={handleSelectInvoice}>
                  <SelectTrigger className="w-full h-10">
                    <SelectValue placeholder="اختر فاتورة..." />
                  </SelectTrigger>
                  <SelectContent>
                    {saleInvoices.length === 0 ? (
                      <div className="p-4 text-center text-xs text-muted-foreground">
                        لا توجد فواتير بيع
                      </div>
                    ) : (
                      saleInvoices.map((inv) => (
                        <SelectItem key={inv.id} value={inv.id}>
                          <div className="flex items-center gap-2">
                            <span className="font-mono">{inv.invoiceNo}</span>
                            <span className="text-muted-foreground text-xs">
                              — {inv.customer?.name || 'عميل نقدي'}
                            </span>
                          </div>
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Items */}
              {selectedInvoice && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">عناصر الفاتورة</Label>
                  <div className="rounded-lg border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/70 hover:bg-muted/70">
                          <TableHead className="text-xs font-semibold py-2 px-3">المنتج</TableHead>
                          <TableHead className="text-xs font-semibold py-2 px-3 text-center">الكمية</TableHead>
                          <TableHead className="text-xs font-semibold py-2 px-3 text-center">السعر</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedInvoice.items.map((item) => (
                          <TableRow
                            key={item.id}
                            className={`cursor-pointer hover:bg-primary/5 transition-colors ${
                              selectedProductId === item.productId ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => handleSelectProduct(item.productId)}
                          >
                            <TableCell className="text-xs py-2 px-3 font-medium">
                              {item.product.name}
                            </TableCell>
                            <TableCell className="text-xs py-2 px-3 text-center">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-xs py-2 px-3 text-center">
                              {formatCurrency(item.price)}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Product Quantity */}
              {selectedProductItem && (
                <div className="space-y-1.5">
                  <Label className="text-sm font-medium">
                    كمية الإرجاع (الحد الأقصى: {selectedProductItem.quantity})
                  </Label>
                  <Input
                    type="number"
                    min={1}
                    max={selectedProductItem.quantity}
                    value={returnQuantity}
                    onChange={(e) => setReturnQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="h-10 text-sm input-glass"
                  />
                  {returnQuantity > selectedProductItem.quantity && (
                    <p className="text-[10px] text-destructive">الكمية تتجاوز الحد المسموح</p>
                  )}
                  <div className="bg-muted/50 rounded-lg p-3 mt-2 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">سعر الوحدة</span>
                      <span className="font-medium">{formatCurrency(selectedProductItem.price)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">الكمية</span>
                      <span className="font-medium">{returnQuantity}</span>
                    </div>
                    <div className="border-t border-border/50 pt-1 flex justify-between text-sm">
                      <span className="font-semibold">الإجمالي</span>
                      <span className="font-bold text-primary">
                        {formatCurrency(selectedProductItem.price * returnQuantity)}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">سبب الإرجاع (اختياري)</Label>
                <Textarea
                  placeholder="أدخل سبب الإرجاع..."
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  className="text-sm min-h-[80px] input-glass"
                />
              </div>
            </div>
          </ScrollArea>

          {/* Submit Button */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50">
            <Button
              variant="outline"
              onClick={() => setNewReturnOpen(false)}
              disabled={submitting}
              className="text-sm"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmitReturn}
              disabled={submitting || !selectedInvoiceId || !selectedProductId}
              className="gap-2 text-sm btn-ripple shimmer"
            >
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RotateCcw className="w-4 h-4" />
              )}
              تأكيد الإرجاع
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
