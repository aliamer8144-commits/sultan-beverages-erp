'use client'

import { useState, useEffect, useCallback } from 'react'
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Legend,
} from 'recharts'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import { exportToCSV } from '@/lib/export-csv'
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
} from 'lucide-react'

// ── Constants ──────────────────────────────────────────────────────

const EXPENSE_CATEGORIES = [
  { value: 'مصروفات تشغيلية', label: 'مصروفات تشغيلية', color: '#3b5bdb', badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'صيانة', label: 'صيانة', color: '#e03131', badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'إيجار', label: 'إيجار', color: '#0ca678', badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' },
  { value: 'رواتب', label: 'رواتب', color: '#9c36b5', badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'نقل', label: 'نقل', color: '#f08c00', badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  { value: 'متنوع', label: 'متنوع', color: '#868e96', badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400' },
]

const CHART_COLORS = ['#3b5bdb', '#e03131', '#0ca678', '#9c36b5', '#f08c00', '#868e96', '#1c7ed6', '#e8590c']

const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'month', label: 'هذا الشهر' },
  { value: '3months', label: 'آخر 3 أشهر' },
  { value: 'year', label: 'هذا العام' },
]

const RECURRING_PERIODS = [
  { value: 'daily', label: 'يومي' },
  { value: 'weekly', label: 'أسبوعي' },
  { value: 'monthly', label: 'شهري' },
]

// ── Types ──────────────────────────────────────────────────────────

interface ExpenseItem {
  id: string
  category: string
  amount: number
  description: string
  date: string
  recurring: boolean
  recurringPeriod: string | null
  userId: string
  userName: string | null
  createdAt: string
  updatedAt: string
}

interface CategorySummary {
  category: string
  total: number
  count: number
}

interface MonthlyTrend {
  month: string
  total: number
}

interface ExpenseSummary {
  totalExpenses: number
  todayExpenses: number
  thisMonthExpenses: number
  topCategory: string | null
  totalByCategory: CategorySummary[]
  monthlyTrend: MonthlyTrend[]
}

// ── Helpers ────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toFixed(2)
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getCategoryInfo(categoryValue: string) {
  return EXPENSE_CATEGORIES.find((c) => c.value === categoryValue) || EXPENSE_CATEGORIES[5]
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

// ── Custom Chart Tooltips ──────────────────────────────────────────

function PieTooltip({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }> }) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{item.payload.name}</p>
      <p className="text-sm font-bold text-foreground">{formatCurrency(item.value)} ر.س</p>
    </div>
  )
}

function BarTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">{formatCurrency(payload[0].value)} ر.س</p>
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

// ── Loading Skeletons ──────────────────────────────────────────────

function SummaryCardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton-shimmer h-4 w-24 rounded" />
            <div className="skeleton-shimmer h-8 w-28 rounded" />
            <div className="skeleton-shimmer h-3 w-16 rounded" />
          </div>
          <div className="skeleton-shimmer w-11 h-11 rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  )
}

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

function TableSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <div className="skeleton-shimmer h-5 w-36 rounded" />
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

// ── Main Component ─────────────────────────────────────────────────

