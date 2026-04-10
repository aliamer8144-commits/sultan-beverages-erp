'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts'
import { DollarSign, TrendingUp, FileText, AlertTriangle, RefreshCw, Download, Target, Clock, Flame } from 'lucide-react'
import { exportToCSV } from '@/lib/export-csv'

// Chart color palette matching the theme
const CHART_COLORS = ['#3b5bdb', '#364fc7', '#5c7cfa', '#e03131', '#c92a2a', '#0ca678', '#f08c00', '#9c36b5', '#1c7ed6', '#e8590c']

// Type for dashboard data
interface TopProduct {
  name: string
  quantity: number
}

interface RecentSale {
  id: string
  invoiceNo: string
  customerName: string
  total: number
  createdAt: string
}

interface MonthlySale {
  month: string
  total: number
}

interface CategorySale {
  name: string
  value: number
}

interface SalesTargetData {
  id: string
  type: string
  targetAmount: number
  currentAmount: number
  progressPercent: number
  remainingAmount: number
  daysRemaining: number
  hoursRemaining: number
  isActive: boolean
  startDate: string
  endDate: string | null
}

interface DashboardData {
  todaySales: number
  todayProfit: number
  todayInvoiceCount: number
  lowStockCount: number
  topProducts: TopProduct[]
  recentSales: RecentSale[]
  monthlySales: MonthlySale[]
  salesByCategory: CategorySale[]
}

// Animated number counter hook
function useAnimatedNumber(target: number, duration = 1200) {
  const [display, setDisplay] = useState(0)
  const rafRef = useRef<number | null>(null)
  const startTimeRef = useRef<number | null>(null)

  useEffect(() => {
    if (target === 0) {
      const id = requestAnimationFrame(() => setDisplay(0))
      return () => cancelAnimationFrame(id)
    }

    startTimeRef.current = null

    const animate = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp
      const elapsed = timestamp - startTimeRef.current
      const progress = Math.min(elapsed / duration, 1)

      // easeOutExpo
      const eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress)
      setDisplay(eased * target)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
    }
  }, [target, duration])

  return display
}

// Format date to Arabic locale
function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

// Format currency
function formatCurrency(amount: number): string {
  return amount.toFixed(2)
}

// Custom tooltip for bar charts
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; payload?: { name?: string } }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">
        {formatCurrency(payload[0].value)} ر.س
      </p>
    </div>
  )
}

function TopProductTooltip({ active, payload }: { active?: boolean; payload?: Array<{ value: number; payload?: { name?: string } }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{item.payload?.name}</p>
      <p className="text-sm font-bold text-foreground">
        {item.value} وحدة
      </p>
    </div>
  )
}

// Pie chart tooltip
function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{item.payload.name}</p>
      <p className="text-sm font-bold text-foreground">
        {formatCurrency(item.value)} ر.س
      </p>
    </div>
  )
}

// Custom legend renderer
function CustomLegend({ payload }: { payload?: Array<{ value: string; color: string }> }) {
  if (!payload) return null
  return (
    <div className="flex flex-wrap gap-3 justify-center mt-2">
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-1.5">
          <span
            className="w-2.5 h-2.5 rounded-full inline-block flex-shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-xs text-muted-foreground whitespace-nowrap">{entry.value}</span>
        </div>
      ))}
    </div>
  )
}

// Loading skeleton for summary cards
function SummaryCardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton-shimmer h-4 w-24 rounded" />
            <div className="skeleton-shimmer h-9 w-28 rounded" />
            <div className="skeleton-shimmer h-3 w-16 rounded" />
          </div>
          <div className="skeleton-shimmer w-12 h-12 rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  )
}

// Loading skeleton for chart
function ChartSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="skeleton-shimmer h-5 w-36 rounded" />
        <div className="skeleton-shimmer h-3 w-48 rounded mt-1" />
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="skeleton-shimmer h-[280px] w-full rounded-xl" />
      </CardContent>
    </Card>
  )
}

