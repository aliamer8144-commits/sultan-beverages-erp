'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import {
  CalendarCheck,
  DollarSign,
  TrendingUp,
  FileText,
  ShoppingCart,
  Receipt,
  RotateCcw,
  RefreshCw,
  Printer,
  Banknote,
  CreditCard,
  Trophy,
  ArrowDownUp,
  Calendar,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import {
  dualFormat,
  formatCurrency,
  ComparisonTooltip,
  SummaryCardSkeleton,
  ChartSkeleton,
  StatCard,
} from '@/components/chart-utils'

// ─── Types ──────────────────────────────────────────────────────────
interface TopProduct {
  name: string
  quantity: number
  revenue: number
}

interface HourlyData {
  hour: number
  label: string
  total: number
}

interface DailyCloseData {
  totalSales: number
  totalProfit: number
  totalPurchases: number
  totalExpenses: number
  netProfit: number
  invoiceCount: number
  itemsSold: number
  averageInvoice: number
  topSellingProduct: { name: string; quantity: number; revenue: number } | null
  topSellingProducts: TopProduct[]
  paymentMethods: {
    cash: { total: number; count: number }
    credit: { total: number; count: number }
  }
  hourlyBreakdown: HourlyData[]
}

function getTodayArabic(): string {
  const now = new Date()
  try {
    return now.toLocaleDateString('ar-SA', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  } catch {
    return now.toLocaleDateString('ar')
  }
}

// ─── Chart Tooltip ─────────────────────────────────────────────────
function HourlyTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {dualFormat(payload[0].value).display}
      </p>
    </div>
  )
}

