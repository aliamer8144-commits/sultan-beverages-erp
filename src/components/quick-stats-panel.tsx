'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore, type Screen } from '@/store/app-store'
import { useCurrency } from '@/hooks/use-currency'
import { toast } from 'sonner'
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  TrendingDown,
  FileText,
  AlertTriangle,
  Receipt,
  Users,
  X,
  ArrowLeft,
  RefreshCw,
  Percent,
  Trophy,
  Activity,
  Clock,
  Package,
  Target,
  Truck,
  Wallet,
  CalendarDays,
  CheckCircle2,
  Crown,
  ShoppingCart,
  BarChart,
  Minimize2,
  Maximize2,
  Zap,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────
interface TopProduct {
  name: string
  quantity: number
}

interface RecentActivityItem {
  id: string
  action: string
  entity: string
  details: Record<string, unknown> | null
  userName: string | null
  createdAt: string
}

interface TrendData {
  value: number
  previous: number
  change: number
  period: string
}

interface StatsData {
  totalSalesToday: number
  totalProfitToday: number
  profitMargin: number
  invoicesCountToday: number
  lowStockProducts: number
  totalCustomers: number
  totalExpensesToday: number
  topProducts: TopProduct[]
  recentActivity: RecentActivityItem[]
  salesTargetProgress: number | null
  totalProducts: number
  totalSuppliers: number
  totalDebt: number
  monthlySales: number
  totalExpenses: number
  topCustomerTodayName: string | null
  itemsSoldToday: number
  averageSaleToday: number
  trends: {
    salesToday: TrendData
    profitToday: TrendData
    invoicesToday: TrendData
    monthlySales: TrendData
    expensesToday: TrendData
  }
}

// ─── Relative Arabic time ───────────────────────────────────────────
function relativeArabicTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diffMs / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (minutes < 1) return 'الآن'
  if (minutes < 2) return 'منذ دقيقة'
  if (minutes < 11) return `منذ ${minutes} دقائق`
  if (minutes < 60) return 'منذ نصف ساعة'
  if (hours < 2) return 'منذ ساعة'
  if (hours < 11) return `منذ ${hours} ساعات`
  if (hours < 24) return 'منذ ١٢ ساعة'
  if (days < 2) return 'منذ يوم'
  return `منذ ${days} أيام`
}

// ─── Activity action labels (Arabic) ────────────────────────────────
function activityLabel(action: string, entity: string, details: Record<string, unknown> | null): string {
  const name = (details?.name as string) || ''
  switch (action) {
    case 'create':
      if (entity === 'Invoice') return `فاتورة جديدة ${details?.invoiceNo ? `#${details.invoiceNo}` : ''}`
      if (entity === 'Product') return `إضافة منتج: ${name}`
      if (entity === 'Customer') return `عميل جديد: ${name}`
      return `إنشاء ${entity}`
    case 'update':
      if (entity === 'Product') return `تحديث منتج: ${name}`
      return `تحديث ${entity}`
    case 'delete':
      return `حذف ${entity}`
    case 'login':
      return `تسجيل دخول`
    case 'logout':
      return `تسجيل خروج`
    case 'payment':
      return `دفعة جديدة: ${(details?.amount ?? 0)} ${details?.customerName ? `— ${details.customerName}` : ''}`
    case 'backup':
      return `نسخ احتياطي`
    case 'restore':
      return `استعادة بيانات`
    default:
      return `${action} — ${entity}`
  }
}