// Stat card with animated number
function StatCard({ label, value, suffix, icon: Icon, iconBg, statClass, isInteger = false }: {
  label: string
  value: number
  suffix: string
  icon: typeof DollarSign
  iconBg: string
  statClass: string
  isInteger?: boolean
}) {
  const animatedValue = useAnimatedNumber(value)

  return (
    <Card className={`rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro ${statClass}`}>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">
              {isInteger ? Math.round(animatedValue).toLocaleString('ar-SA') : formatCurrency(animatedValue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">{suffix}</p>
          </div>
          <div className={`w-12 h-12 rounded-2xl ${iconBg} flex items-center justify-center`}>
            <Icon className="w-6 h-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Motivational Arabic message based on progress ─────────────────
function getMotivationalMessage(percent: number): string {
  if (percent >= 100) return '🎉 أحسنت! لقد حققت الهدف! استمر في العطاء'
  if (percent >= 80) return '🔥 قريب جداً! استمر بنفس الحماس'
  if (percent >= 60) return '💪 أداء رائع! أنت على الطريق الصحيح'
  if (percent >= 40) return '📈 تقدم جيد! كل فاتورة تقربك من الهدف'
  if (percent >= 20) return '🚀 البداية كانت ممتازة! واصل البيع'
  return '🎯 بداية جديدة! كل مبيعاتك تُحسب'
}

function getProgressColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function getProgressRingColor(percent: number): string {
  if (percent >= 80) return 'stroke-emerald-500'
  if (percent >= 50) return 'stroke-amber-500'
  return 'stroke-red-500'
}

function getProgressBgColor(percent: number): string {
  if (percent >= 80) return 'bg-emerald-500/10 text-emerald-700'
  if (percent >= 50) return 'bg-amber-500/10 text-amber-700'
  return 'bg-red-500/10 text-red-700'
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = { daily: 'اليومي', weekly: 'الأسبوعي', monthly: 'الشهري' }
  return labels[type] || type
}

// ─── Sales Target Widget ─────────────────────────────────────────
function SalesTargetWidget() {
  const [target, setTarget] = useState<SalesTargetData | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchTarget = useCallback(async () => {
    try {
      const res = await fetch('/api/sales-targets')
      const json = await res.json()
      if (json.success) {
        setTarget(json.data)
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchTarget()
    const interval = setInterval(fetchTarget, 60000) // refresh every 60s
    return () => clearInterval(interval)
  }, [fetchTarget])

  if (loading) {
    return (
      <Card className="rounded-2xl border-0 shadow-sm">
        <CardContent className="p-6">
          <div className="skeleton-shimmer h-32 w-full rounded-xl" />
        </CardContent>
      </Card>
    )
  }

  if (!target) return null

  const percent = target.progressPercent
  const isComplete = percent >= 100
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference

  return (
    <Card className={`rounded-2xl border-0 shadow-sm card-hover stat-card-gradient relative overflow-hidden ${isComplete ? 'stat-card-green' : ''}`}>
      <CardContent className="p-6 relative z-10">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Circular Progress */}
          <div className={`relative w-28 h-28 flex-shrink-0 ${isComplete ? 'animate-pulse-glow' : ''}`}>
            <svg className="w-28 h-28 -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="45" fill="none" className="stroke-muted/30" strokeWidth="8" />
              <circle
                cx="50" cy="50" r="45" fill="none"
                className={`${getProgressRingColor(percent)} progress-bar-animated`}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-2xl font-bold tabular-nums ${isComplete ? 'text-emerald-600' : 'text-foreground'}`}>                {percent.toFixed(0)}%
              </span>
              <span className="text-[10px] text-muted-foreground">مكتمل</span>
            </div>
          </div>

          {/* Details */}
          <div className="flex-1 text-center sm:text-right space-y-3 w-full">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <Target className="w-5 h-5 text-primary" />
              <h3 className="text-base font-bold text-foreground">
                هدف المبيعات {getTypeLabel(target.type)}
              </h3>
              {isComplete && (
                <span className="badge-active text-[10px]">
                  <Flame className="w-3 h-3" />
                  تم التحقيق
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-xs text-muted-foreground">الهدف</p>
                <p className="text-sm font-bold text-foreground tabular-nums">{formatCurrency(target.targetAmount)}</p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">الحالي</p>
                <p className={`text-sm font-bold tabular-nums ${isComplete ? 'text-emerald-600' : getProgressBgColor(percent).split(' ')[1]}`}>                  {formatCurrency(target.currentAmount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">المتبقي</p>
                <p className="text-sm font-bold text-foreground tabular-nums">
                  {isComplete ? '0.00' : formatCurrency(target.remainingAmount)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground">الوقت المتبقي</p>
                <p className="text-sm font-bold text-foreground tabular-nums flex items-center justify-center gap-1">
                  <Clock className="w-3 h-3" />
                  {target.daysRemaining > 0 ? `${target.daysRemaining} يوم` : target.hoursRemaining > 0 ? `${target.hoursRemaining} ساعة` : 'انتهى'}
                </p>
              </div>
            </div>

            {/* Progress bar */}
            <div className="space-y-1.5">
              <div className="relative h-2.5 rounded-full bg-muted/60 overflow-hidden">
                <div
                  className={`absolute inset-y-0 right-0 rounded-full progress-bar-animated ${getProgressColor(percent)} ${isComplete ? 'shimmer' : ''}`}
                  style={{ width: `${Math.min(percent, 100)}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground">
                {getMotivationalMessage(percent)}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export function DashboardScreen() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  const fetchDashboard = async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/dashboard')
      const json = await res.json()
      if (json.success) {
        setData(json.data)
      }
    } catch {
      // Silently handle error - data stays null
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    fetchDashboard()
  }, [])

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl md:text-2xl font-bold text-foreground">لوحة التحكم والتقارير</h2>
          <p className="text-sm text-muted-foreground mt-1">نظرة عامة على أداء المبيعات والمخزون</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              if (data && data.recentSales.length > 0) {
                exportToCSV(
                  data.recentSales.map((sale) => ({
                    'رقم الفاتورة': sale.invoiceNo,
                    'العميل': sale.customerName,
                    'المبلغ': sale.total,
                    'التاريخ': formatDate(sale.createdAt),
                  })),
                  'تقرير-المبيعات'
                )
              }
            }}
            disabled={!data || data.recentSales.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير التقرير</span>
          </button>
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
        </div>
      </div>

      {/* Sales Target Widget */}
      <SalesTargetWidget />

      {/* Summary Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : data ? (
        <div className="relative">
          <div className="glow-orb-blue" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {/* Today's Sales */}
          <StatCard
            label="مبيعات اليوم"
            value={data.todaySales}
            suffix="ريال سعودي"
            icon={DollarSign}
            iconBg="bg-primary/10 text-primary"
            statClass="stat-card-blue"
          />

          {/* Today's Profit */}
          <StatCard
            label="أرباح اليوم"
            value={data.todayProfit}
            suffix="ريال سعودي"
            icon={TrendingUp}
            iconBg="bg-green-500/10 text-green-600"
            statClass="stat-card-green"
          />

          {/* Today's Invoice Count */}
          <StatCard
            label="فواتير اليوم"
            value={data.todayInvoiceCount}
            suffix="فاتورة"
            icon={FileText}
            iconBg="bg-primary/10 text-primary"
            statClass="stat-card-blue"
            isInteger
          />

          {/* Low Stock Items */}
          <StatCard
            label="أصناف منخفضة المخزون"
            value={data.lowStockCount}
            suffix="صنف يحتاج إعادة طلب"
            icon={AlertTriangle}
            iconBg="bg-red-500/10 text-red-500"
            statClass="stat-card-red"
            isInteger
          />
          </div>
        </div>
      ) : null}

      {/* Charts Section */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : data ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
            {/* Monthly Sales Bar Chart */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-foreground">المبيعات الشهرية</CardTitle>
                <p className="text-xs text-muted-foreground">إجمالي المبيعات خلال آخر 6 أشهر</p>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.monthlySales} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
                      <XAxis
                        dataKey="month"
                        tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${(val / 1000).toFixed(0)}k`}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'oklch(0.55 0.2 260 / 8%)' }} />
                      <Bar
                        dataKey="total"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                        fill="#3b5bdb"
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Top 5 Selling Products */}
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold text-foreground">أفضل المنتجات مبيعاً</CardTitle>
                <p className="text-xs text-muted-foreground">أكثر 5 منتجات مبيعاً حسب الكمية</p>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="h-[280px] w-full">
                  {data.topProducts.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={data.topProducts}
                        layout="vertical"
                        margin={{ top: 5, right: 10, left: 10, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fontSize: 12, fill: 'oklch(0.5 0.01 260)' }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fontSize: 11, fill: 'oklch(0.35 0.01 260)' }}
                          axisLine={false}
                          tickLine={false}
                          width={100}
                        />
                        <Tooltip content={<TopProductTooltip />} cursor={{ fill: 'oklch(0.55 0.2 260 / 8%)' }} />
                        <Bar
                          dataKey="quantity"
                          radius={[0, 8, 8, 0]}
                          maxBarSize={30}
                          animationDuration={800}
                          animationEasing="ease-out"
                          animationBegin={200}
                        >
                          {data.topProducts.map((_, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center empty-state">
                      <div className="empty-state-icon">
                        <TrendingUp className="w-6 h-6 text-primary/30" />
                      </div>
                      <p className="empty-state-title">لا توجد بيانات مبيعات بعد</p>
                      <p className="empty-state-description mt-1">ستظهر أفضل المنتجات مبيعاً هنا بعد تسجيل أول عملية بيع</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="section-divider my-2" />

          {/* Pie Chart - Sales by Category */}
          <div className="animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-bold text-foreground">المبيعات حسب الفئة</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">توزيع إجمالي المبيعات على الفئات</p>
                  </div>
                  <Badge variant="secondary" className="rounded-lg text-xs">
                    {data.salesByCategory?.length ?? 0} فئة
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-2">
                <div className="h-[320px] w-full">
                  {data.salesByCategory && data.salesByCategory.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={data.salesByCategory}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                          stroke="none"
                        >
                          {data.salesByCategory.map((_, index) => (
                            <Cell
                              key={`pie-cell-${index}`}
                              fill={CHART_COLORS[index % CHART_COLORS.length]}
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
                        <DollarSign className="w-6 h-6 text-primary/30" />
                      </div>
                      <p className="empty-state-title">لا توجد بيانات مبيعات بعد</p>
                      <p className="empty-state-description mt-1">سيظهر توزيع المبيعات حسب الفئة هنا بعد تسجيل أول عملية بيع</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      ) : null}

      {/* Recent Sales Table */}
      {loading ? (
        <Card className="rounded-2xl border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="skeleton-shimmer h-5 w-36 rounded" />
            <div className="skeleton-shimmer h-3 w-48 rounded mt-1" />
          </CardHeader>
          <CardContent className="p-6 pt-0">
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="skeleton-shimmer h-12 w-full rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      ) : data ? (
        <div className="animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">أحدث المبيعات</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">آخر 10 فواتير بيع</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {data.recentSales.length} فاتورة
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-0">
              {data.recentSales.length > 0 ? (
                <ScrollArea className="max-h-96">
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4">رقم الفاتورة</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4">العميل</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4 text-left">المبلغ</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4">التاريخ</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {data.recentSales.map((sale, index) => (
                          <TableRow
                            key={sale.id}
                            className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                          >
                            <TableCell className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] font-bold text-primary">{index + 1}</span>
                                </div>
                                <span className="text-sm font-medium text-foreground font-mono">{sale.invoiceNo}</span>
                              </div>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-sm text-foreground">{sale.customerName}</span>
                            </TableCell>
                            <TableCell className="py-3 px-4 text-left">
                              <span className="text-sm font-bold text-foreground">
                                {formatCurrency(sale.total)}
                                <span className="text-[10px] text-muted-foreground mr-1">ر.س</span>
                              </span>
                            </TableCell>
                            <TableCell className="py-3 px-4">
                              <span className="text-xs text-muted-foreground">{formatDate(sale.createdAt)}</span>
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
                    <FileText className="w-6 h-6 text-primary/30" />
                  </div>
                  <p className="empty-state-title">لا توجد فواتير بيع بعد</p>
                  <p className="empty-state-description mt-1">ستظهر أحدث المعاملات هنا بعد تسجيل أول عملية بيع</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  )
}
