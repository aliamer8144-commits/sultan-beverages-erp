'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { AreaTrendChart, HorizontalBarChart, DonutChart } from '@/components/charts'
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Receipt,
  Percent,
  ShoppingCart,
  CalendarDays,
  ChevronDown,
  Package,
  Users,
  Medal,
  ArrowUpDown,
} from 'lucide-react'
import { formatCurrency, CHART_COLORS, EXPENSE_COLORS, SummaryCardSkeleton, ChartSkeleton, TableSkeleton } from '@/components/chart-utils'
import { EmptyState } from '@/components/empty-state'
import { useApi } from '@/hooks/use-api'

// ─── Types ────────────────────────────────────────────────────────
interface SalesByDayItem {
  date: string
  amount: number
}

interface SalesByCategoryItem {
  category: string
  amount: number
  count: number
}

interface TopProductItem {
  name: string
  category: string
  quantity: number
  revenue: number
  profit: number
}

interface TopCustomerItem {
  name: string
  totalSpent: number
  invoiceCount: number
}

interface ExpenseBreakdownItem {
  category: string
  amount: number
}

interface AnalyticsData {
  totalSales: number
  totalProfit: number
  totalExpenses: number
  netProfit: number
  invoicesCount: number
  averageInvoice: number
  netProfitPercent: number
  salesByDay: SalesByDayItem[]
  salesByCategory: SalesByCategoryItem[]
  topProducts: TopProductItem[]
  topCustomers: TopCustomerItem[]
  expenseBreakdown: ExpenseBreakdownItem[]
}

// ─── Date Range Presets ───────────────────────────────────────────
type PresetKey = 'today' | 'week' | 'month' | '3months' | 'year' | 'custom'

const datePresets: { key: PresetKey; label: string }[] = [
  { key: 'today', label: 'اليوم' },
  { key: 'week', label: 'هذا الأسبوع' },
  { key: 'month', label: 'هذا الشهر' },
  { key: '3months', label: '3 أشهر' },
  { key: 'year', label: 'سنة' },
  { key: 'custom', label: 'مخصص' },
]

