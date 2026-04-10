'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import {
  BarChart3,
  DollarSign,
  TrendingUp,
  FileText,
  AlertTriangle,
  Receipt,
  Users,
  X,
  ArrowLeft,
  RefreshCw,
} from 'lucide-react'

// ─── Types ──────────────────────────────────────────────────────────
interface StatsData {
  todaySales: number
  netProfit: number
  invoiceCount: number
  lowStockCount: number
  todayExpenses: number
  customerCount: number
}

interface MetricConfig {
  key: keyof StatsData
  label: string
  icon: React.ElementType
  color: string
  bgColor: string
  iconColor: string
  format: 'currency' | 'number'
  trendIcon: React.ElementType
  trendColor: string
  trendLabel: string
}

// ─── Metric Definitions ─────────────────────────────────────────────
const metrics: MetricConfig[] = [
  {
    key: 'todaySales',
    label: 'إجمالي المبيعات اليوم',
    icon: DollarSign,
    color: 'text-emerald-600 dark:text-emerald-400',
    bgColor: 'bg-emerald-50 dark:bg-emerald-500/10',
    iconColor: 'text-emerald-500',
    format: 'currency',
    trendIcon: TrendingUp,
    trendColor: 'text-emerald-500',
    trendLabel: 'اليوم',
  },
  {
    key: 'netProfit',
    label: 'صافي الربح',
    icon: TrendingUp,
    color: 'text-green-600 dark:text-green-400',
    bgColor: 'bg-green-50 dark:bg-green-500/10',
    iconColor: 'text-green-500',
    format: 'currency',
    trendIcon: TrendingUp,
    trendColor: 'text-green-500',
    trendLabel: 'صافي',
  },
  {
    key: 'invoiceCount',
    label: 'عدد الفواتير',
    icon: FileText,
    color: 'text-blue-600 dark:text-blue-400',
    bgColor: 'bg-blue-50 dark:bg-blue-500/10',
    iconColor: 'text-blue-500',
    format: 'number',
    trendIcon: FileText,
    trendColor: 'text-blue-400',
    trendLabel: 'فواتير',
  },
  {
    key: 'lowStockCount',
    label: 'منتجات منخفضة المخزون',
    icon: AlertTriangle,
    color: 'text-amber-600 dark:text-amber-400',
    bgColor: 'bg-amber-50 dark:bg-amber-500/10',
    iconColor: 'text-amber-500',
    format: 'number',
    trendIcon: AlertTriangle,
    trendColor: 'text-amber-500',
    trendLabel: 'تحذير',
  },
  {
    key: 'todayExpenses',
    label: 'إجمالي المصروفات اليوم',
    icon: Receipt,
    color: 'text-red-600 dark:text-red-400',
    bgColor: 'bg-red-50 dark:bg-red-500/10',
    iconColor: 'text-red-500',
    format: 'currency',
    trendIcon: Receipt,
    trendColor: 'text-red-400',
    trendLabel: 'مصروفات',
  },
  {
    key: 'customerCount',
    label: 'عدد العملاء',
    icon: Users,
    color: 'text-violet-600 dark:text-violet-400',
    bgColor: 'bg-violet-50 dark:bg-violet-500/10',
    iconColor: 'text-violet-500',
    format: 'number',
    trendIcon: Users,
    trendColor: 'text-violet-400',
    trendLabel: 'عملاء',
  },
]