export function ExpenseScreen() {
  const { user } = useAppStore()

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
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<ExpenseItem | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch Data ─────────────────────────────────────────────────

  const fetchData = useCallback(async (page = 1, showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', String(limit))
      if (categoryFilter) params.set('category', categoryFilter)
      if (search.trim()) params.set('search', search.trim())

      const { from, to } = getDateRange(dateRange)
      if (from) params.set('dateFrom', from)
      if (to) params.set('dateTo', to)

      const res = await fetch(`/api/expenses?${params.toString()}`)
      const json = await res.json()

      if (json.success) {
        setExpenses(json.data.expenses || [])
        setTotal(json.data.total || 0)
        setTotalPages(json.data.totalPages || 1)
        setCurrentPage(json.data.page || 1)
        setSummary(json.data.summary || null)
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل المصروفات')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [categoryFilter, dateRange, search])

  useEffect(() => {
    fetchData(1)
  }, [fetchData])

  // ── Handlers ───────────────────────────────────────────────────

  const handleAddExpense = async () => {
    if (!newCategory) {
      toast.error('الرجاء اختيار فئة المصروف')
      return
    }
    if (!newAmount || parseFloat(newAmount) <= 0) {
      toast.error('الرجاء إدخال مبلغ صحيح')
      return
    }
    if (!newDescription.trim()) {
      toast.error('الرجاء إدخال وصف المصروف')
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category: newCategory,
          amount: parseFloat(newAmount),
          description: newDescription.trim(),
          date: newDate,
          recurring: newRecurring,
          recurringPeriod: newRecurring ? newRecurringPeriod : null,
          userId: user?.id || '',
          userName: user?.name || null,
        }),
      })
      const json = await res.json()

      if (json.success) {
        toast.success('تم إضافة المصروف بنجاح')
        resetAddForm()
        setAddDialogOpen(false)
        fetchData(1)
      } else {
        toast.error(json.error || 'فشل في إضافة المصروف')
      }
    } catch {
      toast.error('حدث خطأ أثناء إضافة المصروف')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteExpense = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/expenses?id=${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()

      if (json.success) {
        toast.success('تم حذف المصروف بنجاح')
        setDeleteDialogOpen(false)
        setDeleteTarget(null)
        fetchData(currentPage)
      } else {
        toast.error(json.error || 'فشل في حذف المصروف')
      }
    } catch {
      toast.error('حدث خطأ أثناء حذف المصروف')
    } finally {
      setDeleting(false)
    }
  }

  const resetAddForm = () => {
    setNewCategory('')
    setNewAmount('')
    setNewDescription('')
    setNewDate(new Date().toISOString().split('T')[0])
    setNewRecurring(false)
    setNewRecurringPeriod('')
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

  // ── Pie Chart Data ─────────────────────────────────────────────

  const pieData = summary?.totalByCategory?.map((c) => ({
    name: c.category,
    value: c.total,
  })) || []

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

      {/* ── Summary Cards ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
          <SummaryCardSkeleton />
        </div>
      ) : summary ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 stagger-children">
          {/* Total Expenses */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro stat-card-blue">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">إجمالي المصروفات</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {formatCurrency(summary.totalExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">ريال سعودي</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                  <Wallet className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Today Expenses */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro stat-card-green">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مصروفات اليوم</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {formatCurrency(summary.todayExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">ريال سعودي</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
                  <CalendarDays className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* This Month */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro stat-card-red">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">مصروفات الشهر</p>
                  <p className="text-2xl font-bold text-foreground mt-1 tabular-nums">
                    {formatCurrency(summary.thisMonthExpenses)}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">ريال سعودي</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-red-500/10 text-red-500 flex items-center justify-center">
                  <CalendarRange className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Category */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient data-card-micro stat-card-blue">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">أعلى فئة</p>
                  <p className="text-lg font-bold text-foreground mt-1 truncate max-w-[130px]">
                    {summary.topCategory || '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">من إجمالي المصروفات</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

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
                  {pieData.length} فئة
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[280px] w-full">
                {pieData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={85}
                        paddingAngle={3}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_, index) => (
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
                      <Wallet className="w-6 h-6 text-primary/30" />
                    </div>
                    <p className="empty-state-title">لا توجد مصروفات بعد</p>
                    <p className="empty-state-description mt-1">سيظهر توزيع المصروفات حسب الفئة هنا بعد إضافة أول مصروف</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Monthly Trend - Bar Chart */}
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground">اتجاه المصروفات الشهرية</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">آخر 6 أشهر</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {summary.monthlyTrend?.length ?? 0} شهر
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[280px] w-full">
                {summary.monthlyTrend && summary.monthlyTrend.some((m) => m.total > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.monthlyTrend} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
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
                      <Tooltip content={<BarTooltip />} cursor={{ fill: 'oklch(0.55 0.2 260 / 8%)' }} />
                      <Bar
                        dataKey="total"
                        radius={[8, 8, 0, 0]}
                        maxBarSize={50}
                        fill="#e03131"
                        animationDuration={800}
                        animationEasing="ease-out"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center empty-state">
                    <div className="empty-state-icon">
                      <TrendingDown className="w-6 h-6 text-primary/30" />
                    </div>
                    <p className="empty-state-title">لا توجد بيانات كافية</p>
                    <p className="empty-state-description mt-1">سيظهر اتجاه المصروفات الشهرية هنا</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* ── Expenses Table ────────────────────────────────────────── */}
      {loading ? (
        <TableSkeleton />
      ) : (
        <Card className="rounded-2xl border-0 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
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
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4">نوع المصروف</TableHead>
                          <TableHead className="text-xs font-semibold text-muted-foreground py-3 px-4 text-center">إجراء</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expenses.map((expense) => {
                          const catInfo = getCategoryInfo(expense.category)
                          return (
                            <TableRow
                              key={expense.id}
                              className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                            >
                              <TableCell className="py-3 px-4">
                                <Badge variant="secondary" className={`text-[10px] px-2 py-0.5 h-5 font-semibold ${catInfo.badgeClass}`}>
                                  {expense.category}
                                </Badge>
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
                                  <span className="text-[10px] text-muted-foreground mr-1">ر.س</span>
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
                                      {expense.recurringPeriod === 'daily' ? 'يومي' :
                                       expense.recurringPeriod === 'weekly' ? 'أسبوعي' :
                                       expense.recurringPeriod === 'monthly' ? 'شهري' : 'متكرر'}
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
                                    setDeleteDialogOpen(true)
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

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/30">
                    <p className="text-xs text-muted-foreground">
                      صفحة {currentPage} من {totalPages}
                    </p>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage <= 1}
                        onClick={() => fetchData(currentPage - 1)}
                      >
                        <span className="text-xs">←</span>
                      </Button>
                      {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                        let pageNum: number
                        if (totalPages <= 5) {
                          pageNum = i + 1
                        } else if (currentPage <= 3) {
                          pageNum = i + 1
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i
                        } else {
                          pageNum = currentPage - 2 + i
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? 'default' : 'outline'}
                            size="icon"
                            className="h-8 w-8 text-xs"
                            onClick={() => fetchData(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        )
                      })}
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-8 w-8"
                        disabled={currentPage >= totalPages}
                        onClick={() => fetchData(currentPage + 1)}
                      >
                        <span className="text-xs">→</span>
                      </Button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="h-48 flex items-center justify-center empty-state">
                <div className="empty-state-icon">
                  <Receipt className="w-6 h-6 text-primary/30" />
                </div>
                <p className="empty-state-title">
                  {hasActiveFilters ? 'لا توجد نتائج' : 'لا توجد مصروفات'}
                </p>
                <p className="empty-state-description mt-1">
                  {hasActiveFilters
                    ? 'لم يتم العثور على مصروفات تطابق معايير البحث'
                    : 'لم يتم تسجيل أي مصروفات بعد. اضغط على "إضافة مصروف" للبدء'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Add Expense Dialog ─────────────────────────────────────── */}
      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              إضافة مصروف جديد
            </DialogTitle>
            <DialogDescription>
              أدخل بيانات المصروف الجديد
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Category */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">فئة المصروف <span className="text-destructive">*</span></Label>
              <Select value={newCategory} onValueChange={setNewCategory}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="اختر الفئة" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">المبلغ (ر.س) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={newAmount}
                onChange={(e) => setNewAmount(e.target.value)}
                className="h-10 text-sm tabular-nums text-left"
                dir="ltr"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">الوصف <span className="text-destructive">*</span></Label>
              <Input
                type="text"
                placeholder="وصف المصروف..."
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="h-10 text-sm"
              />
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
              <div className="space-y-1.5 animate-fade-in-up">
                <Label className="text-sm font-medium">فترة التكرار</Label>
                <Select value={newRecurringPeriod} onValueChange={setNewRecurringPeriod}>
                  <SelectTrigger className="h-10 text-sm">
                    <SelectValue placeholder="اختر الفترة" />
                  </SelectTrigger>
                  <SelectContent>
                    {RECURRING_PERIODS.map((period) => (
                      <SelectItem key={period.value} value={period.value}>{period.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
              className="btn-ripple"
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
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              تأكيد الحذف
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا المصروف؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>

          {deleteTarget && (
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 mt-2">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-destructive/10 flex items-center justify-center flex-shrink-0">
                  <Receipt className="w-4 h-4 text-destructive" />
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{deleteTarget.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className={`text-[10px] px-1.5 py-0 h-4 ${getCategoryInfo(deleteTarget.category).badgeClass}`}>
                      {deleteTarget.category}
                    </Badge>
                    <span className="text-xs font-bold text-foreground tabular-nums">{formatCurrency(deleteTarget.amount)} ر.س</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setDeleteTarget(null)
              }}
              className="btn-ripple"
            >
              إلغاء
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteExpense}
              disabled={deleting}
              className="btn-ripple"
            >
              {deleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin ml-2" />
                  جاري الحذف...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4 ml-2" />
                  حذف المصروف
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
