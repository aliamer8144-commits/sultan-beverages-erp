'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useCurrency } from '@/hooks/use-currency'
import { exportToCSV } from '@/lib/export-csv'
import { formatDateShortMonth, formatDateTime } from '@/lib/date-utils'
import { toast } from 'sonner'
import { useApi } from '@/hooks/use-api'
import { z } from 'zod'
import { useFormValidation } from '@/hooks/use-form-validation'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  FileText,
  Printer,
  Download,
  Search,
  User,
  Phone,
  CalendarDays,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  CreditCard,
  RotateCcw,
  RefreshCw,
  AlertTriangle,
  ChevronDown,
  Wallet,
  ShoppingBag,
  CheckCircle2,
  X,
} from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────
interface Customer {
  id: string
  name: string
  phone: string | null
  debt: number
  totalPurchases: number
  category: string
  createdAt: string
}

interface Transaction {
  date: string
  type: 'invoice' | 'payment' | 'return'
  reference: string
  debit: number
  credit: number
  balance: number
  details: string
}

interface StatementData {
  customer: Customer
  period: { startDate: string; endDate: string }
  summary: {
    openingBalance: number
    totalDebits: number
    totalCredits: number
    closingBalance: number
    invoiceCount: number
    returnCount: number
    paymentCount: number
    totalPurchasesAllTime: number
  }
  transactions: Transaction[]
}

// ─── Type badge component ────────────────────────────────────────────
function TypeBadge({ type }: { type: string }) {
  switch (type) {
    case 'invoice':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400">
          <ShoppingBag className="w-3 h-3" />
          فاتورة
        </span>
      )
    case 'payment':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400">
          <CreditCard className="w-3 h-3" />
          دفعة
        </span>
      )
    case 'return':
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <RotateCcw className="w-3 h-3" />
          مرتجع
        </span>
      )
    default:
      return null
  }
}

const statementFormSchema = z.object({
  customerId: z.string().min(1, 'يرجى اختيار عميل'),
})

