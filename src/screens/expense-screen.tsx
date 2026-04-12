'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CategoryDef, ExpenseItem, CategorySummary, DailyTrend, RecurringItem, ExpenseSummary, ExpenseFetchResponse } from './expense/types'
import { EXPENSE_CATEGORIES, DATE_RANGE_OPTIONS, RECURRING_PERIODS } from './expense/types'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useConfirm, ConfirmDialog } from '@/components/confirm-dialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { AreaTrendChart, DonutChart } from '@/components/charts'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { exportToCSV } from '@/lib/export-csv'
import {
  formatCurrency,
  SummaryCardSkeleton,
  ChartSkeleton,
  TableSkeleton,
} from '@/components/chart-utils'
import { formatDate } from '@/lib/date-utils'
import { useApi } from '@/hooks/use-api'
import { useFormValidation } from '@/hooks/use-form-validation'
import { createExpenseSchema } from '@/lib/validations'
import { Pagination, EmptyState } from '@/components/empty-state'
import {
  Receipt,
  Plus,
  Download,
  RefreshCw,
  Trash2,
  Filter,
  X,
  Wallet,
  CalendarDays,
  CalendarRange,
  TrendingDown,
  Repeat,
  Loader2,
  Clock,
  BarChart3,
  ArrowDownUp,
} from 'lucide-react'

// ── Types and constants imported from ./expense/types ──

function getCategoryDef(categoryValue: string): CategoryDef {
  return EXPENSE_CATEGORIES.find((c) => c.value === categoryValue) || EXPENSE_CATEGORIES[5]
}

function getPeriodLabel(period: string | null): string {
  if (!period) return 'مرة واحدة'
  return RECURRING_PERIODS.find((p) => p.value === period)?.label || 'متكرر'
}

function getDateRange(range: string): { from: string; to: string } {
  const now = new Date()
  let from = ''
  const to = now.toISOString().split('T')[0]

  switch (range) {
    case 'week': {
      const day = now.getDay()
      const diff = now.getDate() - day + (day === 0 ? -6 : 1)
      const monday = new Date(now.setDate(diff))
      from = monday.toISOString().split('T')[0]
      break
    }
    case 'month':
      from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
      break
    case '3months':
      from = new Date(now.getFullYear(), now.getMonth() - 2, 1).toISOString().split('T')[0]
      break
    case 'year':
      from = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
      break
    default:
      from = ''
  }

  return { from, to }
}

// ── Category Icon Component ────────────────────────────────────────

function CategoryIcon({ category, size = 'sm' }: { category: string; size?: 'sm' | 'md' | 'lg' }) {
  const cat = getCategoryDef(category)
  const Icon = cat.icon
  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  }
  return <Icon className={`${sizeClasses[size]} ${cat.color}`} />
}

// ── Skeleton components imported from @/components/chart-utils ──────

function CategoryCardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm p-4">
      <div className="flex items-center gap-3">
        <div className="skeleton-shimmer w-11 h-11 rounded-xl flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="skeleton-shimmer h-4 w-24 rounded" />
          <div className="skeleton-shimmer h-3 w-20 rounded" />
          <div className="skeleton-shimmer h-2 w-16 rounded" />
        </div>
      </div>
    </Card>
  )
}

// ── Progress Bar ───────────────────────────────────────────────────

function CategoryProgressBar({ total, categoryTotal, color }: { total: number; categoryTotal: number; color: string }) {
  const percentage = total > 0 ? Math.round((categoryTotal / total) * 100) : 0
  return (
    <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden">
      <div
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ width: `${percentage}%`, backgroundColor: color }}
      />
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────

