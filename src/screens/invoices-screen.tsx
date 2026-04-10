'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAppStore, CURRENCY_MAP } from '@/store/app-store'
import { useCurrency } from '@/hooks/use-currency'
import { formatWithSettings } from '@/lib/currency'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Search, FileText, Printer, ChevronDown, ChevronUp, Calendar, Eye, Loader2, Filter, X, Download, RotateCcw } from 'lucide-react'
import { exportToCSV } from '@/lib/export-csv'

// ── Types ──────────────────────────────────────────────────────────────────

interface InvoiceItem {
  id: string
  productId: string
  product: { id: string; name: string }
  quantity: number
  price: number
  total: number
}

interface Invoice {
  id: string
  invoiceNo: string
  type: 'sale' | 'purchase'
  customerId: string | null
  customer: { id: string; name: string } | null
  supplierId: string | null
  supplier: { id: string; name: string } | null
  totalAmount: number
  discount: number
  paidAmount: number
  userId: string
  user: { id: string; name: string }
  items: InvoiceItem[]
  createdAt: string
}

// ── Helpers ────────────────────────────────────────────────────────────────

// formatCurrency is provided by useCurrency hook (client component)
// formatWithSettings is used in print templates (non-react context)
const printFormatCurrency = formatWithSettings

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

function formatTime(dateStr: string): string {
  return new Date(dateStr).toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

// ── Component ──────────────────────────────────────────────────────────────

export function InvoicesScreen() {
  const [activeTab, setActiveTab] = useState<'sale' | 'purchase'>('sale')
  const settings = useAppStore((s) => s.settings)
  const { formatCurrency, formatDual, isDualActive } = useCurrency()

  // Filters
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Data
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(false)

  // Expanded rows
  const [expandedId, setExpandedId] = useState<string | null>(null)

  // Detail dialog
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)

  // Return dialog
  const [returnOpen, setReturnOpen] = useState(false)
  const [returnInvoice, setReturnInvoice] = useState<Invoice | null>(null)
  const [returnProductId, setReturnProductId] = useState('')
  const [returnProductItem, setReturnProductItem] = useState<InvoiceItem | null>(null)
  const [returnQuantity, setReturnQuantity] = useState(1)
  const [returnReason, setReturnReason] = useState('')
  const [returnSubmitting, setReturnSubmitting] = useState(false)

  // ── Fetch Invoices ─────────────────────────────────────────────────────

  const fetchInvoices = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('type', activeTab)
      if (search.trim()) params.set('search', search.trim())
      if (dateFrom) params.set('dateFrom', dateFrom)
      if (dateTo) params.set('dateTo', dateTo)

      const res = await fetch(`/api/invoices?${params.toString()}`)
      if (!res.ok) throw new Error('فشل في تحميل الفواتير')
      const data = await res.json()
      setInvoices(data.data || [])
    } catch {
      toast.error('حدث خطأ أثناء تحميل الفواتير')
      setInvoices([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, search, dateFrom, dateTo])

  useEffect(() => {
    fetchInvoices()
  }, [fetchInvoices])

  // ── Handlers ───────────────────────────────────────────────────────────

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id))
  }

  const openDetail = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setDetailOpen(true)
  }

  // Return dialog handlers
  const openReturnDialog = (invoice: Invoice) => {
    setReturnInvoice(invoice)
    setReturnProductId('')
    setReturnProductItem(null)
    setReturnQuantity(1)
    setReturnReason('')
    setReturnSubmitting(false)
    setReturnOpen(true)
  }

  const handleReturnProductSelect = (productId: string) => {
    setReturnProductId(productId)
    setReturnQuantity(1)
    if (returnInvoice) {
      const item = returnInvoice.items.find((i) => i.productId === productId)
      setReturnProductItem(item || null)
    }
  }

  const handleSubmitReturn = async () => {
    if (!returnInvoice || !returnProductId || !returnQuantity || returnQuantity <= 0) {
      toast.error('يرجى اختيار المنتج والكمية')
      return
    }
    if (!returnProductItem || returnQuantity > returnProductItem.quantity) {
      toast.error('الكمية غير صالحة')
      return
    }
    const user = useAppStore.getState().user
    if (!user) {
      toast.error('يرجى تسجيل الدخول')
      return
    }

    setReturnSubmitting(true)
    try {
      const res = await fetch('/api/returns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId: returnInvoice.id,
          productId: returnProductId,
          quantity: returnQuantity,
          reason: returnReason,
          userId: user.id,
          userName: user.name,
        }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success('تم إنشاء المرتجع بنجاح')
        setReturnOpen(false)
      } else {
        toast.error(data.error || 'حدث خطأ أثناء إنشاء المرتجع')
      }
    } catch {
      toast.error('حدث خطأ أثناء إنشاء المرتجع')
    } finally {
      setReturnSubmitting(false)
    }
  }

  const clearFilters = () => {
    setSearch('')
    setDateFrom('')
    setDateTo('')
  }

  // ── Enhanced Print with Store Settings ─────────────────────────────────
  const handlePrint = (invoice: Invoice) => {
    const partyName =
      invoice.type === 'sale'
        ? invoice.customer?.name || 'عميل نقدي'
        : invoice.supplier?.name || 'مورد'
    const partyLabel = invoice.type === 'sale' ? 'العميل' : 'المورد'
    const typeLabel = invoice.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'

    const storeName = settings.storeName || 'السلطان للمشروبات'
    const storePhone = settings.storePhone || ''
    const storeAddress = settings.storeAddress || ''
    const taxNumber = settings.taxNumber || ''
    const receiptHeader = settings.receiptHeaderText || ''
    const receiptFooter = settings.receiptFooterText || 'شكراً لتعاملكم معنا'
    const currencySymbol = CURRENCY_MAP[settings.currency]?.symbol || 'ر.س'

    const itemsRows = invoice.items
      .map(
        (item, i) => `
        <tr>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;">${i + 1}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:right;font-size:12px;">${item.product.name}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;">${item.quantity}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;">${printFormatCurrency(item.price)}</td>
          <td style="border:1px solid #ddd;padding:8px;text-align:center;font-size:12px;font-weight:600;">${printFormatCurrency(item.total)}</td>
        </tr>`
      )
      .join('')

    const remaining = invoice.totalAmount - invoice.discount - invoice.paidAmount
    const totalItems = invoice.items.reduce((sum, item) => sum + item.quantity, 0)

    const printContent = `
    <html dir="rtl">
    <head>
      <title>فاتورة ${invoice.invoiceNo}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@300;400;500;600;700&display=swap');
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Noto Sans Arabic', 'Segoe UI', Tahoma, Arial, sans-serif;
          padding: 20px;
          max-width: 80mm;
          margin: 0 auto;
          color: #1a1a2e;
          background: #fff;
          font-size: 12px;
          line-height: 1.5;
        }
        .receipt {
          border: 1px solid #e0e0e0;
          border-radius: 8px;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0,0,0,0.08);
        }
        .header {
          text-align: center;
          background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
          color: white;
          padding: 20px 16px 16px;
          position: relative;
        }
        .header::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 16px;
          height: 16px;
          background: #1a1a2e;
          clip-path: polygon(0 0, 100% 0, 50% 100%);
        }
        .store-name {
          font-size: 20px;
          font-weight: 700;
          margin-bottom: 4px;
          letter-spacing: 0.5px;
        }
        .store-subtitle {
          font-size: 10px;
          opacity: 0.7;
          margin-bottom: 8px;
        }
        .store-info {
          font-size: 9px;
          opacity: 0.8;
          line-height: 1.6;
        }
        .store-info div {
          display: flex;
          justify-content: center;
          gap: 4px;
        }
        .receipt-header-text {
          text-align: center;
          padding: 12px 16px;
          font-size: 11px;
          color: #666;
          border-bottom: 1px dashed #ddd;
          font-style: italic;
        }
        .invoice-info {
          background: #f8f9fa;
          padding: 12px 14px;
          border-bottom: 1px solid #eee;
        }
        .invoice-info-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
        }
        .invoice-info-item {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }
        .invoice-info-item .label {
          font-size: 9px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.3px;
        }
        .invoice-info-item .value {
          font-size: 12px;
          font-weight: 600;
          color: #1a1a2e;
        }
        .items-section {
          padding: 8px 0;
        }
        .items-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 14px 6px;
          border-bottom: 1px solid #eee;
          margin-bottom: 0;
        }
        .items-header span {
          font-size: 9px;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex: 1;
          text-align: center;
        }
        .items-header span:first-child { text-align: right; }
        .items-header span:last-child { text-align: center; }
        table { width: 100%; border-collapse: collapse; margin: 0; }
        tbody tr { border-bottom: 1px solid #f0f0f0; }
        tbody tr:last-child { border-bottom: none; }
        tbody tr:nth-child(even) { background: #fafafa; }
        .totals-section {
          padding: 10px 14px;
          border-top: 2px solid #1a1a2e;
          background: #f8f9fa;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 4px 0;
          font-size: 12px;
        }
        .totals-row .label { color: #666; }
        .totals-row .value { font-weight: 600; }
        .totals-row.grand {
          font-size: 16px;
          font-weight: 700;
          color: #1a1a2e;
          border-top: 1px solid #ddd;
          padding-top: 8px;
          margin-top: 4px;
        }
        .totals-row.remaining {
          color: #dc2626;
          font-weight: 700;
        }
        .footer {
          text-align: center;
          padding: 14px 16px 16px;
          border-top: 1px dashed #ccc;
          margin-top: 8px;
        }
        .footer-text {
          font-size: 11px;
          color: #888;
          margin-bottom: 6px;
        }
        .footer-brand {
          font-size: 9px;
          color: #bbb;
        }
        .type-badge {
          display: inline-block;
          padding: 2px 12px;
          border-radius: 12px;
          font-size: 10px;
          font-weight: 600;
        }
        .type-badge-sale { background: #dbeafe; color: #1d4ed8; }
        .type-badge-purchase { background: #dcfce7; color: #15803d; }
        .barcode-area {
          text-align: center;
          padding: 8px 14px;
          border-top: 1px dashed #eee;
          border-bottom: 1px dashed #eee;
          margin: 8px 14px;
        }
        .barcode-text {
          font-family: 'Courier New', monospace;
          font-size: 14px;
          letter-spacing: 3px;
          font-weight: 700;
          color: #1a1a2e;
        }
        @media print {
          body { padding: 0; margin: 0; }
          .receipt { border: none; box-shadow: none; border-radius: 0; }
        }
      </style>
    </head>
    <body>
      <div class="receipt">
        <!-- Header -->
        <div class="header">
          <div class="store-name">🏪 ${storeName}</div>
          <div class="store-subtitle">نظام إدارة نقطة البيع</div>
          ${(storePhone || storeAddress || taxNumber) ? `
          <div class="store-info">
            ${storePhone ? `<div>📞 ${storePhone}</div>` : ''}
            ${storeAddress ? `<div>📍 ${storeAddress}</div>` : ''}
            ${taxNumber ? `<div>🏦 الرقم الضريبي: ${taxNumber}</div>` : ''}
          </div>` : ''}
        </div>

        <!-- Custom Receipt Header -->
        ${receiptHeader ? `<div class="receipt-header-text">${receiptHeader}</div>` : ''}

        <!-- Invoice Info -->
        <div class="invoice-info">
          <div class="invoice-info-grid">
            <div class="invoice-info-item">
              <span class="label">رقم الفاتورة</span>
              <span class="value">${invoice.invoiceNo}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">النوع</span>
              <span class="type-badge ${invoice.type === 'sale' ? 'type-badge-sale' : 'type-badge-purchase'}">${typeLabel}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">التاريخ</span>
              <span class="value">${formatDate(invoice.createdAt)}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">الوقت</span>
              <span class="value">${formatTime(invoice.createdAt)}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">${partyLabel}</span>
              <span class="value">${partyName}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">المستخدم</span>
              <span class="value">${invoice.user.name}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">عدد الأصناف</span>
              <span class="value">${invoice.items.length}</span>
            </div>
            <div class="invoice-info-item">
              <span class="label">عدد القطع</span>
              <span class="value">${totalItems}</span>
            </div>
          </div>
        </div>

        <!-- Items -->
        <div class="items-section">
          <div class="items-header">
            <span style="flex:2;text-align:right;">المنتج</span>
            <span style="flex:0.5;">الكمية</span>
            <span style="flex:1;">السعر</span>
            <span style="flex:1;">الإجمالي</span>
          </div>
          <table>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>
        </div>

        <!-- Barcode -->
        <div class="barcode-area">
          <div class="barcode-text">${invoice.invoiceNo}</div>
        </div>

        <!-- Totals -->
        <div class="totals-section">
          <div class="totals-row">
            <span class="label">المجموع:</span>
            <span class="value">${printFormatCurrency(invoice.totalAmount)}</span>
          </div>
          ${invoice.discount > 0 ? `<div class="totals-row">
            <span class="label">الخصم:</span>
            <span class="value" style="color:#ea580c;">-${printFormatCurrency(invoice.discount)}</span>
          </div>` : ''}
          <div class="totals-row">
            <span class="label">المدفوع:</span>
            <span class="value" style="color:#16a34a;">${printFormatCurrency(invoice.paidAmount)}</span>
          </div>
          ${remaining > 0 ? `<div class="totals-row remaining">
            <span class="label">المتبقي:</span>
            <span class="value">${printFormatCurrency(remaining)}</span>
          </div>` : ''}
          <div class="totals-row grand">
            <span class="label">الصافي:</span>
            <span class="value">${printFormatCurrency(invoice.totalAmount - invoice.discount)}</span>
          </div>
        </div>

        <!-- Footer -->
        <div class="footer">
          <div class="footer-text">${receiptFooter}</div>
          <div class="footer-brand">© ${new Date().getFullYear()} ${storeName}</div>
        </div>
      </div>
    </body>
    </html>`

    const win = window.open('', '_blank')
    if (win) {
      win.document.write(printContent)
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
              <h2 className="text-lg font-bold text-foreground">أرشيف الفواتير</h2>
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
            {loading ? 'جاري التحميل...' : `${invoices.length} فاتورة`}
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
                          <p className="text-sm font-bold text-foreground">
                            {formatDual(invoice.totalAmount).display}
                          </p>
                        </div>
                        <div className="text-left hidden md:block">
                          <p className="text-[10px] text-muted-foreground">الخصم</p>
                          <p className="text-sm font-semibold text-orange-600">
                            {invoice.discount > 0 ? `-${formatDual(invoice.discount).display}` : '—'}
                          </p>
                        </div>
                        <div className="text-left hidden md:block">
                          <p className="text-[10px] text-muted-foreground">المدفوع</p>
                          <p className="text-sm font-semibold text-emerald-600">
                            {formatDual(invoice.paidAmount).display}
                          </p>
                        </div>
                        <div className="text-left hidden lg:block">
                          <p className="text-[10px] text-muted-foreground">المتبقي</p>
                          <p className={`text-sm font-semibold ${remaining > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
                            {remaining > 0 ? formatDual(remaining).display : '✓'}
                          </p>
                        </div>

                        {/* Mobile total */}
                        <div className="text-left sm:hidden">
                          <p className="text-xs font-bold text-foreground">
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
                          >
                            <Eye className="w-4 h-4 text-muted-foreground" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary hover:bg-primary/10 hover:text-primary"
                            onClick={() => handlePrint(invoice)}
                            title="طباعة"
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => toggleExpand(invoice.id)}
                            title="تفاصيل العناصر"
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

      {/* Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col glass-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              تفاصيل الفاتورة {selectedInvoice?.invoiceNo}
            </DialogTitle>
          </DialogHeader>

          {selectedInvoice && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4 pb-2">
                  {/* Info Grid */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">رقم الفاتورة</p>
                      <p className="text-sm font-bold">{selectedInvoice.invoiceNo}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">النوع</p>
                      <Badge
                        variant="secondary"
                        className={`text-[10px] px-2 py-0 h-5 font-semibold ${
                          selectedInvoice.type === 'sale'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {selectedInvoice.type === 'sale' ? 'فاتورة بيع' : 'فاتورة شراء'}
                      </Badge>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">التاريخ</p>
                      <p className="text-sm font-medium">{formatDate(selectedInvoice.createdAt)}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">
                        {selectedInvoice.type === 'sale' ? 'العميل' : 'المورد'}
                      </p>
                      <p className="text-sm font-medium">
                        {selectedInvoice.type === 'sale'
                          ? selectedInvoice.customer?.name || 'عميل نقدي'
                          : selectedInvoice.supplier?.name || 'مورد'}
                      </p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">المستخدم</p>
                      <p className="text-sm font-medium">{selectedInvoice.user.name}</p>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3">
                      <p className="text-[10px] text-muted-foreground mb-0.5">عدد العناصر</p>
                      <p className="text-sm font-medium">{selectedInvoice.items.length}</p>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div>
                    <p className="text-xs font-semibold text-muted-foreground mb-2">
                      عناصر الفاتورة
                    </p>
                    <div className="rounded-lg overflow-hidden border border-border/50">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/70 hover:bg-muted/70">
                            <TableHead className="text-xs font-semibold text-right py-2 px-3">
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
                          {selectedInvoice.items.map((item) => (
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

                  {/* Totals */}
                  <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">الإجمالي</span>
                      <span className="font-bold">{formatDual(selectedInvoice.totalAmount).display}</span>
                    </div>
                    {selectedInvoice.discount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">الخصم</span>
                        <span className="font-semibold text-orange-600">
                          -{formatDual(selectedInvoice.discount).display}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">المدفوع</span>
                      <span className="font-semibold text-emerald-600">
                        {formatDual(selectedInvoice.paidAmount).display}
                      </span>
                    </div>
                    {selectedInvoice.totalAmount - selectedInvoice.discount - selectedInvoice.paidAmount > 0 && (
                      <div className="flex justify-between items-center text-sm">
                        <span className="text-muted-foreground">المتبقي</span>
                        <span className="font-semibold text-destructive">
                          {formatDual(
                            selectedInvoice.totalAmount -
                              selectedInvoice.discount -
                              selectedInvoice.paidAmount
                          ).display}
                        </span>
                      </div>
                    )}
                    <div className="border-t border-border/70 pt-2 flex justify-between items-center">
                      <span className="text-sm font-bold">الصافي</span>
                      <span className="text-lg font-bold text-primary">
                        {formatDual(selectedInvoice.totalAmount - selectedInvoice.discount).display}
                      </span>
                    </div>
                  </div>

                  {/* Print Button */}
                  <Button
                    onClick={() => handlePrint(selectedInvoice)}
                    className="w-full gap-2 btn-ripple"
                  >
                    <Printer className="w-4 h-4" />
                    طباعة الفاتورة
                  </Button>
                </div>
              </ScrollArea>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Return Dialog */}
      <Dialog open={returnOpen} onOpenChange={setReturnOpen}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-hidden flex flex-col glass-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-600" />
              إرجاع من فاتورة {returnInvoice?.invoiceNo}
            </DialogTitle>
            <DialogDescription>
              اختر المنتج المراد إرجاعه وحدد الكمية
            </DialogDescription>
          </DialogHeader>

          {returnInvoice && (
            <div className="flex-1 overflow-hidden flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-4 pb-4">
                  {/* Select Product */}
                  <div className="space-y-1.5">
                    <Label className="text-sm font-medium">اختر المنتج</Label>
                    <Select value={returnProductId} onValueChange={handleReturnProductSelect}>
                      <SelectTrigger className="w-full h-10">
                        <SelectValue placeholder="اختر منتجاً..." />
                      </SelectTrigger>
                      <SelectContent>
                        {returnInvoice.items.map((item) => (
                          <SelectItem key={item.id} value={item.productId}>
                            <div className="flex items-center gap-2">
                              <span>{item.product.name}</span>
                              <span className="text-xs text-muted-foreground">({item.quantity} × {formatCurrency(item.price)})</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity and Summary */}
                  {returnProductItem && (
                    <div className="space-y-3">
                      <div className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          كمية الإرجاع (الحد الأقصى: {returnProductItem.quantity})
                        </Label>
                        <Input
                          type="number"
                          min={1}
                          max={returnProductItem.quantity}
                          value={returnQuantity}
                          onChange={(e) => setReturnQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                          className="h-10 text-sm input-glass"
                        />
                      </div>

                      <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">سعر الوحدة</span>
                          <span className="font-medium">{formatDual(returnProductItem.price).display}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">الكمية</span>
                          <span className="font-medium">{returnQuantity}</span>
                        </div>
                        <div className="border-t border-border/50 pt-1 flex justify-between text-sm">
                          <span className="font-semibold">إجمالي الإرجاع</span>
                          <span className="font-bold text-amber-600">
                            {formatDual(returnProductItem.price * returnQuantity).display}
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

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/50 flex-shrink-0">
                <Button
                  variant="outline"
                  onClick={() => setReturnOpen(false)}
                  disabled={returnSubmitting}
                  className="text-sm"
                >
                  إلغاء
                </Button>
                <Button
                  onClick={handleSubmitReturn}
                  disabled={returnSubmitting || !returnProductId}
                  className="gap-2 text-sm btn-ripple shimmer"
                >
                  {returnSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RotateCcw className="w-4 h-4" />
                  )}
                  تأكيد الإرجاع
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
