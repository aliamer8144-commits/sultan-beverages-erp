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
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
  Legend,
} from 'recharts'
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
import { formatCurrency, CHART_COLORS } from '@/components/chart-utils'
import { useApi } from '@/hooks/use-api'

const EXPENSE_COLORS = ['#e03131', '#f08c00', '#9c36b5', '#e8590c', '#1c7ed6', '#c92a2a', '#364fc7']

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

// ─── Custom Tooltips ──────────────────────────────────────────────
function AreaTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg" dir="rtl">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value)}</p>
    </div>
  )
}

function BarTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload?: { category?: string } }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg" dir="rtl">
      <p className="text-xs font-medium text-muted-foreground mb-1">{item.payload?.category}</p>
      <p className="text-sm font-bold text-foreground">{formatCurrency(item.value)}</p>
    </div>
  )
}

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg" dir="rtl">
      <p className="text-xs font-medium text-muted-foreground mb-1">{item.name}</p>
      <p className="text-sm font-bold text-foreground">{formatCurrency(item.value)}</p>
    </div>
  )
}

function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0" style={{ backgroundColor: entry.color }} />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Skeleton Components ─────────────────────────────────────────
function KPICardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2 flex-1">
            <div className="skeleton-shimmer h-4 w-24 rounded" />
            <div className="skeleton-shimmer h-8 w-28 rounded" />
          </div>
          <div className="skeleton-shimmer w-10 h-10 rounded-xl" />
        </div>
      </CardContent>
    </Card>
  )
}

function ChartSkeleton() {
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
              <KPICardSkeleton key={i} />
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
              <div className="h-[320px] w-full">
                {data.salesByDay.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.salesByDay} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="analyticsSalesGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b5bdb" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#3b5bdb" stopOpacity={0} />
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
                      <Tooltip content={<AreaTooltip />} />
                      <Area
                        type="monotone"
                        dataKey="amount"
                        stroke="#3b5bdb"
                        strokeWidth={2}
                        fill="url(#analyticsSalesGrad)"
                        animationDuration={1000}
                        name="المبيعات"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center empty-state">
                    <div className="empty-state-icon">
                      <TrendingUp className="w-6 h-6 text-primary/30" />
                    </div>
                    <p className="empty-state-title">لا توجد بيانات مبيعات</p>
                    <p className="empty-state-description mt-1">ستظهر بيانات المبيعات بعد تسجيل عمليات البيع</p>
                  </div>
                )}
              </div>
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
                <div className="h-[320px] w-full">
                  {data.salesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.salesByCategory}
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
                          dataKey="category"
                          tick={{ fontSize: 11, fill: 'oklch(0.35 0.01 260)' }}
                          axisLine={false}
                          tickLine={false}
                          width={80}
                        />
                        <Tooltip content={<BarTooltip />} cursor={{ fill: 'oklch(0.55 0.2 260 / 8%)' }} />
                        <Bar
                          dataKey="amount"
                          radius={[0, 8, 8, 0]}
                          maxBarSize={28}
                          animationDuration={800}
                        >
                          {data.salesByCategory.map((_, index) => (
                            <Cell
                              key={`cat-cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center empty-state">
                      <div className="empty-state-icon">
                        <Package className="w-6 h-6 text-primary/30" />
                      </div>
                      <p className="empty-state-title">لا توجد بيانات فئات</p>
                    </div>
                  )}
                </div>
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
                <div className="h-[320px] w-full">
                  {data.expenseBreakdown.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.expenseBreakdown}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={100}
                          paddingAngle={3}
                          dataKey="amount"
                          nameKey="category"
                          stroke="none"
                        >
                          {data.expenseBreakdown.map((_, index) => (
                            <Cell
                              key={`exp-cell-${index}`}
                              fill={EXPENSE_COLORS[index % EXPENSE_COLORS.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip content={<PieTooltip />} />
                        <Legend content={<CustomLegend />} />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center empty-state">
                      <div className="empty-state-icon">
                        <ShoppingCart className="w-6 h-6 text-red-300/50" />
                      </div>
                      <p className="empty-state-title">لا توجد مصروفات</p>
                      <p className="empty-state-description mt-1">لم يتم تسجيل مصروفات في هذه الفترة</p>
                    </div>
                  )}
                </div>
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
                <div className="h-48 flex items-center justify-center empty-state">
                  <div className="empty-state-icon">
                    <Package className="w-6 h-6 text-primary/30" />
                  </div>
                  <p className="empty-state-title">لا توجد منتجات مبيعة</p>
                  <p className="empty-state-description mt-1">ستظهر المنتجات الأعلى مبيعاً بعد تسجيل عمليات البيع</p>
                </div>
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
      ) : null}

      {/* ─── Empty state for custom range not yet fetched ─────────── */}
      {!loading && !data && selectedPreset === 'custom' && (
        <div className="flex flex-col items-center justify-center py-16 empty-state">
          <div className="empty-state-icon">
            <CalendarDays className="w-8 h-8 text-primary/30" />
          </div>
          <p className="empty-state-title">اختر نطاق التاريخ</p>
          <p className="empty-state-description mt-1">حدد تاريخ البداية والنهاية ثم اضغط &quot;عرض التقرير&quot;</p>
        </div>
      )}
    </div>
  )
}