// ─── Activity icon + color ──────────────────────────────────────────
function activityMeta(action: string) {
  switch (action) {
    case 'create':
      return { icon: Package, color: 'text-emerald-500', bg: 'bg-emerald-500/10' }
    case 'update':
      return { icon: RefreshCw, color: 'text-blue-500', bg: 'bg-blue-500/10' }
    case 'delete':
      return { icon: X, color: 'text-red-500', bg: 'bg-red-500/10' }
    case 'login':
    case 'logout':
      return { icon: Users, color: 'text-violet-500', bg: 'bg-violet-500/10' }
    case 'payment':
      return { icon: Receipt, color: 'text-green-500', bg: 'bg-green-500/10' }
    case 'backup':
    case 'restore':
      return { icon: Activity, color: 'text-amber-500', bg: 'bg-amber-500/10' }
    default:
      return { icon: Activity, color: 'text-muted-foreground', bg: 'bg-muted' }
  }
}

// ─── Skeleton Loaders ───────────────────────────────────────────────
function MetricSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl">
      <div className="skeleton-shimmer w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton-shimmer h-3 w-24 rounded-md" />
        <div className="skeleton-shimmer h-5 w-20 rounded-md" />
      </div>
      <div className="skeleton-shimmer h-5 w-16 rounded-lg" />
    </div>
  )
}

function TopProductsSkeleton() {
  return (
    <div className="p-3 space-y-2">
      <div className="skeleton-shimmer h-3 w-28 rounded-md" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="flex items-center gap-2">
          <div className="skeleton-shimmer w-5 h-5 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton-shimmer h-3 w-24 rounded-md" />
            <div className="skeleton-shimmer h-2 w-12 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentActivitySkeleton() {
  return (
    <div className="p-3 space-y-2.5">
      <div className="skeleton-shimmer h-3 w-28 rounded-md" />
      {[1, 2, 3, 4, 5].map((i) => (
        <div key={i} className="flex items-start gap-2.5">
          <div className="skeleton-shimmer w-6 h-6 rounded-full flex-shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton-shimmer h-3 w-32 rounded-md" />
            <div className="skeleton-shimmer h-2 w-16 rounded" />
          </div>
        </div>
      ))}
    </div>
  )
}

function ProgressSkeleton() {
  return (
    <div className="p-3 space-y-2.5">
      <div className="flex items-center justify-between">
        <div className="skeleton-shimmer h-3 w-28 rounded-md" />
        <div className="skeleton-shimmer h-4 w-10 rounded-md" />
      </div>
      <div className="skeleton-shimmer h-2.5 w-full rounded-full" />
    </div>
  )
}

// ─── Trend Indicator Component ──────────────────────────────────────
function TrendIndicator({ trend, compact }: { trend?: TrendData; compact?: boolean }) {
  if (!trend || compact) return null

  const isPositive = trend.change > 0
  const isNeutral = trend.change === 0

  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${
      isNeutral
        ? 'bg-muted'
        : isPositive
          ? 'bg-emerald-50 dark:bg-emerald-500/10'
          : 'bg-red-50 dark:bg-red-500/10'
    }`}>
      {isPositive ? (
        <TrendingUp className="w-3 h-3 text-emerald-500" />
      ) : isNeutral ? (
        <Activity className="w-3 h-3 text-muted-foreground" />
      ) : (
        <TrendingDown className="w-3 h-3 text-red-500" />
      )}
      <span className={`text-[10px] font-semibold tabular-nums ${
        isNeutral
          ? 'text-muted-foreground'
          : isPositive
            ? 'text-emerald-600 dark:text-emerald-400'
            : 'text-red-600 dark:text-red-400'
      }`}>
        {isPositive ? '+' : ''}{trend.change}%
      </span>
    </div>
  )
}

// ─── Single Metric Row ──────────────────────────────────────────────
function MetricRow({
  label,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  valueColor,
  suffix,
  trend,
  navigateTo,
  onNavigate,
  compact,
}: {
  label: string
  value: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  valueColor: string
  suffix?: string
  trend?: TrendData
  navigateTo?: Screen
  onNavigate?: (screen: Screen) => void
  compact?: boolean
}) {
  const isClickable = !!navigateTo && !!onNavigate

  return (
    <div
      onClick={() => isClickable && onNavigate!(navigateTo!)}
      className={`flex items-center gap-3 p-3 rounded-xl transition-all duration-200 group data-card-micro ${
        isClickable ? 'cursor-pointer hover:bg-primary/5 active:scale-[0.98]' : 'hover:bg-muted/40'
      } ${compact ? 'p-2 gap-2' : ''}`}
    >
      <div className={`w-10 h-10 rounded-xl ${iconBg} flex items-center justify-center flex-shrink-0 ${compact ? 'w-8 h-8' : ''}`}>
        <Icon className={`w-5 h-5 ${iconColor} ${compact ? 'w-4 h-4' : ''}`} />
      </div>

      <div className="flex-1 min-w-0">
        <p className={`text-[11px] font-medium text-muted-foreground leading-tight ${compact ? 'text-[10px]' : ''}`}>{label}</p>
        <p className={`font-bold ${valueColor} tabular-nums leading-snug mt-0.5 ${compact ? 'text-sm' : 'text-base'}`}>
          {value}
          {suffix && <span className="text-xs font-medium opacity-70 mr-1">{suffix}</span>}
        </p>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <TrendIndicator trend={trend} compact={compact} />
        {isClickable && (
          <ArrowLeft className="w-3 h-3 text-muted-foreground/40 group-hover:text-primary opacity-0 group-hover:opacity-100 transition-all -translate-x-1 group-hover:translate-x-0" />
        )}
      </div>
    </div>
  )
}

// ─── Sales Target Progress Bar ──────────────────────────────────────
function SalesTargetProgress({ progress }: { progress: number }) {
  const clamped = Math.min(Math.max(progress, 0), 100)
  const barColor =
    clamped >= 80
      ? 'bg-emerald-500'
      : clamped >= 50
        ? 'bg-amber-500'
        : 'bg-red-500'

  const textColor =
    clamped >= 80
      ? 'text-emerald-600 dark:text-emerald-400'
      : clamped >= 50
        ? 'text-amber-600 dark:text-amber-400'
        : 'text-red-600 dark:text-red-400'

  return (
    <div className="p-3">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <Target className="w-3.5 h-3.5 text-primary" />
          <span className="text-[11px] font-medium text-muted-foreground">هدف المبيعات الشهري</span>
        </div>
        <span className={`text-xs font-bold tabular-nums ${textColor}`}>{clamped}%</span>
      </div>
      <div className="w-full h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full progress-bar-animated progress-bar-striped-animated ${barColor}`}
          style={{ width: `${clamped}%` }}
        />
      </div>
      {clamped >= 100 && (
        <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-1.5 flex items-center gap-1">
          <Trophy className="w-3 h-3" />
          تم تحقيق الهدف! 🎉
        </p>
      )}
    </div>
  )
}