export function ExpenseScreen() {
  const { user } = useAppStore()
  const { get, post, del } = useApi()

  // Data state
  const [expenses, setExpenses] = useState<ExpenseItem[]>([])
  const [summary, setSummary] = useState<ExpenseSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentPage, setCurrentPage] = useState(1)
  const limit = 20

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('')
  const [dateRange, setDateRange] = useState('all')
  const [search, setSearch] = useState('')
  const [showFilters, setShowFilters] = useState(false)

  // Add dialog
  const [addDialogOpen, setAddDialogOpen] = useState(false)
  const [newCategory, setNewCategory] = useState('')
  const [newAmount, setNewAmount] = useState('')
  const [newDescription, setNewDescription] = useState('')
  const [newDate, setNewDate] = useState(new Date().toISOString().split('T')[0])
  const [newRecurring, setNewRecurring] = useState(false)
  const [newRecurringPeriod, setNewRecurringPeriod] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const deleteConfirm = useConfirm()
  const [deleteTarget, setDeleteTarget] = useState<ExpenseItem | null>(null)

  // Validation
  const v = useFormValidation({ schema: createExpenseSchema })

  // ── Fetch Data ─────────────────────────────────────────────────

  const fetchData = useCallback(async (page = 1, showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    const { from, to } = getDateRange(dateRange)
    const result = await get<ExpenseFetchResponse>('/api/expenses', {
      page,
      limit,
      category: categoryFilter || undefined,
      search: search.trim() || undefined,
      dateFrom: from || undefined,
      dateTo: to || undefined,
    }, { showErrorToast: false })

    if (result) {
       
      setExpenses(result.expenses || [])
       
      setTotal(result.total || 0)
       
      setTotalPages(result.totalPages || 1)
       
      setCurrentPage(result.page || 1)
       
      setSummary(result.summary || null)
    }

    setLoading(false)
    setRefreshing(false)
  }, [categoryFilter, dateRange, search, get])

  useEffect(() => {
    // Intentionally triggers data fetch that sets state — safe pattern
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData(1)
  }, [fetchData])

  // ── Handlers ───────────────────────────────────────────────────

  const handleAddExpense = async () => {
    if (!v.validate({
      category: newCategory,
      amount: newAmount,
      description: newDescription.trim(),
      date: newDate,
      recurring: newRecurring,
      recurringPeriod: newRecurring ? newRecurringPeriod : undefined,
    })) return

    setSubmitting(true)
    const result = await post('/api/expenses', {
      category: newCategory,
      amount: parseFloat(newAmount),
      description: newDescription.trim(),
      date: newDate,
      recurring: newRecurring,
      recurringPeriod: newRecurring ? newRecurringPeriod : null,
      userId: user?.id || '',
      userName: user?.name || null,
    }, { showSuccessToast: true, successMessage: 'تم إضافة المصروف بنجاح' })

    if (result) {
      resetAddForm()
      setAddDialogOpen(false)
      fetchData(1)
    }
    setSubmitting(false)
  }

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return
    const success = await del('/api/expenses?id=' + deleteTarget.id)

    if (success) {
      setDeleteTarget(null)
      fetchData(currentPage)
    }
  }

  const resetAddForm = () => {
    setNewCategory('')
    setNewAmount('')
    setNewDescription('')
    setNewDate(new Date().toISOString().split('T')[0])
    setNewRecurring(false)
    setNewRecurringPeriod('')
    v.clearAllErrors()
  }

  const handleExportCSV = () => {
    if (expenses.length === 0) {
      toast.error('لا توجد بيانات للتصدير')
      return
    }

    const exportData = expenses.map((e) => ({
      'الفئة': e.category,
      'المبلغ': e.amount,
      'الوصف': e.description,
      'التاريخ': formatDate(e.date),
      'متكرر': e.recurring ? 'نعم' : 'لا',
      'الفترة': e.recurringPeriod || '—',
      'بواسطة': e.userName || '—',
    }))

    exportToCSV(exportData, `المصروفات-${new Date().toLocaleDateString('ar-SA')}`)
    toast.success('تم تصدير المصروفات بنجاح')
  }

  const clearFilters = () => {
    setCategoryFilter('')
    setDateRange('all')
    setSearch('')
  }

  const hasActiveFilters = categoryFilter || dateRange !== 'all' || search.trim()

  // ── Computed Data ─────────────────────────────────────────────

  const categoryChartData = summary?.totalByCategory?.map((c) => {
    const catDef = getCategoryDef(c.category)
    return {
      name: c.category,
      value: c.total,
      color: catDef.hexColor,
    }
  }) || []

  const dailyTrendData = summary?.dailyTrend || []

  const categorySummaryData = summary?.totalByCategory || []
  const totalAllCategories = categorySummaryData.reduce((sum, c) => sum + c.total, 0)

  const recurringItems = summary?.recurringSummary || []

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Receipt className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">إدارة المصروفات</h2>
            <p className="text-sm text-muted-foreground">تتبع وتحليل المصروفات التشغيلية</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            disabled={expenses.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">تصدير</span>
          </button>
          {/* Add Expense */}
          <button
            onClick={() => {
              resetAddForm()
              setAddDialogOpen(true)
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium btn-ripple"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">إضافة مصروف</span>
          </button>
          {/* Refresh */}
          <button
            onClick={() => fetchData(currentPage, true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* ── Summary Stats Cards (5 cards) ──────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <SummaryCardSkeleton key={i} />)}
        </div>
      ) : summary ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 stagger-children">
          {/* Total Expenses */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro stat-card-blue">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">إجمالي المصروفات</p>
                  <p className="text-lg md:text-xl font-bold text-foreground mt-1 tabular-nums truncate">
                    {formatCurrency(summary.totalExpenses)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today Expenses */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro stat-card-green">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">مصروفات اليوم</p>
                  <p className="text-lg md:text-xl font-bold text-foreground mt-1 tabular-nums truncate">
                    {formatCurrency(summary.todayExpenses)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Week */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">هذا الأسبوع</p>
                  <p className="text-lg md:text-xl font-bold text-foreground mt-1 tabular-nums truncate">
                    {formatCurrency(summary.thisWeekExpenses)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center flex-shrink-0">
                  <CalendarRange className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro stat-card-red">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">هذا الشهر</p>
                  <p className="text-lg md:text-xl font-bold text-foreground mt-1 tabular-nums truncate">
                    {formatCurrency(summary.thisMonthExpenses)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-500 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Daily */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro">
            <CardContent className="p-4 relative z-10">
              <div className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">متوسط يومي</p>
                  <p className="text-lg md:text-xl font-bold text-foreground mt-1 tabular-nums truncate">
                    {formatCurrency(summary.averageDailyExpense)}
                  </p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center flex-shrink-0">
                  <ArrowDownUp className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ── Category Summary Cards (icon + name + total + percentage) ── */}
      {!loading && categorySummaryData.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h3 className="text-sm font-semibold text-foreground">ملخص الفئات</h3>
            <Badge variant="secondary" className="rounded-lg text-[10px] h-5 px-2">
              {categorySummaryData.length} فئة
            </Badge>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 stagger-children">
            {categorySummaryData.map((cat) => {
              const catDef = getCategoryDef(cat.category)
              const Icon = catDef.icon
              const percentage = totalAllCategories > 0 ? Math.round((cat.total / totalAllCategories) * 100) : 0
              return (
                <Card
                  key={cat.category}
                  className={`rounded-2xl border-0 shadow-sm card-hover p-4 cursor-default`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-xl ${catDef.bgClass} ${catDef.borderClass} border flex items-center justify-center flex-shrink-0`}>
                      <Icon className={`w-5 h-5 ${catDef.color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-foreground truncate">{cat.category}</p>
                        <Badge variant="secondary" className="text-[10px] h-5 px-1.5 flex-shrink-0 mr-2">
                          {percentage}%
                        </Badge>
                      </div>
                      <p className="text-base font-bold text-foreground mt-0.5 tabular-nums">
                        {formatCurrency(cat.total)}
                      </p>
                      <div className="mt-1.5">
                        <CategoryProgressBar
                          total={totalAllCategories}
                          categoryTotal={cat.total}
                          color={catDef.hexColor}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">{cat.count} عملية</p>
                    </div>
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Charts Section ────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ChartSkeleton />
          <ChartSkeleton />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
          {/* Category Breakdown - Pie/Donut Chart */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">توزيع المصروفات حسب الفئة</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">نسبة كل فئة من إجمالي المصروفات</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {categoryChartData.length} فئة
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <DonutChart
                data={categoryChartData}
                dataKey="value"
                nameKey="name"
                height={280}
                innerRadius={55}
                outerRadius={85}
                emptyIcon={Wallet}
                emptyTitle="لا توجد مصروفات بعد"
                emptyDescription="سيظهر توزيع المصروفات حسب الفئة هنا"
              />
            </CardContent>
          </Card>

          {/* Daily Trend - Area Chart (last 30 days) */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">اتجاه المصروفات اليومي</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">آخر 30 يوم</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  <TrendingDown className="w-3 h-3 ml-1" />
                  يومي
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <AreaTrendChart
                data={dailyTrendData}
                dataKey="total"
                labelKey="date"
                color="#3b82f6"
                gradientId="expenseGradient"
                height={280}
                strokeWidth={2.5}
                animationDuration={1000}
                showDot
                xAxisInterval={4}
                yAxisFormatter={(val) => val >= 1000 ? `${(val / 1000).toFixed(0)}k` : String(val)}
                emptyIcon={TrendingDown}
                emptyTitle="لا توجد بيانات كافية"
                emptyDescription="سيظهر اتجاه المصروفات اليومي هنا"
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ── Recurring Expenses Section ──────────────────────────────── */}
      {!loading && recurringItems.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-sm animate-fade-in-up glass-card glass-card-frosted">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Repeat className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-base font-bold text-foreground">المصروفات المتكررة</CardTitle>
                  <p className="text-xs text-muted-foreground">مصروفات دورية مع التاريخ المتوقع التالي</p>
                </div>
              </div>
              <Badge variant="secondary" className="rounded-lg text-xs badge-active">
                <Repeat className="w-3 h-3 ml-1" />
                {recurringItems.length} متكرر
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {recurringItems.map((item) => {
                const catDef = getCategoryDef(item.category)
                const Icon = catDef.icon
                const nextDue = new Date(item.nextDueDate)
                const now = new Date()
                const isOverdue = nextDue <= now
                const daysUntilDue = Math.ceil((nextDue.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                return (
                  <div
                    key={item.id}
                    className={`rounded-xl border p-3 card-hover transition-all duration-200 ${
                      isOverdue
                        ? 'border-red-300 dark:border-red-800/50 bg-red-50/50 dark:bg-red-950/10'
                        : 'border-border/50 bg-card/50'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-lg ${catDef.bgClass} ${catDef.borderClass} border flex items-center justify-center flex-shrink-0 mt-0.5`}>
                        <Icon className={`w-4 h-4 ${catDef.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <p className="text-sm font-semibold text-foreground truncate">{item.description}</p>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-medium ${catDef.badgeClass}`}>
                            {item.category}
                          </span>
                          {item.recurringPeriod && (
                            <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                              {getPeriodLabel(item.recurringPeriod)}
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center justify-between mt-2">
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {formatCurrency(item.amount)}
                          </span>
                          <div className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-500' : 'text-muted-foreground'}`}>
                            <Clock className="w-3 h-3" />
                            <span>
                              {isOverdue ? 'مستحقة' : `بعد ${daysUntilDue} يوم`}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Filters Bar ───────────────────────────────────────────── */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowFilters(!showFilters)}
          className="gap-2"
        >
          <Filter className="w-4 h-4" />
          تصفية
          {hasActiveFilters && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px]">
              !
            </Badge>
          )}
        </Button>

        {/* Quick date range buttons */}
        {DATE_RANGE_OPTIONS.map((opt) => (
          <Button
            key={opt.value}
            variant={dateRange === opt.value ? 'default' : 'outline'}
            size="sm"
            onClick={() => setDateRange(opt.value)}
            className="text-xs h-8"
          >
            {opt.label}
          </Button>
        ))}

        {/* Category filter */}
        <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v === 'all' ? '' : v)}>
          <SelectTrigger className="h-8 w-auto min-w-[140px] text-xs">
            <SelectValue placeholder="جميع الفئات" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">جميع الفئات</SelectItem>
            {EXPENSE_CATEGORIES.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <input
            type="text"
            placeholder="بحث في الوصف..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 rounded-lg border border-input bg-background px-3 pr-8 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 text-xs gap-1 text-destructive hover:text-destructive">
            <X className="w-3 h-3" />
            مسح
          </Button>
        )}
      </div>

      {/* ── Expenses Table ────────────────────────────────────────── */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <Card className="rounded-2xl border-0 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">قائمة المصروفات</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{total} مصروف مسجل</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            {expenses.length > 0 ? (
              <>
                <ScrollArea className="max-h-[480px]">
                  <div className="rounded-xl border border-border/50 overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4">الفئة</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4">الوصف</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4 text-left">المبلغ</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4">التاريخ</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4">النوع</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4 text-center">إجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => {
                          const catDef = getCategoryDef(expense.category)
                          const Icon = catDef.icon
                          return (
                            <TableRow
                              key={expense.id}
                              className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <div className={`w-7 h-7 rounded-lg ${catDef.bgClass} ${catDef.borderClass} border flex items-center justify-center flex-shrink-0`}>
                                    <Icon className={`w-3.5 h-3.5 ${catDef.color}`} />
                                  </div>
                                  <span className="text-xs font-medium text-foreground">{expense.category}</span>
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <div className="max-w-[200px]">
                                  <p className="text-sm text-foreground truncate">{expense.description}</p>
                                  {expense.userName && (
                                    <p className="text-[10px] text-muted-foreground mt-0.5">بواسطة: {expense.userName}</p>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="py-3 px-4 text-left">
                                <span className="text-sm font-bold text-foreground tabular-nums">
                                  {formatCurrency(expense.amount)}
                                </span>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                <span className="text-xs text-muted-foreground">{formatDate(expense.date)}</span>
                              </TableCell>
                              <TableCell className="py-3 px-4">
                                {expense.recurring ? (
                                  <div className="flex items-center gap-1">
                                    <Repeat className="w-3.5 h-3.5 text-primary" />
                                    <Badge variant="outline" className="text-[10px] h-5 px-1.5">
                                      {getPeriodLabel(expense.recurringPeriod)}
                                    </Badge>
                                  </div>
                                ) : (
                                  <span className="text-xs text-muted-foreground">مرة واحدة</span>
                                )}
                              </TableCell>
                              <TableCell className="py-3 px-4 text-center">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => {
                                    setDeleteTarget(expense)
                                    deleteConfirm.confirm({
                                      title: 'حذف المصروف',
                                      description: 'هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.',
                                      onConfirm: handleDeleteExpense,
                                    })
                                  }}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </TableCell>
                            </TableRow>
                          )
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </ScrollArea>

                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  onPageChange={(p) => fetchData(p)}
                  className="mt-4 pt-3 border-t border-border/30"
                />
              </>
            ) : (
              <EmptyState
                icon={Receipt}
                title={hasActiveFilters ? 'لا توجد نتائج' : 'لا توجد مصروفات'}
                description={
                  hasActiveFilters
                    ? 'لم يتم العثور على مصروفات تطابق معايير البحث'
                    : 'لم يتم تسجيل أي مصروفات بعد. اضغط على "إضافة مصروف" للبدء'
                }
                className="h-48"
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Add Expense Dialog (Enhanced) ──────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              إضافة مصروف جديد
            </DialogTitle>
            <DialogDescription>
              اختر الفئة وأدخل بيانات المصروف الجديد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Category Selector as Icon Grid */}
            <div className="space-y-2">
              <Label className="text-sm font-medium">
                فئة المصروف <span className="text-destructive">*</span>
              </Label>
              <div className="grid grid-cols-3 gap-2">
                {EXPENSE_CATEGORIES.map((cat) => {
                  const Icon = cat.icon
                  const isSelected = newCategory === cat.value
                  return (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => {
                        setNewCategory(cat.value)
                        v.clearFieldError('category')
                      }}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                        isSelected
                          ? `${cat.borderClass} ${cat.bgClass} shadow-sm scale-[1.02]`
                          : 'border-transparent bg-muted/40 hover:bg-muted/70'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg ${cat.bgClass} flex items-center justify-center transition-all duration-200`}>
                        <Icon className={`w-4 h-4 ${cat.color}`} />
                      </div>
                      <span className={`text-[11px] font-medium text-center leading-tight ${isSelected ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {cat.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
            {v.errors.category && (
              <p className="text-sm text-destructive mt-1">{v.errors.category}</p>
            )}

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">المبلغ (ر.س) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => {
                  setNewAmount(e.target.value)
                  v.clearFieldError('amount')
                }}
                className={`h-10 text-sm tabular-nums text-left ${v.errors.amount ? 'border-destructive' : ''}`}
                dir="ltr"
              />
              {v.errors.amount && (
                <p className="text-sm text-destructive mt-1">{v.errors.amount}</p>
              )}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">التاريخ</Label>
              <Input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            {/* Description / Notes */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الوصف / ملاحظات <span className="text-destructive">*</span></Label>
              <textarea
                placeholder="أدخل وصف المصروف أو ملاحظات إضافية..."
                value={newDescription}
                onChange={(e) => {
                  setNewDescription(e.target.value)
                  v.clearFieldError('description')
                }}
                rows={3}
                className={`w-full rounded-lg border bg-background px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground/60 ${v.errors.description ? 'border-destructive' : 'border-input'}`}
              />
              {v.errors.description && (
                <p className="text-sm text-destructive mt-1">{v.errors.description}</p>
              )}
            </div>

            {/* Recurring Toggle */}
            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/50 border border-border/50">
              <div className="flex items-center gap-2">
                <Repeat className="w-4 h-4 text-primary" />
                <div>
                  <p className="text-sm font-medium">مصروف متكرر</p>
                  <p className="text-xs text-muted-foreground">تفعيل التكرار الدوري للمصروف</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setNewRecurring(!newRecurring)}
                className={`relative w-11 h-6 rounded-full transition-colors duration-300 ${
                  newRecurring ? 'bg-primary' : 'bg-muted-foreground/30'
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    newRecurring ? 'translate-x-5.5' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>

            {/* Recurring Period (if recurring) */}
            {newRecurring && (
              <div className="space-y-2 animate-fade-in-up">
                <Label className="text-sm font-medium">فترة التكرار</Label>
                <div className="grid grid-cols-3 gap-2">
                  {RECURRING_PERIODS.map((period) => {
                    const isSelected = newRecurringPeriod === period.value
                    return (
                      <button
                        key={period.value}
                        type="button"
                        onClick={() => setNewRecurringPeriod(period.value)}
                        className={`flex flex-col items-center gap-1 p-2.5 rounded-xl border-2 transition-all duration-200 ${
                          isSelected
                            ? 'border-primary bg-primary/10 shadow-sm'
                            : 'border-transparent bg-muted/40 hover:bg-muted/70'
                        }`}
                      >
                        <Repeat className={`w-4 h-4 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <span className={`text-xs font-medium ${isSelected ? 'text-primary' : 'text-muted-foreground'}`}>
                          {period.label}
                        </span>
                        <span className="text-[10px] text-muted-foreground">يتكرر {period.short}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => setAddDialogOpen(false)}
              className="btn-ripple"
            >
              إلغاء
            </Button>
            <Button
              onClick={handleAddExpense}
              disabled={submitting}
              className="btn-ripple btn-primary-gradient shimmer"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الإضافة...
                </>
              ) : (
                <>
                  <Plus className="w-4 h-4 ml-2" />
                  إضافة المصروف
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ─────────────────────────────── */}
      <ConfirmDialog
        {...deleteConfirm}
        confirmText="حذف"
        variant="destructive"
      >
        {deleteTarget && (
          <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 mt-2">
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg ${getCategoryDef(deleteTarget.category).bgClass} ${getCategoryDef(deleteTarget.category).borderClass} border flex items-center justify-center flex-shrink-0`}>
                <CategoryIcon category={deleteTarget.category} size="sm" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">{deleteTarget.description}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${getCategoryDef(deleteTarget.category).badgeClass}`}>
                    {deleteTarget.category}
                  </Badge>
                  <span className="text-xs font-bold text-foreground tabular-nums">{formatCurrency(deleteTarget.amount)} ر.س</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </ConfirmDialog>
    </div>
  )
}