// ─── Helpers ──────────────────────────────────────────────────────
function getPresetRange(key: PresetKey): { startDate: string; endDate: string } {
  const now = new Date()
  const fmt = (d: Date) => d.toISOString().split('T')[0]
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (key) {
    case 'today':
      return { startDate: fmt(startOfDay), endDate: fmt(now) }
    case 'week': {
      const d = new Date(startOfDay)
      d.setDate(d.getDate() - 7)
      return { startDate: fmt(d), endDate: fmt(now) }
    }
    case 'month':
      return { startDate: fmt(new Date(now.getFullYear(), now.getMonth(), 1)), endDate: fmt(now) }
    case '3months': {
      const d = new Date(startOfDay)
      d.setMonth(d.getMonth() - 3)
      return { startDate: fmt(d), endDate: fmt(now) }
    }
    case 'year':
      return { startDate: fmt(new Date(now.getFullYear(), 0, 1)), endDate: fmt(now) }
    default:
      return { startDate: '', endDate: '' }
  }
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-')
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function getRankBadge(index: number) {
  if (index === 0) return <Medal className="w-5 h-5 text-amber-500" />
  if (index === 1) return <Medal className="w-5 h-5 text-gray-400" />
  if (index === 2) return <Medal className="w-5 h-5 text-amber-700" />
  return (
    <span className="w-5 h-5 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground">
      {index + 1}
    </span>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export function AnalyticsScreen() {
  const { get } = useApi()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedPreset, setSelectedPreset] = useState<PresetKey>('month')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')

  const fetchAnalytics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    let params: Record<string, string> = {}
    if (selectedPreset === 'custom' && customStart && customEnd) {
      params = { startDate: customStart, endDate: customEnd }
    } else {
      const range = getPresetRange(selectedPreset)
      if (range.startDate && range.endDate) {
        params = { startDate: range.startDate, endDate: range.endDate }
      } else {
        params = { range: '30' }
      }
    }

    const result = await get<AnalyticsData>('/api/analytics', params, { showErrorToast: false })
    if (result) {
      setData(result)
    }

    setLoading(false)
    setRefreshing(false)
  }, [selectedPreset, customStart, customEnd, get])

  useEffect(() => {
    if (selectedPreset !== 'custom') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchAnalytics()
    }
  }, [fetchAnalytics, selectedPreset])

  const handlePresetChange = (key: PresetKey) => {
    setSelectedPreset(key)
    if (key !== 'custom') {
      setData(null)
    }
  }

  const handleCustomFetch = () => {
    if (customStart && customEnd) {
      fetchAnalytics()
    }
  }

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* ─── Page Header ──────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            التحليلات والتقارير
          </h2>
          <p className="text-sm text-muted-foreground mt-1">تقارير شاملة وإحصائيات تفصيلية</p>
        </div>
        <button
          onClick={() => fetchAnalytics(true)}
          disabled={refreshing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          <span className="hidden sm:inline">تحديث</span>
        </button>
      </div>

      {/* ─── Date Range Selector ──────────────────────────────────── */}
      <div className="glass-card rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <CalendarDays className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">نطاق التاريخ</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {datePresets.map((preset) => (
            <button
              key={preset.key}
              onClick={() => handlePresetChange(preset.key)}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                selectedPreset === preset.key
                  ? 'bg-primary text-white shadow-md shadow-primary/25'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        {/* Custom date inputs */}
        {selectedPreset === 'custom' && (
          <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">تاريخ البداية</label>
              <Input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">تاريخ النهاية</label>
              <Input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              onClick={handleCustomFetch}
              disabled={!customStart || !customEnd}
              className="rounded-xl"
            >
              <ArrowUpDown className="w-4 h-4 ml-1" />
              عرض التقرير
            </Button>
          </div>
        )}
      </div>

      {/* ─── Loading State ─────────────────────────────────────────── */}
      {loading ? (
        <div className="space-y-6">
          {/* KPI skeleton row */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <SummaryCardSkeleton key={i} />
            ))}
          </div>
          <ChartSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartSkeleton />
            <ChartSkeleton />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <TableSkeleton />
            <TableSkeleton />
          </div>
        </div>
      ) : data ? (
        <div className="space-y-6">
          {/* ─── KPI Cards ──────────────────────────────────────────── */}
          <div className="relative">
            <div className="glow-orb-blue" />
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 stagger-children relative z-10">
              <Card className="rounded-2xl border-0 shadow-sm card-hover data-card-micro stat-card-gradient stat-card-blue">
                <CardContent className="p-4 md:p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">إجمالي المبيعات</p>
                      <p className="text-lg md:text-xl font-bold text-foreground mt-1 tabular-nums">{formatCurrency(data.totalSales)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <DollarSign className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm card-hover data-card-micro stat-card-gradient stat-card-green">
                <CardContent className="p-4 md:p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">صافي الربح</p>
                      <p className={`text-lg md:text-xl font-bold mt-1 tabular-nums ${data.netProfit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {formatCurrency(data.netProfit)}
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${data.netProfit >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} flex items-center justify-center`}>
                      {data.netProfit >= 0 ? (
                        <TrendingUp className="w-5 h-5 text-emerald-600" />
                      ) : (
                        <TrendingDown className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm card-hover data-card-micro stat-card-gradient">
                <CardContent className="p-4 md:p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">عدد الفواتير</p>
                      <p className="text-lg md:text-xl font-bold text-foreground mt-1 tabular-nums">{data.invoicesCount.toLocaleString('ar-SA')}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <FileText className="w-5 h-5 text-primary" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm card-hover data-card-micro stat-card-gradient">
                <CardContent className="p-4 md:p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">متوسط الفاتورة</p>
                      <p className="text-lg md:text-xl font-bold text-foreground mt-1 tabular-nums">{formatCurrency(data.averageInvoice)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Receipt className="w-5 h-5 text-amber-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm card-hover data-card-micro stat-card-gradient stat-card-red">
                <CardContent className="p-4 md:p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
                      <p className="text-lg md:text-xl font-bold text-red-500 mt-1 tabular-nums">{formatCurrency(data.totalExpenses)}</p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                      <ShoppingCart className="w-5 h-5 text-red-500" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl border-0 shadow-sm card-hover data-card-micro stat-card-gradient">
                <CardContent className="p-4 md:p-5 relative z-10">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-muted-foreground">صافي الربح %</p>
                      <p className={`text-lg md:text-xl font-bold mt-1 tabular-nums ${data.netProfitPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                        {data.netProfitPercent.toFixed(1)}%
                      </p>
                    </div>
                    <div className={`w-10 h-10 rounded-xl ${data.netProfitPercent >= 0 ? 'bg-emerald-500/10' : 'bg-red-500/10'} flex items-center justify-center`}>
                      <Percent className={`w-5 h-5 ${data.netProfitPercent >= 0 ? 'text-emerald-600' : 'text-red-500'}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="section-divider my-2" />

          {/* ─── Sales Trend Area Chart ─────────────────────────────── */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    اتجاه المبيعات اليومية
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">إجمالي المبيعات يومياً خلال الفترة المحددة</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {data.salesByDay.length} يوم
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <AreaTrendChart
                data={data.salesByDay}
                dataKey="amount"
                labelKey="date"
                color="#3b5bdb"
                gradientId="analyticsSalesGrad"
                height={320}
                strokeWidth={2}
                animationDuration={1000}
                xAxisTickFormatter={(v) => formatShortDate(String(v))}
                xAxisInterval="preserveStartEnd"
                emptyIcon={TrendingUp}
                emptyTitle="لا توجد بيانات مبيعات"
                emptyDescription="ستظهر بيانات المبيعات بعد تسجيل عمليات البيع"
              />
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#3b5bdb]" />
                  <span className="text-xs text-muted-foreground">المبيعات اليومية</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="section-divider my-2" />

          {/* ─── Category Revenue + Expense Breakdown ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
            {/* Category Revenue Bar Chart */}
            <Card className="rounded-2xl border-0 shadow-sm card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Package className="w-5 h-5 text-primary" />
                      إيرادات الفئات
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">توزيع المبيعات حسب الفئة</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {data.salesByCategory.length} فئة
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <HorizontalBarChart
                  data={data.salesByCategory}
                  dataKey="amount"
                  labelKey="category"
                  colors={CHART_COLORS}
                  height={320}
                  maxBarSize={28}
                  yAxisWidth={80}
                  margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                  emptyIcon={Package}
                  emptyTitle="لا توجد بيانات فئات"
                />
              </CardContent>
            </Card>

            {/* Expense Breakdown Donut Chart */}
            <Card className="rounded-2xl border-0 shadow-sm card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <ShoppingCart className="w-5 h-5 text-red-500" />
                      توزيع المصروفات
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">المصروفات حسب الفئة</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {formatCurrency(data.totalExpenses)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <DonutChart
                  data={data.expenseBreakdown}
                  dataKey="amount"
                  nameKey="category"
                  colors={EXPENSE_COLORS}
                  height={320}
                  innerRadius={60}
                  outerRadius={100}
                  emptyIcon={ShoppingCart}
                  emptyTitle="لا توجد مصروفات"
                  emptyDescription="لم يتم تسجيل مصروفات في هذه الفترة"
                />
              </CardContent>
            </Card>
          </div>

          <div className="section-divider my-2" />

          {/* ─── Top 10 Products Table ──────────────────────────────── */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    أفضل 10 منتجات مبيعاً
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">المنتجات الأعلى إيرادات خلال الفترة</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {data.topProducts.length} منتج
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {data.topProducts.length > 0 ? (
                <ScrollArea className="max-h-96">
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3 w-12">#</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3">المنتج</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3">الفئة</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3 text-center">الكمية</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3 text-left">الإيرادات</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3 text-left">الربح</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topProducts.map((product, index) => (
                          <TableRow
                            key={`${product.name}-${index}`}
                            className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="py-2.5 px-3">
                              <div className="flex items-center justify-center">{getRankBadge(index)}</div>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <span className="text-sm font-medium text-foreground">{product.name}</span>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <Badge variant="secondary" className="text-[10px] px-2 rounded-lg">
                                {product.category}
                              </Badge>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-center">
                              <span className="text-sm font-semibold text-foreground tabular-nums">{product.quantity.toLocaleString('ar-SA')}</span>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-left">
                              <span className="text-sm font-bold text-foreground">{formatCurrency(product.revenue)}</span>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-left">
                              <span className={`text-sm font-bold ${product.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                                {formatCurrency(product.profit)}
                              </span>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              ) : (
                <EmptyState
                  icon={Package}
                  title="لا توجد منتجات مبيعة"
                  description="ستظهر المنتجات الأعلى مبيعاً بعد تسجيل عمليات البيع"
                  className="h-48"
                />
              )}
            </CardContent>
          </Card>

          <div className="section-divider my-2" />

          {/* ─── Top 10 Customers Table ─────────────────────────────── */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    أفضل 10 عملاء
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">العملاء الأعلى إنفاقاً خلال الفترة</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {data.topCustomers.length} عميل
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {data.topCustomers.length > 0 ? (
                <ScrollArea className="max-h-96">
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3 w-12">#</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3">العميل</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3 text-left">إجمالي الإنفاق</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-3 text-center">عدد الفواتير</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.topCustomers.map((customer, index) => (
                          <TableRow
                            key={`${customer.name}-${index}`}
                            className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="py-2.5 px-3">
                              <div className="flex items-center justify-center">{getRankBadge(index)}</div>
                            </TableCell>
                            <TableCell className="py-2.5 px-3">
                              <span className="text-sm font-medium text-foreground">{customer.name}</span>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-left">
                              <span className="text-sm font-bold text-foreground">{formatCurrency(customer.totalSpent)}</span>
                            </TableCell>
                            <TableCell className="py-2.5 px-3 text-center">
                              <Badge variant="secondary" className="text-[10px] px-2 rounded-lg">
                                {customer.invoiceCount} فاتورة
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>
              ) : (
                <EmptyState
                  icon={Users}
                  title="لا توجد بيانات عملاء"
                  description="ستظهر ترتيب العملاء بعد تسجيل عمليات البيع"
                  className="h-48"
                />
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ─── Empty state for custom range not yet fetched ─────────── */}
      {!loading && !data && selectedPreset === 'custom' && (
        <EmptyState
          icon={CalendarDays}
          title="اختر نطاق التاريخ"
          description='حدد تاريخ البداية والنهاية ثم اضغط "عرض التقرير"'
        />
      )}
    </div>
  )
}