// ─── Auto Refresh Countdown ─────────────────────────────────────────
function RefreshCountdown({ refreshing, lastRefreshAt }: { refreshing: boolean; lastRefreshAt: Date | null }) {
  const [countdown, setCountdown] = useState(30)

  useEffect(() => {
    // When lastRefreshAt changes, reset countdown via interval
    const interval = setInterval(() => {
      setCountdown((prev) => (prev <= 1 ? 30 : prev - 1))
    }, 1000)
    return () => clearInterval(interval)
  }, [lastRefreshAt])

  // Reset to 30 whenever refreshing starts
  useEffect(() => {
    if (refreshing) {
      // We set it via the interval callback to avoid direct setState in effect
      const id = requestAnimationFrame(() => setCountdown(30))
      return () => cancelAnimationFrame(id)
    }
  }, [refreshing])

  const progress = refreshing ? 100 : Math.round(((30 - countdown) / 30) * 100)

  return (
    <div className="flex items-center gap-1.5">
      <div className="w-4 h-4 relative">
        <svg className="w-4 h-4 -rotate-90" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="6" fill="none" className="stroke-muted" strokeWidth="2" />
          <circle
            cx="8" cy="8" r="6" fill="none"
            className={refreshing ? 'stroke-primary' : 'stroke-primary/60'}
            strokeWidth="2"
            strokeDasharray={`${progress * 0.377} 37.7`}
            strokeLinecap="round"
            style={{ transition: refreshing ? 'none' : 'stroke-dasharray 1s linear' }}
          />
        </svg>
        {refreshing && (
          <RefreshCw className="w-2 h-2 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-primary animate-spin" />
        )}
      </div>
      {!refreshing && countdown <= 5 && (
        <Zap className="w-3 h-3 text-amber-500 animate-pulse" />
      )}
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────
export function QuickStatsPanel() {
  const { setScreen } = useAppStore()
  const { formatCurrency, symbol } = useCurrency()
  const [isOpen, setIsOpen] = useState(false)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [compact, setCompact] = useState(false)
  const [lastRefreshAt, setLastRefreshAt] = useState<Date | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Navigate to a screen ───────────────────────────────────────
  const handleNavigate = useCallback((screen: Screen) => {
    setIsOpen(false)
    setScreen(screen)
  }, [setScreen])

  // ── Fetch all stats from single endpoint ─────────────────────────
  const fetchStats = useCallback(
    async (isRefresh = false) => {
      if (isRefresh) setRefreshing(true)

      try {
        const res = await fetch('/api/quick-stats')
        const json = await res.json()

        if (json.success && json.data) {
          setStats(json.data)
          setLastRefreshAt(new Date())
        } else {
          toast.error('فشل في تحميل الإحصائيات')
        }
      } catch {
        toast.error('فشل في تحميل الإحصائيات')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [],
  )

  // ── Initial load + auto-refresh every 30s ─────────────────────────
  useEffect(() => {
    fetchStats()
    intervalRef.current = setInterval(() => fetchStats(true), 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchStats])

  // ── Close on click outside ────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      if (
        isOpen &&
        panelRef.current &&
        !panelRef.current.contains(target) &&
        !target.closest('[data-fab-button]')
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // ── Close on Escape ───────────────────────────────────────────────
  useEffect(() => {
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen])

  // ── Derive profit margin color ────────────────────────────────────
  const profitMarginColor =
    stats && stats.profitMargin > 0
      ? 'text-emerald-600 dark:text-emerald-400'
      : stats && stats.profitMargin < 0
        ? 'text-red-600 dark:text-red-400'
        : 'text-muted-foreground'

  return (
    <>
      {/* ── Stats Panel ─────────────────────────────────────────── */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 left-4 sm:left-6 z-[100] w-[calc(100vw-2rem)] sm:${compact ? 'w-[320px]' : 'w-[400px]'} transition-all duration-300 ease-out ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        dir="rtl"
      >
        <div className="glass-card-v2 rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden border border-border/50 flex flex-col max-h-[85vh]">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 pb-2 flex-shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-4.5 h-4.5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">إحصائيات سريعة</h3>
                <p className="text-[10px] text-muted-foreground">تحديث تلقائي كل ٣٠ ثانية</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {/* Auto-refresh indicator */}
              <RefreshCountdown refreshing={refreshing} lastRefreshAt={lastRefreshAt} />

              {/* Refresh button */}
              <button
                onClick={() => fetchStats(true)}
                disabled={refreshing}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label="تحديث"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              </button>

              {/* Compact toggle */}
              <button
                onClick={() => setCompact(!compact)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label={compact ? 'عرض موسع' : 'عرض مضغوط'}
              >
                {compact ? (
                  <Maximize2 className="w-3.5 h-3.5" />
                ) : (
                  <Minimize2 className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Close button */}
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                aria-label="إغلاق"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="mx-4 h-px bg-border/40 flex-shrink-0" />

          {/* Scrollable content */}
          <div className="overflow-y-auto flex-1 min-h-0">
            {loading ? (
              // ── Skeleton Loading ─────────────────────────────
              <div className="space-y-0.5">
                {Array.from({ length: compact ? 4 : 6 }).map((_, i) => (
                  <MetricSkeleton key={`m-${i}`} />
                ))}
                {!compact && (
                  <>
                    <TopProductsSkeleton />
                    <ProgressSkeleton />
                    <RecentActivitySkeleton />
                  </>
                )}
              </div>
            ) : stats ? (
              // ── Actual Data ──────────────────────────────────
              <div className="animate-fade-in-up">
                {/* ── Metric Rows ─────────────────────────────── */}
                <div className="space-y-0.5">
                  <MetricRow
                    label="إجمالي المبيعات اليوم"
                    value={`${formatCurrency(stats.totalSalesToday)} ${symbol}`}
                    icon={DollarSign}
                    iconBg="bg-emerald-50 dark:bg-emerald-500/10"
                    iconColor="text-emerald-500"
                    valueColor="text-emerald-600 dark:text-emerald-400"
                    trend={stats.trends.salesToday}
                    navigateTo="dashboard"
                    onNavigate={handleNavigate}
                    compact={compact}
                  />

                  <MetricRow
                    label="صافي الربح"
                    value={`${formatCurrency(stats.totalProfitToday)} ${symbol}`}
                    icon={TrendingUp}
                    iconBg={stats.totalProfitToday >= 0 ? 'bg-green-50 dark:bg-green-500/10' : 'bg-red-50 dark:bg-red-500/10'}
                    iconColor={stats.totalProfitToday >= 0 ? 'text-green-500' : 'text-red-500'}
                    valueColor={stats.totalProfitToday >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}
                    trend={stats.trends.profitToday}
                    navigateTo="dashboard"
                    onNavigate={handleNavigate}
                    compact={compact}
                  />

                  {!compact && (
                    <>
                      {/* Profit Margin */}
                      <MetricRow
                        label="معدل الربح"
                        value={`${Math.abs(stats.profitMargin)}%`}
                        icon={Percent}
                        iconBg={stats.profitMargin >= 0 ? 'bg-emerald-50 dark:bg-emerald-500/10' : 'bg-red-50 dark:bg-red-500/10'}
                        iconColor={stats.profitMargin >= 0 ? 'text-emerald-500' : 'text-red-500'}
                        valueColor={profitMarginColor}
                        compact={compact}
                      />
                    </>
                  )}

                  <MetricRow
                    label="عدد الفواتير"
                    value={stats.invoicesCountToday.toLocaleString('ar-SA')}
                    icon={FileText}
                    iconBg="bg-blue-50 dark:bg-blue-500/10"
                    iconColor="text-blue-500"
                    valueColor="text-blue-600 dark:text-blue-400"
                    trend={stats.trends.invoicesToday}
                    navigateTo="invoices"
                    onNavigate={handleNavigate}
                    compact={compact}
                  />

                  <MetricRow
                    label="منتجات منخفضة المخزون"
                    value={stats.lowStockProducts.toLocaleString('ar-SA')}
                    icon={AlertTriangle}
                    iconBg="bg-amber-50 dark:bg-amber-500/10"
                    iconColor="text-amber-500"
                    valueColor={stats.lowStockProducts > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-green-600 dark:text-green-400'}
                    navigateTo="inventory"
                    onNavigate={handleNavigate}
                    compact={compact}
                  />

                  <MetricRow
                    label="إجمالي المصروفات اليوم"
                    value={`${formatCurrency(stats.totalExpensesToday)} ${symbol}`}
                    icon={Receipt}
                    iconBg="bg-red-50 dark:bg-red-500/10"
                    iconColor="text-red-500"
                    valueColor="text-red-600 dark:text-red-400"
                    trend={stats.trends.expensesToday}
                    navigateTo="expenses"
                    onNavigate={handleNavigate}
                    compact={compact}
                  />

                  {!compact && (
                    <>
                      <MetricRow
                        label="عدد العملاء"
                        value={stats.totalCustomers.toLocaleString('ar-SA')}
                        icon={Users}
                        iconBg="bg-violet-50 dark:bg-violet-500/10"
                        iconColor="text-violet-500"
                        valueColor="text-violet-600 dark:text-violet-400"
                        navigateTo="customers"
                        onNavigate={handleNavigate}
                        compact={compact}
                      />

                      <MetricRow
                        label="عدد المنتجات"
                        value={stats.totalProducts.toLocaleString('ar-SA')}
                        icon={Package}
                        iconBg="bg-cyan-50 dark:bg-cyan-500/10"
                        iconColor="text-cyan-500"
                        valueColor="text-cyan-600 dark:text-cyan-400"
                        navigateTo="inventory"
                        onNavigate={handleNavigate}
                        compact={compact}
                      />

                      <MetricRow
                        label="عدد الموردين"
                        value={stats.totalSuppliers.toLocaleString('ar-SA')}
                        icon={Truck}
                        iconBg="bg-orange-50 dark:bg-orange-500/10"
                        iconColor="text-orange-500"
                        valueColor="text-orange-600 dark:text-orange-400"
                        navigateTo="purchases"
                        onNavigate={handleNavigate}
                        compact={compact}
                      />

                      <MetricRow
                        label="مبيعات الشهر"
                        value={`${formatCurrency(stats.monthlySales)} ${symbol}`}
                        icon={CalendarDays}
                        iconBg="bg-indigo-50 dark:bg-indigo-500/10"
                        iconColor="text-indigo-500"
                        valueColor="text-indigo-600 dark:text-indigo-400"
                        trend={stats.trends.monthlySales}
                        navigateTo="dashboard"
                        onNavigate={handleNavigate}
                        compact={compact}
                      />

                      <MetricRow
                        label="إجمالي مديونية العملاء"
                        value={`${formatCurrency(stats.totalDebt)} ${symbol}`}
                        icon={Wallet}
                        iconBg={stats.totalDebt > 0 ? 'bg-red-50 dark:bg-red-500/10' : 'bg-green-50 dark:bg-green-500/10'}
                        iconColor={stats.totalDebt > 0 ? 'text-red-500' : 'text-green-500'}
                        valueColor={stats.totalDebt > 0 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}
                        navigateTo="customers"
                        onNavigate={handleNavigate}
                        compact={compact}
                      />

                      <MetricRow
                        label="أفضل عميل اليوم"
                        value={stats.topCustomerTodayName || '—'}
                        icon={Crown}
                        iconBg="bg-amber-50 dark:bg-amber-500/10"
                        iconColor="text-amber-500"
                        valueColor="text-amber-600 dark:text-amber-400"
                        navigateTo="customers"
                        onNavigate={handleNavigate}
                        compact={compact}
                      />

                      <MetricRow
                        label="المنتجات المباعة اليوم"
                        value={stats.itemsSoldToday.toLocaleString('ar-SA')}
                        icon={ShoppingCart}
                        iconBg="bg-cyan-50 dark:bg-cyan-500/10"
                        iconColor="text-cyan-500"
                        valueColor="text-cyan-600 dark:text-cyan-400"
                        compact={compact}
                      />

                      <MetricRow
                        label="متوسط الفاتورة اليوم"
                        value={`${formatCurrency(stats.averageSaleToday)} ${symbol}`}
                        icon={BarChart}
                        iconBg="bg-violet-50 dark:bg-violet-500/10"
                        iconColor="text-violet-500"
                        valueColor="text-violet-600 dark:text-violet-400"
                        compact={compact}
                      />
                    </>
                  )}
                </div>

                {/* ── Divider ─────────────────────────────────── */}
                <div className="mx-3 h-px bg-border/40 my-1" />

                {/* ── Top Selling Products (hidden in compact mode) ─ */}
                {!compact && (
                  <>
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Trophy className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-[11px] font-semibold text-foreground">المنتجات الأكثر مبيعاً</span>
                        <span className="text-[10px] text-muted-foreground mr-auto">اليوم</span>
                      </div>
                      {stats.topProducts.length > 0 ? (
                        <div className="space-y-1.5">
                          {stats.topProducts.map((product, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted/50 transition-colors"
                            >
                              <span
                                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                                  idx === 0
                                    ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                    : idx === 1
                                      ? 'bg-gray-100 text-gray-600 dark:bg-gray-500/20 dark:text-gray-400'
                                      : 'bg-orange-50 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400'
                                }`}
                              >
                                {idx + 1}
                              </span>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium text-foreground truncate">{product.name}</p>
                              </div>
                              <span className="text-[11px] font-semibold text-muted-foreground tabular-nums flex-shrink-0">
                                {product.quantity} وحدة
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[11px] text-muted-foreground text-center py-2">لا توجد مبيعات اليوم</p>
                      )}
                    </div>

                    {/* ── Divider ─────────────────────────────────── */}
                    <div className="mx-3 h-px bg-border/40 my-0" />

                    {/* ── Sales Target Progress ───────────────────── */}
                    {stats.salesTargetProgress !== null ? (
                      <SalesTargetProgress progress={stats.salesTargetProgress} />
                    ) : null}

                    {/* ── Divider ─────────────────────────────────── */}
                    <div className="mx-3 h-px bg-border/40 my-0" />

                    {/* ── Recent Activity Feed ────────────────────── */}
                    <div className="p-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <Activity className="w-3.5 h-3.5 text-primary" />
                        <span className="text-[11px] font-semibold text-foreground">آخر العمليات</span>
                      </div>
                      <div className="space-y-2">
                        {stats.recentActivity.map((item) => {
                          const meta = activityMeta(item.action)
                          const Icon = meta.icon
                          return (
                            <div key={item.id} className="flex items-start gap-2.5 group/act">
                              <div
                                className={`w-6 h-6 rounded-full ${meta.bg} flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors group-hover/act:scale-110`}
                              >
                                <Icon className={`w-3 h-3 ${meta.color}`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[11px] font-medium text-foreground leading-tight truncate">
                                  {activityLabel(item.action, item.entity, item.details)}
                                </p>
                                <div className="flex items-center gap-1 mt-0.5">
                                  <Clock className="w-2.5 h-2.5 text-muted-foreground/60" />
                                  <span className="text-[10px] text-muted-foreground">
                                    {item.userName ? `${item.userName} · ` : ''}
                                    {relativeArabicTime(item.createdAt)}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              // ── Error / empty state ──────────────────────────
              <div className="py-8 text-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">لا توجد بيانات متاحة</p>
              </div>
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-3 pt-1 flex-shrink-0">
            <button
              onClick={() => handleNavigate('dashboard')}
              className="btn-ripple w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary font-semibold text-sm transition-colors"
            >
              <span>عرض التقارير</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ── Floating Action Button (FAB) ─────────────────────────── */}
      <button
        data-fab-button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 left-4 sm:left-6 z-[101] fab fab-primary w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 ease-out group ${
          isOpen
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30 scale-110'
            : 'glass-card bg-primary/90 text-primary-foreground animate-pulse-glow'
        }`}
        aria-label={isOpen ? 'إغلاق الإحصائيات' : 'عرض الإحصائيات السريعة'}
      >
        <div className="relative w-6 h-6">
          <BarChart3
            className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${
              isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-100 rotate-0 scale-100'
            }`}
          />
          <X
            className={`w-6 h-6 absolute inset-0 transition-all duration-300 ${
              isOpen ? 'opacity-100 rotate-0 scale-100' : 'opacity-0 -rotate-90 scale-0'
            }`}
          />
        </div>

        {/* Live indicator dot when open */}
        {isOpen && (
          <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-green-500 border-2 border-white dark:border-card status-dot-live" />
        )}
      </button>
    </>
  )
}
