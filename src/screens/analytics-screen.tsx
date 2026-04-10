'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  BarChart,
  Cell,
} from 'recharts'
import {
  BarChart3,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  Clock,
  CreditCard,
  Banknote,
  Package,
  Users,
  Medal,
  Flame,
  Snowflake,
  RotateCcw,
} from 'lucide-react'

// ─── Chart color palette ──────────────────────────────────────────
const CHART_COLORS = [
  '#3b5bdb', '#364fc7', '#5c7cfa', '#e03131', '#c92a2a',
  '#0ca678', '#f08c00', '#9c36b5', '#1c7ed6', '#e8590c',
]

// ─── Types ────────────────────────────────────────────────────────
interface SalesTrendItem {
  date: string
  total: number
  profit: number
  count: number
}

interface TopProduct {
  name: string
  quantity: number
  revenue: number
  profit: number
}

interface CategoryPerformanceItem {
  name: string
  sales: number
  profit: number
  margin: number
  count: number
}

interface CustomerRankingItem {
  name: string
  total: number
  invoiceCount: number
  debt: number
}

interface HourlySale {
  hour: number
  avgSales: number
  avgCount: number
}

interface PaymentMethods {
  cash: { count: number; total: number }
  credit: { count: number; total: number }
}

interface SlowMovingProduct {
  name: string
  quantity: number
  sold: number
  daysSinceLastSale: number
}

interface ProfitMarginItem {
  date: string
  margin: number
}

interface AnalyticsData {
  salesTrend: SalesTrendItem[]
  topProducts: TopProduct[]
  categoryPerformance: CategoryPerformanceItem[]
  customerRanking: CustomerRankingItem[]
  hourlySales: HourlySale[]
  paymentMethods: PaymentMethods
  slowMovingProducts: SlowMovingProduct[]
  profitMargins: ProfitMarginItem[]
  inventoryTurnover: {
    overall: number
    daysToSellInventory: number
    totalInventoryValue: number
    totalCOGS: number
    byCategory: Array<{ name: string; turnover: number; value: number; cogs: number }>
  }
}

// ─── Date Range Options ───────────────────────────────────────────
const dateRanges = [
  { id: '7', label: 'آخر 7 أيام' },
  { id: '30', label: 'آخر 30 يوم' },
  { id: '90', label: 'آخر 90 يوم' },
  { id: 'month', label: 'هذا الشهر' },
  { id: 'year', label: 'هذا العام' },
]

// ─── Helpers ──────────────────────────────────────────────────────
function formatCurrency(amount: number): string {
  return amount.toFixed(2)
}

function formatShortDate(dateStr: string): string {
  const parts = dateStr.split('-')
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
  return `${d.getDate()}/${d.getMonth() + 1}`
}

function getHourLabel(hour: number): string {
  if (hour === 0) return '12ص'
  if (hour < 12) return `${hour}ص`
  if (hour === 12) return '12م'
  return `${hour - 12}م`
}

function getMarginColor(margin: number): string {
  if (margin > 30) return 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30'
  if (margin >= 15) return 'text-amber-600 bg-amber-50 dark:bg-amber-950/30'
  return 'text-red-600 bg-red-50 dark:bg-red-950/30'
}

function getMarginBarColor(margin: number): string {
  if (margin > 30) return '#0ca678'
  if (margin >= 15) return '#f08c00'
  return '#e03131'
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

function getHeatmapColor(value: number, maxValue: number): string {
  if (maxValue === 0) return 'bg-muted/30'
  const ratio = value / maxValue
  if (ratio > 0.75) return 'bg-emerald-500/80'
  if (ratio > 0.5) return 'bg-emerald-400/60'
  if (ratio > 0.25) return 'bg-amber-400/60'
  if (ratio > 0.1) return 'bg-amber-300/40'
  return 'bg-muted/30'
}

// ─── Custom Tooltips ──────────────────────────────────────────────
function SalesTrendTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg" dir="rtl">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.dataKey === 'total' ? 'المبيعات' : 'الأرباح'}: {formatCurrency(entry.value)} ر.س
        </p>
      ))}
    </div>
  )
}

function ComposedTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg" dir="rtl">
      <p className="text-xs font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.dataKey === 'revenue'
            ? `الإيرادات: ${formatCurrency(entry.value)} ر.س`
            : `الكمية: ${entry.value} وحدة`}
        </p>
      ))}
    </div>
  )
}

function HourlyTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload: { hour: number } }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg" dir="rtl">
      <p className="text-xs font-medium text-muted-foreground mb-1">{getHourLabel(item.payload.hour)}</p>
      <p className="text-sm font-bold text-foreground">{formatCurrency(item.value)} ر.س</p>
    </div>
  )
}

// ─── Skeleton Components ─────────────────────────────────────────
function ChartCardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="skeleton-shimmer h-5 w-40 rounded" />
        <div className="skeleton-shimmer h-3 w-52 rounded mt-1" />
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <div className="skeleton-shimmer h-[300px] w-full rounded-xl" />
      </CardContent>
    </Card>
  )
}

function TableSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="skeleton-shimmer h-5 w-40 rounded" />
        <div className="skeleton-shimmer h-3 w-52 rounded mt-1" />
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-12 w-full rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function AlertCardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="skeleton-shimmer h-5 w-44 rounded" />
      </CardHeader>
      <CardContent className="p-6 pt-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="skeleton-shimmer h-28 w-full rounded-xl" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Main Component ──────────────────────────────────────────────