// ─── Print Styles (thermal receipt) ────────────────────────────────
function generatePrintContent(data: DailyCloseData) {
  const settings = useAppStore.getState().settings
  const storeName = settings.storeName || 'السلطان للمشروبات'
  const today = getTodayArabic()

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>تقرير إغلاق اليوم</title>
      <style>
        @page { size: 80mm auto; margin: 0; }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
          font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
          width: 80mm;
          padding: 4mm;
          font-size: 11px;
          line-height: 1.6;
          color: #000;
        }
        .header { text-align: center; border-bottom: 2px dashed #333; padding-bottom: 8px; margin-bottom: 8px; }
        .header h1 { font-size: 16px; font-weight: bold; }
        .header p { font-size: 10px; color: #555; }
        .section { margin-bottom: 8px; }
        .section-title { font-weight: bold; font-size: 12px; border-bottom: 1px dashed #999; padding-bottom: 4px; margin-bottom: 6px; }
        .row { display: flex; justify-content: space-between; padding: 2px 0; }
        .row .label { color: #555; }
        .row .value { font-weight: bold; font-family: 'Courier New', monospace; }
        .total-row { font-size: 14px; font-weight: bold; border-top: 2px solid #000; padding-top: 6px; margin-top: 6px; }
        .products-table { width: 100%; border-collapse: collapse; font-size: 10px; margin-top: 4px; }
        .products-table th, .products-table td { padding: 2px 4px; border-bottom: 1px dotted #ccc; text-align: right; }
        .products-table th { font-weight: bold; background: #f0f0f0; }
        .footer { text-align: center; margin-top: 12px; border-top: 2px dashed #333; padding-top: 8px; font-size: 10px; color: #555; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>${storeName}</h1>
        <p>تقرير إغلاق اليوم</p>
        <p>${today}</p>
      </div>

      <div class="section">
        <div class="section-title">ملخص المبيعات</div>
        <div class="row"><span class="label">إجمالي المبيعات</span><span class="value">${formatCurrency(data.totalSales)}</span></div>
        <div class="row"><span class="label">صافي الربح</span><span class="value">${formatCurrency(data.netProfit)}</span></div>
        <div class="row"><span class="label">عدد الفواتير</span><span class="value">${data.invoiceCount}</span></div>
        <div class="row"><span class="label">الأصناف المباعة</span><span class="value">${data.itemsSold}</span></div>
        <div class="row"><span class="label">متوسط الفاتورة</span><span class="value">${formatCurrency(data.averageInvoice)}</span></div>
      </div>

      <div class="section">
        <div class="section-title">المصروفات</div>
        <div class="row"><span class="label">إجمالي المشتريات</span><span class="value">${formatCurrency(data.totalPurchases)}</span></div>
        <div class="total-row">
          <div class="row"><span class="label">صافي الربح النهائي</span><span class="value">${formatCurrency(data.netProfit)}</span></div>
        </div>
      </div>

      <div class="section">
        <div class="section-title">طرق الدفع</div>
        <div class="row"><span class="label">نقدي</span><span class="value">${formatCurrency(data.paymentMethods.cash.total)} (${data.paymentMethods.cash.count})</span></div>
        <div class="row"><span class="label">آجل</span><span class="value">${formatCurrency(data.paymentMethods.credit.total)} (${data.paymentMethods.credit.count})</span></div>
      </div>

      ${data.topSellingProducts.length > 0 ? `
      <div class="section">
        <div class="section-title">أفضل المنتجات مبيعاً</div>
        <table class="products-table">
          <tr><th>المنتج</th><th>الكمية</th><th>الإيرادات</th></tr>
          ${data.topSellingProducts.map(p => `
            <tr><td>${p.name}</td><td>${p.quantity}</td><td>${formatCurrency(p.revenue)}</td></tr>
          `).join('')}
        </table>
      </div>
      ` : ''}

      <div class="footer">
        <p>تم طباعة هذا التقرير آلياً</p>
        <p>${new Date().toLocaleTimeString('ar-SA')}</p>
      </div>
    </body>
    </html>
  `
}

function handlePrint(data: DailyCloseData) {
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(generatePrintContent(data))
    printWindow.document.close()
    printWindow.onload = () => {
      printWindow.print()
    }
  }
}

// ─── Main Screen ───────────────────────────────────────────────────
export function DailyCloseScreen() {
  const [data, setData] = useState<DailyCloseData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchData = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/daily-close')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Build comparison chart data
  const comparisonData = data
    ? [
        { name: 'المبيعات', sales: data.totalSales, purchases: 0 },
        { name: 'المشتريات', sales: 0, purchases: data.totalPurchases },
        { name: 'صافي الربح', sales: data.netProfit > 0 ? data.netProfit : 0, purchases: data.netProfit < 0 ? Math.abs(data.netProfit) : 0 },
      ]
    : []

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* ── Header Section ─────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <CalendarCheck className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">إغلاق اليوم</h2>
            <p className="text-sm text-muted-foreground mt-0.5">{getTodayArabic()}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchData(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="rounded-xl btn-ripple gap-2">
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">فتح يوم جديد</span>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent dir="rtl" className="rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle className="flex items-center gap-2">
                  <RotateCcw className="w-5 h-5 text-destructive" />
                  تأكيد إغلاق اليوم
                </AlertDialogTitle>
                <AlertDialogDescription>
                  هل أنت متأكد من إغلاق هذا اليوم وبدء يوم جديد؟ سيتم حفظ تقرير الإغلاق الحالي.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter className="flex-row-reverse gap-2">
                <AlertDialogAction className="rounded-xl" onClick={() => fetchData(true)}>
                  نعم، إغلاق اليوم
                </AlertDialogAction>
                <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {data && (
            <Button
              variant="outline"
              className="rounded-xl btn-ripple gap-2"
              onClick={() => handlePrint(data)}
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">طباعة</span>
            </Button>
          )}
        </div>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : data ? (
        <div className="relative">
          <div className="glow-orb-green" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children card-grid-responsive">
          <StatCard
            label="إجمالي المبيعات"
            value={data.totalSales}
            suffix="ريال سعودي"
            icon={DollarSign}
            iconBg="bg-primary/10 text-primary"
            statClass="stat-card-blue stat-card-violet"
          />
          <StatCard
            label="صافي الربح"
            value={data.netProfit}
            suffix="ريال سعودي"
            icon={TrendingUp}
            iconBg="bg-green-500/10 text-green-600"
            statClass="stat-card-green stat-card-emerald"
          />
          <StatCard
            label="عدد الفواتير"
            value={data.invoiceCount}
            suffix="فاتورة"
            icon={FileText}
            iconBg="bg-primary/10 text-primary"
            statClass="stat-card-blue stat-card-amber"
            isInteger
          />
          <StatCard
            label="إجمالي المشتريات"
            value={data.totalPurchases}
            suffix="ريال سعودي"
            icon={Receipt}
            iconBg="bg-red-500/10 text-red-500"
            statClass="stat-card-red stat-card-rose"
          />
          </div>
          <div className="glow-orb-amber" style={{ top: '20%', right: '-10%' }} />
        </div>
      ) : null}

      {/* ── Additional Stats Row ──────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children card-grid-responsive">
          <Card className="rounded-2xl border-0 shadow-sm card-hover glass-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <ShoppingCart className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">الأصناف المباعة</p>
                  <p className="text-xl font-bold text-foreground tabular-nums number-lg tabular-nums-enhanced">{data.itemsSold.toLocaleString('ar-SA')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm card-hover glass-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">متوسط قيمة الفاتورة</p>
                  <p className="text-xl font-bold text-foreground tabular-nums number-lg tabular-nums-enhanced">{dualFormat(data.averageInvoice).display}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-2xl border-0 shadow-sm card-hover glass-card">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">المنتج الأكثر مبيعاً</p>
                  <p className="text-sm font-bold text-foreground truncate max-w-[180px]">
                    {data.topSellingProduct?.name ?? 'لا توجد مبيعات'}
                  </p>
                  {data.topSellingProduct && (
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {data.topSellingProduct.quantity} وحدة — {dualFormat(data.topSellingProduct.revenue).display}
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="section-divider" />

      {/* ── Charts Section (2 side by side) ───────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
          {/* Hourly Sales Bar Chart */}
          <div className="chart-container">
          <Card className="rounded-2xl border-0 shadow-sm bg-transparent border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    المبيعات بالساعة
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">توزيع المبيعات على ساعات اليوم</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {data.hourlyBreakdown.length} ساعة
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[280px] w-full">
                {data.hourlyBreakdown.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.hourlyBreakdown} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-45}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<HourlyTooltip />} cursor={{ fill: 'oklch(0.55 0.2 260 / 8%)' }} />
                      <Bar
                        dataKey="total"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                        fill="#3b5bdb"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                        <Calendar className="w-5 h-5 text-muted-foreground/40" />
                      </div>
                      <p className="text-sm text-muted-foreground">لا توجد مبيعات بعد</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          </div>

          {/* Sales vs Purchases */}
          <div className="chart-container">
          <Card className="rounded-2xl border-0 shadow-sm bg-transparent border-0">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <ArrowDownUp className="w-4 h-4 text-primary" />
                    المبيعات مقابل المشتريات
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">مقارنة بين الإيرادات والمصروفات</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
                    <XAxis
                      dataKey="name"
                      tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 260)' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                      axisLine={false}
                      tickLine={false}
                      tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<ComparisonTooltip />} />
                    <Legend
                      formatter={(value) => (value === 'sales' ? 'المبيعات' : 'المشتريات')}
                      wrapperStyle={{ fontSize: '12px' }}
                    />
                    <Bar dataKey="sales" fill="#3b5bdb" radius={[6, 6, 0, 0]} maxBarSize={50} name="sales" />
                    <Bar dataKey="purchases" fill="#e03131" radius={[6, 6, 0, 0]} maxBarSize={50} name="purchases" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
          </div>
        </div>
      ) : null}

      <div className="section-divider" />

      {/* ── Top Products Table ────────────────────────────────── */}
      {loading ? (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <Skeleton className="h-5 w-36" />
            <Skeleton className="h-3 w-48 mt-1" />
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-amber-500" />
                    أفضل المنتجات مبيعاً اليوم
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">أكثر 5 منتجات مبيعاً حسب الكمية</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {data.topSellingProducts.length} منتج
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {data.topSellingProducts.length > 0 ? (
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="table-enhanced w-full">
                    <thead>
                      <tr>
                        <th className="py-3 px-4">#</th>
                        <th className="py-3 px-4">المنتج</th>
                        <th className="py-3 px-4">الكمية</th>
                        <th className="py-3 px-4">الإيرادات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.topSellingProducts.map((product, index) => (
                        <tr key={index}>
                          <td className="py-3 px-4">
                            <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${
                              index === 0 ? 'bg-amber-100 text-amber-700' :
                              index === 1 ? 'bg-gray-100 text-gray-600' :
                              index === 2 ? 'bg-orange-100 text-orange-700' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {index + 1}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-medium text-foreground">{product.name}</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm text-foreground tabular-nums">{product.quantity.toLocaleString('ar-SA')}</span>
                            <span className="text-xs text-muted-foreground mr-1">وحدة</span>
                          </td>
                          <td className="py-3 px-4">
                            <span className="text-sm font-bold text-foreground tabular-nums">
                              {dualFormat(product.revenue).display}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="h-32 flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <Trophy className="w-10 h-10 text-muted-foreground/30 mx-auto" />
                    <p className="text-sm text-muted-foreground">لا توجد مبيعات بعد</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      <div className="section-divider" />

      {/* ── Payment Breakdown ─────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : data ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 stagger-children card-grid-responsive" style={{ animationDelay: '0.35s' }}>
          {/* Cash Payments */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مدفوعات نقدية</p>
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums number-lg tabular-nums-enhanced">
                    {dualFormat(data.paymentMethods.cash.total).display}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.paymentMethods.cash.count} فاتورة نقدية
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <Banknote className="w-6 h-6 text-green-600" />
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all duration-1000"
                    style={{ width: `${data.totalSales > 0 ? (data.paymentMethods.cash.total / data.totalSales) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                  {data.totalSales > 0 ? ((data.paymentMethods.cash.total / data.totalSales) * 100).toFixed(1) : 0}% من إجمالي المبيعات
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Credit Payments */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مدفوعات آجلة</p>
                  <p className="text-3xl font-bold text-foreground mt-1 tabular-nums number-lg tabular-nums-enhanced">
                    {dualFormat(data.paymentMethods.credit.total).display}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {data.paymentMethods.credit.count} فاتورة آجلة
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                  <CreditCard className="w-6 h-6 text-amber-600" />
                </div>
              </div>
              {/* Progress bar */}
              <div className="mt-4">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all duration-1000"
                    style={{ width: `${data.totalSales > 0 ? (data.paymentMethods.credit.total / data.totalSales) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1 tabular-nums">
                  {data.totalSales > 0 ? ((data.paymentMethods.credit.total / data.totalSales) * 100).toFixed(1) : 0}% من إجمالي المبيعات
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
