'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { toast } from 'sonner'
import { useAppStore } from '@/store/app-store'
import { useCurrency } from '@/hooks/use-currency'
import { useApi } from '@/hooks/use-api'
import { Search, FileText, Printer, ChevronDown, ChevronUp, Calendar, Eye, Loader2, Filter, X, Download, RotateCcw } from 'lucide-react'
import { Pagination } from '@/components/empty-state'
import { exportToCSV } from '@/lib/export-csv'
import { formatShortDate } from '@/lib/date-utils'
import type { Invoice } from './invoices/types'
import { generateInvoicePrintHtml } from './invoices/print-invoice'
import { InvoiceDetailDialog } from './invoices/invoice-detail-dialog'
import { ReturnDialog } from './invoices/return-dialog'

// ── Component ──────────────────────────────────────────────────────────────

export function InvoicesScreen() {
  const [activeTab, setActiveTab] = useState<'sale' | 'purchase'>('sale')
  const settings = useAppStore((s) => s.settings)
  const { formatCurrency, formatDual } = useCurrency()
  const { get } = useApi()

  // Filters
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Data
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Detail dialog
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Return dialog
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnInvoice, setReturnInvoice] = useState<Invoice | null>(null)

  // ── Debounce search ──────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  // ── Fetch Invoices ─────────────────────────────────────────────────────

  const fetchInvoices = useCallback(async (p = 1) => {
    setLoading(true)
    try {
      const result = await get<{ invoices: Invoice[]; total: number; page: number; totalPages: number }>('/api/invoices', {
        type: activeTab,
        search: debouncedSearch.trim() || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        page: p,
        limit: 20,
      }, { showErrorToast: false })
      if (result) {
        setInvoices(result.invoices)
        setTotal(result.total)
        setPage(result.page)
        setTotalPages(result.totalPages)
      } else {
        setInvoices([])
        setTotal(0)
        setTotalPages(1)
      }
    } finally {
      setLoading(false)
    }
  }, [activeTab, debouncedSearch, dateFrom, dateTo, get])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
    fetchInvoices(1)
  }, [activeTab, debouncedSearch, dateFrom, dateTo])

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return
    fetchInvoices(p)
  }

  // ── Handlers ───────────────────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const openDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setDetailOpen(true)
  }

  const openReturnDialog = (invoice: Invoice) => {
    setReturnInvoice(invoice)
    setReturnOpen(true)
  }

  const clearFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
  }

  // ── Print ──────────────────────────────────────────────────────────────
  const handlePrint = (invoice: Invoice) => {
    const html = generateInvoicePrintHtml(invoice, settings)
    const win = window.open('', '_blank')
    if (win) {
      win.document.write(html)
      win.document.close()
      win.print()
    } else {
      toast.error('لم يتم فتح نافذة الطباعة')
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────

  const hasActiveFilters = search.trim() || dateFrom || dateTo

  return (
    <div className="h-full flex flex-col animate-fade-in-up">
      {/* Header */}
      <div className="px-4 md:px-6 pt-4 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-foreground heading-decoration">أرشيف الفواتير</h2>
              <p className="text-xs text-muted-foreground">عرض وإدارة جميع الفواتير</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const exportData = invoices.map((inv) => ({
                  'رقم الفاتورة': inv.invoiceNo,
                  'النوع': inv.type === 'sale' ? 'بيع' : 'شراء',
                  'العميل/المورد': inv.type === 'sale'
                    ? inv.customer?.name || 'عميل نقدي'
                    : inv.supplier?.name || 'مورد',
                  'الإجمالي': inv.totalAmount,
                  'الخصم': inv.discount,
                  'المدفوع': inv.paidAmount,
                  'التاريخ': formatShortDate(inv.createdAt),
                }))
                exportToCSV(exportData, `فواتير-${activeTab === 'sale' ? 'المبيعات' : 'المشتريات'}`)
              }}
              disabled={invoices.length === 0}
              className="gap-2 btn-ripple"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">تصدير CSV</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="gap-2"
            >
              <Filter className="w-4 h-4" />
              <span className="hidden sm:inline">تصفية</span>
              {hasActiveFilters && (
                <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  !
                </Badge>
              )}
            </Button>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'sale' | 'purchase')}>
          <TabsList className="w-full grid grid-cols-2">
            <TabsTrigger value="sale" className="gap-2 text-sm">
              <FileText className="w-4 h-4" />
              فواتير المبيعات
            </TabsTrigger>
            <TabsTrigger value="purchase" className="gap-2 text-sm">
              <FileText className="w-4 h-4" />
              فواتير المشتريات
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <div className="px-4 md:px-6 pb-3 flex-shrink-0">
          <div className="bg-muted/50 rounded-xl p-4 border border-border/50 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-foreground">خيارات التصفية</p>
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters} className="h-7 text-xs gap-1 text-destructive hover:text-destructive">
                  <X className="w-3 h-3" />
                  مسح الكل
                </Button>
              )}
            </div>

            {/* Search */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">بحث برقم الفاتورة</Label>
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="أدخل رقم الفاتورة..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pr-9 h-9 text-sm"
                />
              </div>
            </div>

            {/* Date range */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  من تاريخ
                </Label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  إلى تاريخ
                </Label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Count Badge */}
      <div className="px-4 md:px-6 pb-2 flex-shrink-0">
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            {loading ? 'جاري التحميل...' : `${total} فاتورة`}
          </p>
        </div>
      </div>

      {/* Invoice List */}
      <div className="flex-1 overflow-hidden">
        {loading ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">جاري تحميل الفواتير...</p>
            </div>
          </div>
        ) : invoices.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-center px-4">
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
                <FileText className="w-8 h-8 text-muted-foreground/50" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">لا توجد فواتير</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasActiveFilters
                    ? 'لم يتم العثور على فواتير تطابق معايير البحث'
                    : `لا توجد فواتير ${activeTab === 'sale' ? 'بيع' : 'شراء'} بعد`}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <ScrollArea className="h-full px-4 md:px-6 pb-4">
            <div className="space-y-2 stagger-children">
              {invoices.map((invoice) => {
                const isExpanded = expandedId === invoice.id
                const partyName =
                  invoice.type === 'sale'
                    ? invoice.customer?.name || 'عميل نقدي'
                    : invoice.supplier?.name || 'مورد'
                const remaining =
                  invoice.totalAmount - invoice.discount - invoice.paidAmount

                return (
                  <div
                    key={invoice.id}
                    className="bg-card border border-border/60 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-200 card-hover"
                  >
                    {/* Main Row */}
                    <div className="flex items-center gap-3 p-3 md:p-4">
                      {/* Invoice Number & Type */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-bold text-foreground truncate">
                            {invoice.invoiceNo}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-2 py-0 h-5 font-semibold flex-shrink-0 ${
                              invoice.type === 'sale'
                                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                            }`}
                          >
                            {invoice.type === 'sale' ? 'بيع' : 'شراء'}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatShortDate(invoice.createdAt)}
                          </span>
                          <span className="truncate">{partyName}</span>
                        </div>
                      </div>

                      {/* Amounts */}
                      <div className="flex items-center gap-4 flex-shrink-0">
                        <div className="text-left hidden sm:block">
                          <p className="text-[10px] text-muted-foreground">الإجمالي</p>
                          <p className="text-sm font-bold text-foreground tabular-nums-enhanced">
                            {formatDual(invoice.totalAmount).display}
                          </p>
                        </div>
                        <div className="text-left hidden md:block">
                          <p className="text-[10px] text-muted-foreground">الخصم</p>
                          <p className="text-sm font-semibold text-orange-600 tabular-nums-enhanced">
                            {invoice.discount > 0 ? `-${formatDual(invoice.discount).display}` : '—'}
                          </p>
                        </div>
                        <div className="text-left hidden md:block">
                          <p className="text-[10px] text-muted-foreground">المدفوع</p>
                          <p className="text-sm font-semibold text-emerald-600 tabular-nums-enhanced">
                            {formatDual(invoice.paidAmount).display}
                          </p>
                        </div>
                        <div className={`text-left hidden lg:block ${remaining <= 0 ? 'status-chip-success' : invoice.paidAmount > 0 ? 'status-chip-warning' : 'status-chip-danger'}`}>
                          <p className="text-[10px] text-muted-foreground">المتبقي</p>
                          <p className={`text-sm font-semibold tabular-nums-enhanced ${remaining > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {remaining > 0 ? formatDual(remaining).display : '✓'}
                          </p>
                        </div>

                        {/* Mobile total */}
                        <div className="text-left sm:hidden">
                          <p className="text-xs font-bold text-foreground tabular-nums-enhanced">
                            {formatDual(invoice.totalAmount).display}
                          </p>
                          {remaining > 0 && (
                            <p className="text-[10px] text-destructive">متبقي {formatDual(remaining).display}</p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {invoice.type === 'sale' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-amber-600 hover:bg-amber-500/10 hover:text-amber-600"
                              onClick={() => openReturnDialog(invoice)}
                              title="إرجاع"
                              aria-label="إرجاع"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => openDetail(invoice)}
                            title="عرض التفاصيل"
                            aria-label="عرض التفاصيل"
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                            onClick={() => handlePrint(invoice)}
                            title="طباعة"
                            aria-label="طباعة"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleExpand(invoice.id)}
                            title="تفاصيل العناصر"
                            aria-label="تفاصيل العناصر"
                          >
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Expanded Items */}
                    {isExpanded && (
                      <div className="border-t border-border/50">
                        <div className="p-3 md:p-4 bg-muted/30">
                          <p className="text-xs font-semibold text-muted-foreground mb-2">
                            تفاصيل العناصر ({invoice.items.length})
                          </p>
                          <div className="rounded-lg overflow-hidden border border-border/50">
                            <Table>
                              <TableHeader>
                                <TableRow className="bg-muted/70 hover:bg-muted/70">
                                  <TableHead className="text-xs font-semibold text-center py-2 px-3">
                                    المنتج
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-center py-2 px-3">
                                    الكمية
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-center py-2 px-3">
                                    السعر
                                  </TableHead>
                                  <TableHead className="text-xs font-semibold text-center py-2 px-3">
                                    الإجمالي
                                  </TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {invoice.items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell className="text-xs py-2 px-3 text-right font-medium">
                                      {item.product.name}
                                    </TableCell>
                                    <TableCell className="text-xs py-2 px-3 text-center">
                                      {item.quantity}
                                    </TableCell>
                                    <TableCell className="text-xs py-2 px-3 text-center">
                                      {formatCurrency(item.price)}
                                    </TableCell>
                                    <TableCell className="text-xs py-2 px-3 text-center font-semibold">
                                      {formatCurrency(item.total)}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        )}
      </div>

      {/* Pagination Controls */}
      <div className="px-4 md:px-6 py-3 flex-shrink-0">
        <Pagination page={page} totalPages={totalPages} total={total} onPageChange={goToPage} />
      </div>

      {/* ── Extracted Dialogs ── */}
      <InvoiceDetailDialog
        open={detailOpen}
        onOpenChange={setDetailOpen}
        invoice={selectedInvoice}
      />

      <ReturnDialog
        open={returnOpen}
        onOpenChange={setReturnOpen}
        invoice={returnInvoice}
        onSuccess={fetchInvoices}
      />
    </div>
  )
}