// ─── Format helpers ─────────────────────────────────────────────────
function formatCurrency(value: number): string {
  return value.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function formatNumber(value: number): string {
  return value.toLocaleString('ar-SA')
}

// ─── Skeleton Loader ────────────────────────────────────────────────
function MetricSkeleton() {
  return (
    <div className="flex items-center gap-3 p-3 rounded-xl">
      <div className="skeleton-shimmer w-10 h-10 rounded-xl flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton-shimmer h-3 w-24 rounded-md" />
        <div className="skeleton-shimmer h-5 w-16 rounded-md" />
      </div>
    </div>
  )
}

// ─── Single Metric Row ──────────────────────────────────────────────
function MetricRow({ config, value }: { config: MetricConfig; value: number }) {
  const Icon = config.icon
  const TrendIcon = config.trendIcon
  const displayValue = config.format === 'currency'
    ? `${formatCurrency(value)} ر.س`
    : formatNumber(value)

  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl hover:bg-muted/40 transition-colors group`}>
      {/* Icon */}
      <div className={`w-10 h-10 rounded-xl ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
        <Icon className={`w-5 h-5 ${config.iconColor}`} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-muted-foreground leading-tight">{config.label}</p>
        <p className={`text-base font-bold ${config.color} tabular-nums leading-snug mt-0.5`}>
          {displayValue}
        </p>
      </div>

      {/* Trend indicator */}
      <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg ${config.bgColor}`}>
        <TrendIcon className={`w-3 h-3 ${config.trendColor}`} />
        <span className={`text-[10px] font-semibold ${config.trendColor}`}>{config.trendLabel}</span>
      </div>
    </div>
  )
}

// ─── Main Component ─────────────────────────────────────────────────
export function QuickStatsPanel() {
  const { setScreen } = useAppStore()
  const [isOpen, setIsOpen] = useState(false)
  const [stats, setStats] = useState<StatsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const panelRef = useRef<HTMLDivElement>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ── Fetch all stats data ──────────────────────────────────────────
  const fetchStats = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)

    try {
      const [dashboardRes, expensesRes, customersRes] = await Promise.all([
        fetch('/api/dashboard'),
        fetch('/api/expenses?range=week&limit=1'),
        fetch('/api/customers'),
      ])

      const [dashboardJson, expensesJson, customersJson] = await Promise.all([
        dashboardRes.json(),
        expensesRes.json(),
        customersRes.json(),
      ])

      const dashboardData = dashboardJson.data ?? {}
      const expensesSummary = expensesJson.data?.summary ?? {}

      setStats({
        todaySales: dashboardData.todaySales ?? 0,
        netProfit: dashboardData.todayProfit ?? 0,
        invoiceCount: dashboardData.todayInvoiceCount ?? 0,
        lowStockCount: dashboardData.lowStockCount ?? 0,
        todayExpenses: expensesSummary.todayExpenses ?? 0,
        customerCount: Array.isArray(customersJson.data) ? customersJson.data.length : 0,
      })
    } catch {
      toast.error('فشل في تحميل الإحصائيات')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  // ── Initial load + auto-refresh every 30s ─────────────────────────
  useEffect(() => {
    fetchStats()
    intervalRef.current = setInterval(() => fetchStats(), 30000)
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [fetchStats])

  // ── Close on click outside ────────────────────────────────────────
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as HTMLElement
      // Close if clicking outside the panel and not on the FAB
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

  return (
    <>
      {/* ── Stats Panel ─────────────────────────────────────────── */}
      <div
        ref={panelRef}
        className={`fixed bottom-24 left-6 z-[100] w-[340px] sm:w-[380px] transition-all duration-300 ease-out ${
          isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 translate-y-4 pointer-events-none'
        }`}
        dir="rtl"
      >
        <div className="glass-card rounded-2xl shadow-2xl shadow-black/10 dark:shadow-black/30 overflow-hidden border border-border/50">
          {/* Panel Header */}
          <div className="flex items-center justify-between p-4 pb-2">
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
              {/* Refresh button */}
              <button
                onClick={() => fetchStats(true)}
                disabled={refreshing}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
                aria-label="تحديث"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
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

          {/* Divider */}
          <div className="mx-4 h-px bg-border/40" />

          {/* Metrics Grid */}
          <div className="p-3 space-y-1 max-h-[380px] overflow-y-auto">
            {loading ? (
              // Skeleton loading
              <div className="space-y-1">
                {Array.from({ length: 6 }).map((_, i) => (
                  <MetricSkeleton key={i} />
                ))}
              </div>
            ) : stats ? (
              // Actual data
              <div className="animate-fade-in-up space-y-1">
                {metrics.map((config) => (
                  <MetricRow
                    key={config.key}
                    config={config}
                    value={stats[config.key]}
                  />
                ))}
              </div>
            ) : (
              // Error / empty state
              <div className="py-8 text-center">
                <BarChart3 className="w-10 h-10 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">لا توجد بيانات متاحة</p>
              </div>
            )}
          </div>

          {/* Panel Footer */}
          <div className="p-3 pt-1">
            <button
              onClick={() => {
                setIsOpen(false)
                setScreen('dashboard')
              }}
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
        className={`fixed bottom-6 left-6 z-[101] w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20 transition-all duration-300 ease-out group hover:shadow-xl hover:shadow-primary/30 hover:scale-105 active:scale-95 ${
          isOpen
            ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/30'
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