export function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [selectedRange, setSelectedRange] = useState('30')

  const fetchAnalytics = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch(`/api/analytics?range=${selectedRange}`)
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch {
      // Silently handle
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [selectedRange])

  useEffect(() => {
    fetchAnalytics()
  }, [fetchAnalytics])

  const maxHourlySales = data
    ? Math.max(...data.hourlySales.map((h) => h.avgSales), 1)
    : 1

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            التحليلات المتقدمة
          </h2>
          <p className="text-sm text-muted-foreground mt-1">تقارير وإحصائيات تفصيلية</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchAnalytics(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="flex flex-wrap gap-2">
        {dateRanges.map((range) => (
          <button
            key={range.id}
            onClick={() => setSelectedRange(range.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
              selectedRange === range.id
                ? 'bg-primary text-white shadow-md shadow-primary/25'
                : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'
            }`}
          >
            {range.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-6">
          <ChartCardSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ChartCardSkeleton />
            <TableSkeleton />
          </div>
          <ChartCardSkeleton />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <AlertCardSkeleton />
            <ChartCardSkeleton />
          </div>
        </div>
      ) : data ? (
        <>
          {/* Glow orb background */}
          <div className="relative">
            <div className="glow-orb-blue" />

            {/* ─── Section 1: Sales Trend ──────────────────────────── */}
            <Card className="rounded-2xl border-0 shadow-sm card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-primary" />
                      اتجاه المبيعات اليومية
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">المبيعات والأرباح اليومية مع هامش الربح</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {data.salesTrend.length} يوم
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.salesTrend} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b5bdb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b5bdb" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ca678" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0ca678" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<SalesTrendTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="total"
                        stroke="#3b5bdb"
                        strokeWidth={2}
                        fill="url(#salesGradient)"
                        animationDuration={1000}
                        name="total"
                      />
                      <Area
                        type="monotone"
                        dataKey="profit"
                        stroke="#0ca678"
                        strokeWidth={2}
                        fill="url(#profitGradient)"
                        animationDuration={1200}
                        name="profit"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {/* Legend */}
                <div className="flex items-center justify-center gap-6 mt-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#3b5bdb]" />
                    <span className="text-xs text-muted-foreground">المبيعات</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-[#0ca678]" />
                    <span className="text-xs text-muted-foreground">الأرباح</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="section-divider my-2" />

          {/* ─── Section 2 & 3: Category Performance + Customer Ranking ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
            {/* Category Performance */}
            <Card className="rounded-2xl border-0 shadow-sm card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Flame className="w-5 h-5 text-primary" />
                      أداء الفئات
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">المبيعات بهامش الربح لكل فئة</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {data.categoryPerformance.length} فئة
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="h-[320px] w-full">
                  {data.categoryPerformance.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.categoryPerformance}
                        layout="vertical"
                        margin={{ top: 5, right: 40, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                          axisLine={false}
                          tickLine={false}
                          tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: 'oklch(0.35 0.01 260)' }}
                          axisLine={false}
                          tickLine={false}
                          width={80}
                        />
                        <Tooltip content={<SalesTrendTooltip />} cursor={{ fill: 'oklch(0.55 0.2 260 / 8%)' }} />
                        <Bar
                          dataKey="sales"
                          radius={[0, 8, 8, 0]}
                          maxBarSize={28}
                          animationDuration={800}
                        >
                          {data.categoryPerformance.map((entry, index) => (
                            <Cell
                              key={`cat-cell-${index}`}
                              fill={getMarginBarColor(entry.margin)}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center empty-state">
                      <div className="empty-state-icon">
                        <Flame className="w-6 h-6 text-primary/30" />
                      </div>
                      <p className="empty-state-title">لا توجد بيانات</p>
                    </div>
                  )}
                </div>
                {/* Category margin legend */}
                <div className="flex items-center justify-center gap-4 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#0ca678]" />
                    <span className="text-[10px] text-muted-foreground">هامش &gt; 30%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#f08c00]" />
                    <span className="text-[10px] text-muted-foreground">هامش 15-30%</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#e03131]" />
                    <span className="text-[10px] text-muted-foreground">هامش &lt; 15%</span>
                  </div>
                </div>
                {/* Category detail list */}
                <div className="mt-4 space-y-2 max-h-40 overflow-y-auto">
                  {data.categoryPerformance.map((cat) => (
                    <div
                      key={cat.name}
                      className="flex items-center justify-between px-3 py-2 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors"
                    >
                      <span className="text-sm font-medium text-foreground">{cat.name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {formatCurrency(cat.sales)} ر.س
                        </span>
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-lg ${getMarginColor(cat.margin)}`}
                        >
                          {cat.margin.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Customer Ranking */}
            <Card className="rounded-2xl border-0 shadow-sm card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Users className="w-5 h-5 text-primary" />
                      ترتيب العملاء
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">أفضل 10 عملاء حسب إجمالي المشتريات</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {data.customerRanking.length} عميل
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                {data.customerRanking.length > 0 ? (
                  <ScrollArea className="max-h-[400px]">
                    <div className="rounded-xl border border-border/50 overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-muted/50 hover:bg-muted/50">
                            <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 w-12">#</TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3">العميل</TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 text-left">المشتريات</TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 text-center">الفواتير</TableHead>
                            <TableHead className="text-xs font-semibold text-muted-foreground py-2.5 px-3 text-left">المديونية</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {data.customerRanking.map((customer, index) => (
                            <TableRow
                              key={`${customer.name}-${index}`}
                              className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="py-2.5 px-3">
                                <div className="flex items-center justify-center">
                                  {getRankBadge(index)}
                                </div>
                              </TableCell>
                              <TableCell className="py-2.5 px-3">
                                <span className="text-sm font-medium text-foreground">{customer.name}</span>
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-left">
                                <span className="text-sm font-bold text-foreground">
                                  {formatCurrency(customer.total)}
                                  <span className="text-[10px] text-muted-foreground mr-1">ر.س</span>
                                </span>
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-center">
                                <Badge variant="secondary" className="text-[10px] px-1.5 rounded-lg">
                                  {customer.invoiceCount}
                                </Badge>
                              </TableCell>
                              <TableCell className="py-2.5 px-3 text-left">
                                {customer.debt > 0 ? (
                                  <span className="text-xs font-semibold text-red-500 bg-red-50 dark:bg-red-950/30 px-2 py-0.5 rounded-lg">
                                    {formatCurrency(customer.debt)} ر.س
                                  </span>
                                ) : (
                                  <span className="text-xs text-emerald-500 font-medium">✓ لا يوجد</span>
                                )}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </ScrollArea>
                ) : (
                  <div className="h-48 flex items-center justify-center empty-state">
                    <div className="empty-state-icon">
                      <Users className="w-6 h-6 text-primary/30" />
                    </div>
                    <p className="empty-state-title">لا توجد بيانات عملاء</p>
                    <p className="empty-state-description mt-1">ستظهر ترتيب العملاء بعد تسجيل عمليات البيع</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="section-divider my-2" />

          {/* ─── Section 4: Top Products (ComposedChart) ──────────── */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-primary" />
                    أفضل المنتجات مبيعاً
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">الإيرادات والكمية لأفضل 10 منتجات</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {data.topProducts.length} منتج
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[320px] w-full">
                {data.topProducts.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={data.topProducts} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        interval={0}
                        angle={-20}
                        textAnchor="end"
                        height={60}
                      />
                      <YAxis
                        yAxisId="left"
                        tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                      />
                      <YAxis
                        yAxisId="right"
                        orientation="left"
                        tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip content={<ComposedTooltip />} />
                      <Bar
                        yAxisId="left"
                        dataKey="revenue"
                        radius={[6, 6, 0, 0]}
                        maxBarSize={40}
                        animationDuration={800}
                      >
                        {data.topProducts.map((_, index) => (
                          <Cell
                            key={`top-bar-${index}`}
                            fill={CHART_COLORS[index % CHART_COLORS.length]}
                          />
                        ))}
                      </Bar>
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="quantity"
                        stroke="#e03131"
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: '#e03131', strokeWidth: 0 }}
                        activeDot={{ r: 6 }}
                        animationDuration={1000}
                      />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center empty-state">
                    <div className="empty-state-icon">
                      <Trophy className="w-6 h-6 text-primary/30" />
                    </div>
                    <p className="empty-state-title">لا توجد بيانات مبيعات</p>
                    <p className="empty-state-description mt-1">ستظهر أفضل المنتجات بعد تسجيل عمليات البيع</p>
                  </div>
                )}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#3b5bdb]" />
                  <span className="text-xs text-muted-foreground">الإيرادات (ر.س)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-[#e03131]" />
                  <span className="text-xs text-muted-foreground">الكمية (وحدة)</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="section-divider my-2" />

          {/* ─── Section 5 & 6: Hourly Heatmap + Slow Moving Products ── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
            {/* Hourly Sales Heatmap */}
            <Card className="rounded-2xl border-0 shadow-sm card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Clock className="w-5 h-5 text-primary" />
                      كثافة المبيعات بالساعة
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">متوسط المبيعات لكل ساعة</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                {/* Heatmap Grid */}
                <div className="grid grid-cols-6 gap-2">
                  {data.hourlySales.map((item) => (
                    <div
                      key={item.hour}
                      className={`relative rounded-xl p-2 text-center transition-all duration-200 hover:scale-105 ${getHeatmapColor(item.avgSales, maxHourlySales)}`}
                      title={`${getHourLabel(item.hour)}: ${formatCurrency(item.avgSales)} ر.س`}
                    >
                      <p className="text-[10px] font-semibold text-foreground/80">{getHourLabel(item.hour)}</p>
                      <p className="text-xs font-bold text-foreground mt-0.5 tabular-nums">
                        {item.avgSales > 0 ? `${(item.avgSales / 1000).toFixed(1)}k` : '-'}
                      </p>
                    </div>
                  ))}
                </div>
                {/* Heat intensity legend */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  <span className="text-[10px] text-muted-foreground">منخفض</span>
                  <div className="flex gap-1">
                    <span className="w-4 h-3 rounded-sm bg-muted/30" />
                    <span className="w-4 h-3 rounded-sm bg-amber-300/40" />
                    <span className="w-4 h-3 rounded-sm bg-amber-400/60" />
                    <span className="w-4 h-3 rounded-sm bg-emerald-400/60" />
                    <span className="w-4 h-3 rounded-sm bg-emerald-500/80" />
                  </div>
                  <span className="text-[10px] text-muted-foreground">مرتفع</span>
                </div>

                {/* Peak hours */}
                <div className="mt-4 p-3 rounded-xl bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">أوقات الذروة</p>
                  <div className="flex flex-wrap gap-2">
                    {data.hourlySales
                      .sort((a, b) => b.avgSales - a.avgSales)
                      .slice(0, 3)
                      .map((item, i) => (
                        <div
                          key={item.hour}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary"
                        >
                          <span className="text-xs font-bold">{getHourLabel(item.hour)}</span>
                          <span className="text-[10px]">{formatCurrency(item.avgSales)} ر.س</span>
                        </div>
                      ))}
                  </div>
                </div>

                {/* Payment Methods */}
                <div className="mt-4 p-3 rounded-xl bg-muted/30">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">طرق الدفع</p>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Banknote className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">نقدي ({data.paymentMethods.cash.count})</p>
                        <p className="text-sm font-bold text-foreground">{formatCurrency(data.paymentMethods.cash.total)} ر.س</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                        <CreditCard className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">آجل ({data.paymentMethods.credit.count})</p>
                        <p className="text-sm font-bold text-foreground">{formatCurrency(data.paymentMethods.credit.total)} ر.س</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Slow Moving Products */}
            <Card className="rounded-2xl border-0 shadow-sm card-hover">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                      <Snowflake className="w-5 h-5 text-blue-500" />
                      منتجات بطيئة الحركة
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">منتجات لم تُباع منذ أكثر من 7 أيام</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {data.slowMovingProducts.length} منتج
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                {data.slowMovingProducts.length > 0 ? (
                  <div className="space-y-3 max-h-[420px] overflow-y-auto">
                    {data.slowMovingProducts.map((product, index) => (
                      <div
                        key={`${product.name}-${index}`}
                        className={`p-3 rounded-xl border transition-colors ${
                          product.daysSinceLastSale >= 30
                            ? 'border-red-200 bg-red-50/50 dark:border-red-900/50 dark:bg-red-950/20'
                            : 'border-amber-200 bg-amber-50/50 dark:border-amber-900/50 dark:bg-amber-950/20'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                product.daysSinceLastSale >= 30
                                  ? 'bg-red-500/10'
                                  : 'bg-amber-500/10'
                              }`}
                            >
                              <AlertTriangle
                                className={`w-4 h-4 ${
                                  product.daysSinceLastSale >= 30 ? 'text-red-500' : 'text-amber-500'
                                }`}
                              />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-foreground">{product.name}</p>
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  المخزون: <span className="font-medium text-foreground">{product.quantity}</span>
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  تم البيع: <span className="font-medium text-foreground">{product.sold}</span>
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="text-left flex-shrink-0">
                            <div
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold ${
                                product.daysSinceLastSale >= 30
                                  ? 'bg-red-500/10 text-red-600'
                                  : 'bg-amber-500/10 text-amber-600'
                              }`}
                            >
                              <Clock className="w-3 h-3" />
                              {product.daysSinceLastSale} يوم
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-48 flex items-center justify-center empty-state">
                    <div className="empty-state-icon">
                      <Snowflake className="w-6 h-6 text-primary/30" />
                    </div>
                    <p className="empty-state-title">لا توجد منتجات بطيئة</p>
                    <p className="empty-state-description mt-1">جميع المنتجات لديها حركة بيع جيدة</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="section-divider my-2" />

          {/* ─── Section: Inventory Turnover ────────────────────────── */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <RotateCcw className="w-5 h-5 text-primary" />
                    معدل دوران المخزون
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">عدد مرات بيع وإعادة تخزين المخزون خلال الفترة</p>
                </div>
                {data.inventoryTurnover && (
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {data.inventoryTurnover.overall.toFixed(2)}x
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              {/* Turnover Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">معدل الدوران</p>
                  <p className="text-lg font-bold text-primary tabular-nums">
                    {data.inventoryTurnover.overall.toFixed(2)}x
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">أيام لبيع المخزون</p>
                  <p className="text-lg font-bold text-foreground tabular-nums">
                    {data.inventoryTurnover.daysToSellInventory.toFixed(0)}
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">قيمة المخزون</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrency(data.inventoryTurnover.totalInventoryValue)} ر.س
                  </p>
                </div>
                <div className="p-3 rounded-xl bg-muted/30">
                  <p className="text-[10px] text-muted-foreground">تكلفة البضاعة</p>
                  <p className="text-sm font-bold text-foreground tabular-nums">
                    {formatCurrency(data.inventoryTurnover.totalCOGS)} ر.س
                  </p>
                </div>
              </div>

              {/* Turnover by Category */}
              {data.inventoryTurnover.byCategory.length > 0 && (
                <div className="space-y-2 max-h-[260px] overflow-y-auto">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">معدل الدوران حسب الفئة</p>
                  {data.inventoryTurnover.byCategory.map((cat) => {
                    const turnoverColor = cat.turnover >= 3 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30' : cat.turnover >= 1.5 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/30' : 'text-red-600 bg-red-50 dark:bg-red-950/30'
                    const barWidth = Math.min(cat.turnover / 10 * 100, 100)
                    return (
                      <div key={cat.name} className="flex items-center gap-3 px-3 py-2.5 rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-foreground">{cat.name}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-lg ${turnoverColor}`}>
                              {cat.turnover.toFixed(2)}x
                            </span>
                          </div>
                          <div className="relative h-1.5 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={`absolute inset-y-0 right-0 rounded-full transition-all duration-500 ${
                                cat.turnover >= 3 ? 'bg-emerald-500' : cat.turnover >= 1.5 ? 'bg-amber-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${barWidth}%` }}
                            />
                          </div>
                          <div className="flex items-center justify-between mt-1">
                            <span className="text-[10px] text-muted-foreground">
                              تكلفة: {formatCurrency(cat.cogs)} ر.س
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              قيمة: {formatCurrency(cat.value)} ر.س
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* ─── Section: Profit Margin Trend ─────────────────────── */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    اتجاه هامش الربح اليومي
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">نسبة هامش الربح (%) لكل يوم</p>
                </div>
                <div className="flex items-center gap-2">
                  {data.profitMargins.length > 0 && (
                    <Badge
                      className="rounded-lg text-xs"
                      variant="secondary"
                    >
                      المتوسط: {(
                        data.profitMargins.reduce((sum, p) => sum + p.margin, 0) /
                        data.profitMargins.length
                      ).toFixed(1)}%
                    </Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[200px] w-full">
                {data.profitMargins.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.profitMargins} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="marginGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#f08c00" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#f08c00" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
                      <XAxis
                        dataKey="date"
                        tickFormatter={formatShortDate}
                        tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${val}%`}
                        domain={[0, 'auto']}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg" dir="rtl">
                              <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                              <p className="text-sm font-bold text-foreground">
                                هامش الربح: {payload[0].value}%
                              </p>
                            </div>
                          )
                        }}
                      />
                      <Area
                        type="monotone"
                        dataKey="margin"
                        stroke="#f08c00"
                        strokeWidth={2}
                        fill="url(#marginGradient)"
                        animationDuration={1000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center empty-state">
                    <div className="empty-state-icon">
                      <TrendingUp className="w-6 h-6 text-primary/30" />
                    </div>
                    <p className="empty-state-title">لا توجد بيانات</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </>
      ) : null}
    </div>
  )
}