// ─── Main Screen Component ───────────────────────────────────────────
export function CustomerStatementScreen() {
  const { formatCurrency, symbol } = useCurrency()
  const { get } = useApi()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('')
  const [startDate, setStartDate] = useState<string>(
    () => {
      const d = new Date()
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
    }
  )
  const [endDate, setEndDate] = useState<string>(
    () => new Date().toISOString().split('T')[0]
  )
  const [statement, setStatement] = useState<StatementData | null>(null)
  const [loading, setLoading] = useState(false)
  const [customersLoading, setCustomersLoading] = useState(true)
  const printRef = useRef<HTMLDivElement>(null)
  const statementValidation = useFormValidation({ schema: statementFormSchema })

  // ── Fetch customers list ───────────────────────────────────────────
  useEffect(() => {
    async function fetchCustomers() {
      try {
        const result = await get<{ customers: Customer[] }>('/api/customers', undefined, { showErrorToast: false })
        if (result?.customers) {
          setCustomers(result.customers)
        }
      } catch {
        toast.error('فشل في تحميل قائمة العملاء')
      } finally {
        setCustomersLoading(false)
      }
    }
    fetchCustomers()
  }, [get])

  // ── Generate statement ─────────────────────────────────────────────
  const generateStatement = useCallback(async () => {
    if (!statementValidation.validate({ customerId: selectedCustomerId })) return

    setLoading(true)
    setStatement(null)

    try {
      const result = await get<StatementData>('/api/customer-statement', {
        customerId: selectedCustomerId,
        startDate,
        endDate,
      }, { showErrorToast: false })

      if (result) {
        setStatement(result)
        toast.success('تم إنشاء كشف الحساب بنجاح')
      } else {
        toast.error('فشل في إنشاء كشف الحساب')
      }
    } catch {
      toast.error('فشل في الاتصال بالخادم')
    } finally {
      setLoading(false)
    }
  }, [selectedCustomerId, startDate, endDate, get, statementValidation])

  // ── Print statement ────────────────────────────────────────────────
  const handlePrint = () => {
    if (!statement || !printRef.current) return

    const printWindow = window.open('', '_blank', 'width=800,height=600')
    if (!printWindow) return

    const content = printRef.current.innerHTML
    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="UTF-8">
        <title>كشف حساب - ${statement.customer.name}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; padding: 20px; color: #1a1a1a; }
          .header { text-align: center; margin-bottom: 20px; padding-bottom: 15px; border-bottom: 2px solid #333; }
          .header h1 { font-size: 20px; margin-bottom: 4px; }
          .header p { font-size: 12px; color: #666; }
          .customer-info { display: flex; gap: 30px; margin-bottom: 15px; font-size: 13px; }
          .customer-info span { display: flex; align-items: center; gap: 4px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .summary-card { background: #f5f5f5; padding: 10px; border-radius: 8px; text-align: center; }
          .summary-card .label { font-size: 11px; color: #666; margin-bottom: 4px; }
          .summary-card .value { font-size: 16px; font-weight: 700; }
          .summary-card.debit .value { color: #dc2626; }
          .summary-card.credit .value { color: #16a34a; }
          .summary-card.balance .value { color: #2563eb; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 20px; }
          thead th { background: #f0f0f0; padding: 8px 10px; text-align: right; border-bottom: 2px solid #ddd; font-weight: 600; font-size: 11px; }
          tbody td { padding: 7px 10px; border-bottom: 1px solid #eee; }
          tbody tr:nth-child(even) { background: #fafafa; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .text-left { text-align: left; }
          .closing-bar { background: #1a1a1a; color: white; padding: 10px 15px; border-radius: 8px; display: flex; justify-content: space-between; font-size: 14px; }
          .footer { margin-top: 20px; text-align: center; font-size: 10px; color: #999; padding-top: 10px; border-top: 1px solid #eee; }
          @media print { body { padding: 10px; } }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => printWindow.print(), 300)
  }

  // ── Export CSV ─────────────────────────────────────────────────────
  const handleExportCSV = () => {
    if (!statement || statement.transactions.length === 0) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }

    const rows = statement.transactions.map((t) => ({
      'التاريخ': formatDateTime(t.date),
      'النوع': t.type === 'invoice' ? 'فاتورة' : t.type === 'payment' ? 'دفعة' : 'مرتجع',
      'المرجع': t.reference,
      'مدين': t.debit.toLocaleString(),
      'دائن': t.credit.toLocaleString(),
      'الرصيد': t.balance.toLocaleString(),
      'البيانات': t.details,
    }))

    const filename = `كشف-حساب-${statement.customer.name}-${new Date().toISOString().split('T')[0]}.csv`
    exportToCSV(rows, filename)
    toast.success('تم تصدير الكشف بنجاح')
  }

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId)

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up" dir="rtl">
      {/* ── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <FileText className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">كشف حساب عميل</h1>
            <p className="text-sm text-muted-foreground">عرض تفاصيل الحركات المالية للعميل</p>
          </div>
        </div>
      </div>

      {/* ── Filters Card ─────────────────────────────────────────── */}
      <Card className="glass-card border-border/50">
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary" />
                العميل
              </label>
              {customersLoading ? (
                <div className="h-10 rounded-xl bg-muted/50 animate-pulse" />
              ) : (
                <Select
                  value={selectedCustomerId}
                  onValueChange={(val) => {
                    setSelectedCustomerId(val)
                    statementValidation.clearFieldError('customerId')
                  }}
                >
                  <SelectTrigger className={`h-10 rounded-xl ${statementValidation.errors.customerId ? 'border-destructive focus:ring-destructive' : ''}`}>
                    <SelectValue placeholder="اختر العميل..." />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <div className="flex items-center gap-2">
                          <span>{c.name}</span>
                          {c.debt > 0 && (
                            <span className="text-[10px] text-destructive font-semibold">
                              ({formatCurrency(c.debt)})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              {statementValidation.errors.customerId && (
                <p className="text-xs text-destructive">{statementValidation.errors.customerId}</p>
              )}
            </div>

            {/* Start Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                تاريخ البداية
              </label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            {/* End Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-primary" />
                تاريخ النهاية
              </label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-10 rounded-xl"
              />
            </div>

            {/* Generate Button */}
            <div className="space-y-1.5 flex items-end">
              <Button
                onClick={generateStatement}
                disabled={loading || !selectedCustomerId}
                className="btn-ripple w-full h-10 rounded-xl gap-2"
              >
                {loading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Search className="w-4 h-4" />
                )}
                <span>عرض الكشف</span>
              </Button>
            </div>
          </div>

          {/* Selected customer quick info */}
          {selectedCustomer && (
            <div className="mt-4 flex flex-wrap items-center gap-4 p-3 rounded-xl bg-muted/40">
              <div className="flex items-center gap-1.5 text-sm">
                <User className="w-4 h-4 text-primary" />
                <span className="font-semibold">{selectedCustomer.name}</span>
              </div>
              {selectedCustomer.phone && (
                <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Phone className="w-3.5 h-3.5" />
                  <span>{selectedCustomer.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <ShoppingBag className="w-3.5 h-3.5" />
                <span>إجمالي المشتريات: {formatCurrency(selectedCustomer.totalPurchases)}</span>
              </div>
              {selectedCustomer.debt > 0 && (
                <div className="flex items-center gap-1.5 text-sm text-destructive font-semibold">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>المديونية: {formatCurrency(selectedCustomer.debt)}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Loading State ─────────────────────────────────────────── */}
      {loading && (
        <div className="space-y-4 animate-fade-in-up">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-muted/30 animate-pulse" />
            ))}
          </div>
          <div className="h-96 rounded-xl bg-muted/20 animate-pulse" />
        </div>
      )}

      {/* ── Statement Result ──────────────────────────────────────── */}
      {statement && !loading && (
        <div className="space-y-6 animate-fade-in-up">
          {/* ── Action Buttons ────────────────────────────────────── */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrint}
              className="btn-ripple gap-1.5 rounded-xl"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الكشف</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCSV}
              className="btn-ripple gap-1.5 rounded-xl"
              disabled={statement.transactions.length === 0}
            >
              <Download className="w-4 h-4" />
              <span>تصدير CSV</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={generateStatement}
              className="gap-1.5 rounded-xl"
            >
              <RefreshCw className="w-4 h-4" />
              <span>تحديث</span>
            </Button>
          </div>

          {/* ── Summary Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {/* Opening Balance */}
            <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20 card-hover">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-500/20 flex items-center justify-center">
                  <Wallet className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                </div>
                <span className="text-xs font-medium text-blue-600 dark:text-blue-400">الرصيد الافتتاحي</span>
              </div>
              <p className="text-lg font-bold text-blue-700 dark:text-blue-300 tabular-nums">
                {formatCurrency(statement.summary.openingBalance)} {symbol}
              </p>
            </div>

            {/* Total Debits */}
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 card-hover">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center">
                  <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
                </div>
                <span className="text-xs font-medium text-red-600 dark:text-red-400">إجمالي المدين</span>
              </div>
              <p className="text-lg font-bold text-red-700 dark:text-red-300 tabular-nums">
                {formatCurrency(statement.summary.totalDebits)} {symbol}
              </p>
            </div>

            {/* Total Credits */}
            <div className="p-4 rounded-xl bg-green-50 dark:bg-green-500/10 border border-green-100 dark:border-green-500/20 card-hover">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-green-100 dark:bg-green-500/20 flex items-center justify-center">
                  <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
                </div>
                <span className="text-xs font-medium text-green-600 dark:text-green-400">إجمالي الدائن</span>
              </div>
              <p className="text-lg font-bold text-green-700 dark:text-green-300 tabular-nums">
                {formatCurrency(statement.summary.totalCredits)} {symbol}
              </p>
            </div>

            {/* Closing Balance */}
            <div className={`p-4 rounded-xl border card-hover ${
              statement.summary.closingBalance > 0
                ? 'bg-amber-50 dark:bg-amber-500/10 border-amber-100 dark:border-amber-500/20'
                : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                  statement.summary.closingBalance > 0
                    ? 'bg-amber-100 dark:bg-amber-500/20'
                    : 'bg-emerald-100 dark:bg-emerald-500/20'
                }`}>
                  {statement.summary.closingBalance > 0 ? (
                    <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  statement.summary.closingBalance > 0
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-emerald-600 dark:text-emerald-400'
                }`}>
                  الرصيد الختامي
                </span>
              </div>
              <p className={`text-lg font-bold tabular-nums ${
                statement.summary.closingBalance > 0
                  ? 'text-amber-700 dark:text-amber-300'
                  : 'text-emerald-700 dark:text-emerald-300'
              }`}>
                {formatCurrency(statement.summary.closingBalance)} {symbol}
              </p>
            </div>
          </div>

          {/* ── Stats Row ─────────────────────────────────────────── */}
          <div className="flex flex-wrap gap-3">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-xs text-muted-foreground">
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>{statement.summary.invoiceCount} فاتورة</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-xs text-muted-foreground">
              <RotateCcw className="w-3.5 h-3.5" />
              <span>{statement.summary.returnCount} مرتجع</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-xs text-muted-foreground">
              <CreditCard className="w-3.5 h-3.5" />
              <span>{statement.summary.paymentCount} دفعة</span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-muted/60 text-xs text-muted-foreground">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>الفترة: {formatDateShortMonth(statement.period.startDate)} — {formatDateShortMonth(statement.period.endDate)}</span>
            </div>
          </div>

          {/* ── Print Section (hidden from main view, used for print) ── */}
          <div className="hidden">
            <div ref={printRef} className="print-area">
              {/* Print Header */}
              <div className="header">
                <h1>السلطان للمشروبات</h1>
                <p>كشف حساب عميل</p>
              </div>

              <div className="customer-info">
                <span><strong>العميل:</strong> {statement.customer.name}</span>
                {statement.customer.phone && (
                  <span><strong>الهاتف:</strong> {statement.customer.phone}</span>
                )}
                <span><strong>الفترة:</strong> {formatDateShortMonth(statement.period.startDate)} — {formatDateShortMonth(statement.period.endDate)}</span>
              </div>

              <div className="summary-grid">
                <div className="summary-card balance">
                  <div className="label">الرصيد الافتتاحي</div>
                  <div className="value">{formatCurrency(statement.summary.openingBalance)}</div>
                </div>
                <div className="summary-card debit">
                  <div className="label">إجمالي المدين</div>
                  <div className="value">{formatCurrency(statement.summary.totalDebits)}</div>
                </div>
                <div className="summary-card credit">
                  <div className="label">إجمالي الدائن</div>
                  <div className="value">{formatCurrency(statement.summary.totalCredits)}</div>
                </div>
                <div className="summary-card balance">
                  <div className="label">الرصيد الختامي</div>
                  <div className="value">{formatCurrency(statement.summary.closingBalance)}</div>
                </div>
              </div>

              <table>
                <thead>
                  <tr>
                    <th className="text-right">التاريخ</th>
                    <th className="text-right">النوع</th>
                    <th className="text-right">المرجع</th>
                    <th className="text-right">البيانات</th>
                    <th className="text-left">مدين</th>
                    <th className="text-left">دائن</th>
                    <th className="text-left">الرصيد</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.transactions.map((t, idx) => (
                    <tr key={idx}>
                      <td className="text-right">{formatDateTime(t.date)}</td>
                      <td className="text-right">{t.type === 'invoice' ? 'فاتورة' : t.type === 'payment' ? 'دفعة' : 'مرتجع'}</td>
                      <td className="text-right">{t.reference}</td>
                      <td className="text-right">{t.details}</td>
                      <td className="text-left">{t.debit > 0 ? t.debit.toLocaleString() : '—'}</td>
                      <td className="text-left">{t.credit > 0 ? t.credit.toLocaleString() : '—'}</td>
                      <td className="text-left" style={{ fontWeight: 600 }}>{t.balance.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="closing-bar">
                <span>الرصيد الختامي</span>
                <span>{formatCurrency(statement.summary.closingBalance)}</span>
              </div>

              <div className="footer">
                <p>تم إعداد هذا الكشف بواسطة نظام السلطان للمشروبات</p>
              </div>
            </div>
          </div>

          {/* ── Transactions Table ────────────────────────────────── */}
          {statement.transactions.length > 0 ? (
            <Card className="glass-card border-border/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="table-enhanced w-full">
                  <thead>
                    <tr>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-foreground/70">التاريخ</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-foreground/70">النوع</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-foreground/70">المرجع</th>
                      <th className="text-right py-3 px-4 text-xs font-semibold text-foreground/70">البيانات</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-foreground/70">مدين</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-foreground/70">دائن</th>
                      <th className="text-left py-3 px-4 text-xs font-semibold text-foreground/70">الرصيد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Opening Balance Row */}
                    <tr className="bg-muted/30 font-semibold">
                      <td colSpan={4} className="py-3 px-4 text-sm">
                        رصيد افتتاحي
                      </td>
                      <td className="text-left py-3 px-4 text-sm tabular-nums">—</td>
                      <td className="text-left py-3 px-4 text-sm tabular-nums">—</td>
                      <td className="text-left py-3 px-4 text-sm tabular-nums text-blue-600 dark:text-blue-400 font-bold">
                        {formatCurrency(statement.summary.openingBalance)}
                      </td>
                    </tr>

                    {statement.transactions.map((t, idx) => (
                      <tr key={idx} className="group">
                        <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(t.date)}
                        </td>
                        <td className="py-2.5 px-4">
                          <TypeBadge type={t.type} />
                        </td>
                        <td className="py-2.5 px-4 text-sm font-mono font-medium text-foreground/80">
                          {t.reference}
                        </td>
                        <td className="py-2.5 px-4 text-xs text-muted-foreground max-w-[250px] truncate">
                          {t.details}
                        </td>
                        <td className={`text-left py-2.5 px-4 text-sm tabular-nums font-semibold ${
                          t.debit > 0 ? 'text-red-600 dark:text-red-400' : 'text-muted-foreground/40'
                        }`}>
                          {t.debit > 0 ? formatCurrency(t.debit) : '—'}
                        </td>
                        <td className={`text-left py-2.5 px-4 text-sm tabular-nums font-semibold ${
                          t.credit > 0 ? 'text-green-600 dark:text-green-400' : 'text-muted-foreground/40'
                        }`}>
                          {t.credit > 0 ? formatCurrency(t.credit) : '—'}
                        </td>
                        <td className="text-left py-2.5 px-4 text-sm tabular-nums font-bold text-foreground">
                          {formatCurrency(t.balance)}
                        </td>
                      </tr>
                    ))}

                    {/* Closing Balance Row */}
                    <tr className={`font-bold ${
                      statement.summary.closingBalance > 0
                        ? 'bg-amber-50 dark:bg-amber-500/10'
                        : 'bg-emerald-50 dark:bg-emerald-500/10'
                    }`}>
                      <td colSpan={4} className="py-3 px-4 text-sm">
                        الرصيد الختامي
                      </td>
                      <td className="text-left py-3 px-4 text-sm tabular-nums text-red-600 dark:text-red-400 font-bold">
                        {formatCurrency(statement.summary.totalDebits)}
                      </td>
                      <td className="text-left py-3 px-4 text-sm tabular-nums text-green-600 dark:text-green-400 font-bold">
                        {formatCurrency(statement.summary.totalCredits)}
                      </td>
                      <td className={`text-left py-3 px-4 text-sm tabular-nums font-bold ${
                        statement.summary.closingBalance > 0
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                      }`}>
                        {formatCurrency(statement.summary.closingBalance)}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </Card>
          ) : (
            /* ── Empty State ───────────────────────────────────────── */
            <EmptyState
              icon={FileText}
              title="لا توجد حركات"
              description="لا توجد فواتير أو مدفوعات أو مرتجعات للعميل في الفترة المحددة"
              compact
            />
          )}
        </div>
      )}

      {/* ── Empty State (no statement generated) ───────────────────── */}
      {!statement && !loading && (
        <EmptyState
          icon={FileText}
          title="اختر عميلاً واضغط عرض الكشف"
          description="اختر العميل وحدد الفترة الزمنية لعرض كشف الحساب التفصيلي"
        />
      )}
    </div>
  )
}
