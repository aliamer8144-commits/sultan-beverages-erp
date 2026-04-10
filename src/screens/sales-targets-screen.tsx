'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts'
import { toast } from 'sonner'
import {
  Target,
  Plus,
  RefreshCw,
  Clock,
  Flame,
  Trash2,
  Edit3,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Zap,
  CalendarDays,
  Loader2,
} from 'lucide-react'

// ── Types ──────────────────────────────────────────────────────────

interface SalesTarget {
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
  createdAt: string
}

// ── Constants ──────────────────────────────────────────────────────

const TARGET_TYPES = [
  { value: 'daily', label: 'يومي', icon: '📅', color: '#3b5bdb' },
  { value: 'weekly', label: 'أسبوعي', icon: '📆', color: '#0ca678' },
  { value: 'monthly', label: 'شهري', icon: '🗓️', color: '#9c36b5' },
]

const TYPE_LABELS: Record<string, string> = {
  daily: 'اليومي',
  weekly: 'الأسبوعي',
  monthly: 'الشهري',
}

const CHART_COLORS = ['#3b5bdb', '#0ca678', '#9c36b5', '#e03131', '#f08c00', '#1c7ed6']

// ── Helpers ────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toFixed(2)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function getProgressColor(percent: number): string {
  if (percent >= 100) return 'bg-emerald-500'
  if (percent >= 80) return 'bg-emerald-500'
  if (percent >= 50) return 'bg-amber-500'
  if (percent >= 25) return 'bg-orange-500'
  return 'bg-red-500'
}

function getProgressRingColor(percent: number): string {
  if (percent >= 100) return 'stroke-emerald-500'
  if (percent >= 80) return 'stroke-emerald-500'
  if (percent >= 50) return 'stroke-amber-500'
  if (percent >= 25) return 'stroke-orange-500'
  return 'stroke-red-500'
}

function getProgressTextColor(percent: number): string {
  if (percent >= 100) return 'text-emerald-600'
  if (percent >= 80) return 'text-emerald-600'
  if (percent >= 50) return 'text-amber-600'
  if (percent >= 25) return 'text-orange-600'
  return 'text-red-600'
}

function getMotivationalMessage(percent: number): string {
  if (percent >= 100) return '🎉 أحسنت! لقد حققت الهدف! استمر في العطاء'
  if (percent >= 80) return '🔥 قريب جداً! استمر بنفس الحماس'
  if (percent >= 50) return '💪 نصف الطريق! واصل المسيرة'
  if (percent >= 25) return '🌱 بداية جيدة! المزيد من الجهد'
  return '🚀 ابدأ الآن! كل خطوة تُحدث فرقاً'
}

function getTypeIcon(type: string): string {
  const t = TARGET_TYPES.find((t) => t.value === type)
  return t?.icon || '🎯'
}

function getTimeLabel(target: SalesTarget): string {
  if (!target.isActive && target.progressPercent >= 100) return 'مكتمل'
  if (target.daysRemaining > 0) return `${target.daysRemaining} يوم متبقي`
  if (target.hoursRemaining > 0) return `${target.hoursRemaining} ساعة متبقية`
  return target.isActive ? 'ينتهي اليوم' : 'منتهي'
}

// ── Custom Chart Tooltip ───────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; dataKey: string; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg" dir="rtl">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.dataKey} className="text-sm font-bold" style={{ color: entry.color }}>
          {entry.dataKey === 'targetAmount' ? 'الهدف' : 'المحقق'}: {formatCurrency(entry.value)} ر.س
        </p>
      ))}
    </div>
  )
}

// ── Loading Skeleton ──────────────────────────────────────────────

function TargetCardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-6">
        <div className="skeleton-shimmer h-6 w-32 rounded mb-4" />
        <div className="flex items-center gap-6">
          <div className="skeleton-shimmer w-24 h-24 rounded-full" />
          <div className="flex-1 space-y-3">
            <div className="skeleton-shimmer h-4 w-48 rounded" />
            <div className="skeleton-shimmer h-3 w-36 rounded" />
            <div className="skeleton-shimmer h-3 w-full rounded" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

// ── Circular Progress Component ────────────────────────────────────

function CircularProgress({ percent, size = 100, strokeWidth = 8 }: { percent: number; size?: number; strokeWidth?: number }) {
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (Math.min(percent, 100) / 100) * circumference
  const isComplete = percent >= 100

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" className="stroke-muted/30" strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className={`${getProgressRingColor(percent)} progress-bar-animated`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={`text-xl font-bold tabular-nums ${isComplete ? 'text-emerald-600' : 'text-foreground'}`}>
          {percent.toFixed(0)}%
        </span>
        <span className="text-[9px] text-muted-foreground">مكتمل</span>
      </div>
    </div>
  )
}

// ── Main Component ────────────────────────────────────────────────

export function SalesTargetsScreen() {
  // Data state
  const [targets, setTargets] = useState<SalesTarget[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Create/Edit dialog
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null)
  const [formType, setFormType] = useState('daily')
  const [formAmount, setFormAmount] = useState('')
  const [formEndDate, setFormEndDate] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Delete dialog
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<SalesTarget | null>(null)
  const [deleting, setDeleting] = useState(false)

  // ── Fetch Data ─────────────────────────────────────────────────

  const fetchTargets = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const res = await fetch('/api/sales-targets?all=true')
      const json = await res.json()
      if (json.success) {
        setTargets(json.data || [])
      }
    } catch {
      toast.error('حدث خطأ أثناء تحميل الأهداف')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchTargets()
  }, [fetchTargets])

  // ── Computed Data ─────────────────────────────────────────────

  const activeTargets = targets.filter((t) => t.isActive)
  const completedTargets = targets.filter((t) => t.progressPercent >= 100)
  const totalTargets = targets.length

  // Historical data for chart (group targets by type, show completion rates)
  const historicalData = TARGET_TYPES.map((type) => {
    const typeTargets = targets.filter((t) => t.type === type.value)
    const avgProgress = typeTargets.length > 0
      ? typeTargets.reduce((sum, t) => sum + t.progressPercent, 0) / typeTargets.length
      : 0
    const completed = typeTargets.filter((t) => t.progressPercent >= 100).length
    const totalTargetAmount = typeTargets.reduce((sum, t) => sum + t.targetAmount, 0)
    const totalCurrentAmount = typeTargets.reduce((sum, t) => sum + t.currentAmount, 0)
    return {
      name: type.label,
      type: type.value,
      avgProgress: Math.round(avgProgress * 10) / 10,
      completed,
      total: typeTargets.length,
      targetAmount: Math.round(totalTargetAmount * 100) / 100,
      currentAmount: Math.round(totalCurrentAmount * 100) / 100,
      color: type.color,
    }
  })

  // Time series data for trend (group by creation date)
  const trendData = [...targets]
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .slice(-12)
    .map((t) => ({
      name: `${getTypeIcon(t.type)} ${TYPE_LABELS[t.type]}`,
      date: formatDate(t.createdAt),
      progress: t.progressPercent,
      achieved: t.progressPercent >= 100 ? 100 : t.progressPercent,
      color: t.progressPercent >= 100 ? '#0ca678' : t.progressPercent >= 50 ? '#f08c00' : '#e03131',
    }))

  // ── Handlers ───────────────────────────────────────────────────

  const openCreateDialog = () => {
    setEditingTarget(null)
    setFormType('daily')
    setFormAmount('')
    setFormEndDate('')
    setDialogOpen(true)
  }

  const openEditDialog = (target: SalesTarget) => {
    setEditingTarget(target)
    setFormType(target.type)
    setFormAmount(String(target.targetAmount))
    setFormEndDate(target.endDate ? target.endDate.split('T')[0] : '')
    setDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formType || !formAmount || parseFloat(formAmount) <= 0) {
      toast.error('الرجاء اختيار نوع الهدف وإدخال مبلغ صحيح')
      return
    }

    setSubmitting(true)
    try {
      const url = editingTarget ? '/api/sales-targets' : '/api/sales-targets'
      const method = editingTarget ? 'PUT' : 'POST'
      const body: Record<string, unknown> = {
        type: formType,
        targetAmount: parseFloat(formAmount),
      }
      if (editingTarget) body.id = editingTarget.id
      if (formEndDate) body.endDate = formEndDate

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const json = await res.json()

      if (json.success) {
        toast.success(editingTarget ? 'تم تحديث الهدف بنجاح' : 'تم إنشاء الهدف بنجاح')
        setDialogOpen(false)
        fetchTargets()
      } else {
        toast.error(json.error || 'فشل في حفظ الهدف')
      }
    } catch {
      toast.error('حدث خطأ أثناء حفظ الهدف')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      const res = await fetch(`/api/sales-targets?id=${deleteTarget.id}`, { method: 'DELETE' })
      const json = await res.json()
      if (json.success) {
        toast.success('تم حذف الهدف بنجاح')
        setDeleteDialogOpen(false)
        setDeleteTarget(null)
        fetchTargets()
      } else {
        toast.error(json.error || 'فشل في حذف الهدف')
      }
    } catch {
      toast.error('حدث خطأ أثناء حذف الهدف')
    } finally {
      setDeleting(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────

  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Target className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">أهداف المبيعات</h2>
            <p className="text-sm text-muted-foreground">تتبع وتحقيق أهداف المبيعات</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchTargets(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">تحديث</span>
          </button>
          <button
            onClick={openCreateDialog}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium btn-ripple"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">هدف جديد</span>
          </button>
        </div>
      </div>

      {/* ── Summary Stats ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <TargetCardSkeleton />
          <TargetCardSkeleton />
          <TargetCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 stagger-children">
          {/* Active Targets */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient stat-card-blue">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">أهداف نشطة</p>
                  <p className="text-2xl font-bold text-foreground mt-1 number-animate-in">{activeTargets.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">من {totalTargets} هدف إجمالي</p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Completed Targets */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient stat-card-green">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">أهداف محققة</p>
                  <p className="text-2xl font-bold text-emerald-600 mt-1 number-animate-in">{completedTargets.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalTargets > 0 ? `${((completedTargets.length / totalTargets) * 100).toFixed(0)}% نسبة الإنجاز` : 'لا توجد أهداف'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Best Performance */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient" style={{ '--card-gradient': 'linear-gradient(135deg, rgba(156,54,181,0.08), transparent)' } as React.CSSProperties}>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">أفضل أداء</p>
                  <p className="text-lg font-bold text-purple-600 mt-1">
                    {activeTargets.length > 0
                      ? `${getTypeIcon(activeTargets.sort((a, b) => b.progressPercent - a.progressPercent)[0]?.type || '')} ${TYPE_LABELS[activeTargets.sort((a, b) => b.progressPercent - a.progressPercent)[0]?.type || '']}`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeTargets.length > 0
                      ? `${activeTargets.sort((a, b) => b.progressPercent - a.progressPercent)[0]?.progressPercent.toFixed(0)}% تحقيق`
                      : 'لا توجد أهداف نشطة'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Active Targets with Animated Progress ────────────────── */}
      {!loading && activeTargets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">الأهداف النشطة</h3>
            <Badge variant="secondary" className="text-xs">{activeTargets.length}</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
            {activeTargets.map((target) => {
              const percent = target.progressPercent
              const isComplete = percent >= 100

              return (
                <Card
                  key={target.id}
                  className={`rounded-2xl border-0 shadow-sm card-hover relative overflow-hidden ${isComplete ? 'stat-card-gradient stat-card-green' : ''}`}
                >
                  <CardContent className="p-6 relative z-10">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTypeIcon(target.type)}</span>
                        <div>
                          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                            هدف {TYPE_LABELS[target.type]}
                            {isComplete && (
                              <span className="badge-active text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                تم التحقيق
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            منذ {formatDate(target.startDate)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openEditDialog(target)}
                          className="p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                          title="تعديل"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(target)
                            setDeleteDialogOpen(true)
                          }}
                          className="p-2 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {/* Circular Progress */}
                      <div className={isComplete ? 'animate-pulse-glow' : ''}>
                        <CircularProgress percent={percent} size={96} strokeWidth={7} />
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-3">
                        {/* Stats Row */}
                        <div className="grid grid-cols-3 gap-3">
                          <div className="text-center p-2 rounded-xl bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">الهدف</p>
                            <p className="text-sm font-bold text-foreground tabular-nums">
                              {formatCurrency(target.targetAmount)}
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-xl bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">الحالي</p>
                            <p className={`text-sm font-bold tabular-nums ${getProgressTextColor(percent)}`}>
                              {formatCurrency(target.currentAmount)}
                            </p>
                          </div>
                          <div className="text-center p-2 rounded-xl bg-muted/30">
                            <p className="text-[10px] text-muted-foreground">المتبقي</p>
                            <p className="text-sm font-bold text-foreground tabular-nums">
                              {isComplete ? '0.00' : formatCurrency(target.remainingAmount)}
                            </p>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="space-y-1">
                          <div className="relative h-3 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={`absolute inset-y-0 right-0 rounded-full progress-bar-animated progress-bar-striped-animated ${getProgressColor(percent)} ${isComplete ? 'shimmer' : ''}`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                        </div>

                        {/* Time & Message */}
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {getTimeLabel(target)}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {getMotivationalMessage(percent)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Charts Section ────────────────────────────────────────── */}
      {!loading && targets.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
          {/* Performance by Type - Bar Chart */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    أداء الأهداف حسب النوع
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">الهدف مقابل المحقق لكل نوع</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[280px] w-full">
                {historicalData.some((d) => d.total > 0) ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={historicalData.filter((d) => d.total > 0)} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
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
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="targetAmount" name="targetAmount" radius={[6, 6, 0, 0]} maxBarSize={50} fill="#3b5bdb" opacity={0.3} animationDuration={800} />
                      <Bar dataKey="currentAmount" name="currentAmount" radius={[6, 6, 0, 0]} maxBarSize={50} animationDuration={1000}>
                        {historicalData.filter((d) => d.total > 0).map((entry, index) => (
                          <Cell key={`hist-cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center empty-state">
                    <div className="empty-state-icon">
                      <Target className="w-6 h-6 text-primary/30" />
                    </div>
                    <p className="empty-state-title">لا توجد بيانات</p>
                  </div>
                )}
              </div>
              {/* Legend */}
              <div className="flex items-center justify-center gap-6 mt-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-[#3b5bdb] opacity-30" />
                  <span className="text-xs text-muted-foreground">الهدف</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-sm bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">المحقق</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Achievement Progress - Trend Area Chart */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                    <Flame className="w-5 h-5 text-primary" />
                    منحنى تقدم الأهداف
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">نسبة التحقيق لكل هدف</p>
                </div>
                <Badge variant="secondary" className="rounded-lg text-xs">
                  {trendData.length} هدف
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="p-6 pt-2">
              <div className="h-[280px] w-full">
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                      <defs>
                        <linearGradient id="progressGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#0ca678" stopOpacity={0.3} />
                          <stop offset="95%" stopColor="#0ca678" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.005 260)" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        interval="preserveStartEnd"
                      />
                      <YAxis
                        tick={{ fontSize: 11, fill: 'oklch(0.5 0.01 260)' }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(val) => `${val}%`}
                        domain={[0, 120]}
                      />
                      <Tooltip
                        content={({ active, payload, label }) => {
                          if (!active || !payload?.length) return null
                          return (
                            <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg" dir="rtl">
                              <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
                              <p className="text-sm font-bold text-foreground">
                                التقدم: {payload[0].value}%
                              </p>
                            </div>
                          )
                        }}
                      />
                      {/* Reference line at 100% */}
                      <Line type="monotone" dataKey={() => 100} stroke="#e03131" strokeDasharray="4 4" strokeWidth={1} dot={false} />
                      <Area
                        type="monotone"
                        dataKey="progress"
                        stroke="#0ca678"
                        strokeWidth={2.5}
                        fill="url(#progressGradient)"
                        animationDuration={1200}
                      />
                    </AreaChart>
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
              <div className="flex items-center justify-center gap-4 mt-3">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-emerald-500" />
                  <span className="text-xs text-muted-foreground">نسبة التحقيق</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-6 h-0 border-t-2 border-dashed border-red-400" />
                  <span className="text-xs text-muted-foreground">خط الهدف (100%)</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── All Targets History Table ──────────────────────────────── */}
      {!loading && targets.length > 0 && (
        <Card className="rounded-2xl border-0 shadow-sm animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base font-bold text-foreground">سجل جميع الأهداف</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">{targets.length} هدف مسجل</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 md:p-6 pt-0">
            <div className="max-h-[400px] overflow-y-auto rounded-xl border border-border/50">
              <table className="w-full">
                <thead className="sticky top-0 bg-background z-10">
                  <tr className="border-b border-border/50">
                    <th className="text-xs font-semibold text-muted-foreground py-3 px-4 text-right">النوع</th>
                    <th className="text-xs font-semibold text-muted-foreground py-3 px-4 text-left">الهدف</th>
                    <th className="text-xs font-semibold text-muted-foreground py-3 px-4 text-left">المحقق</th>
                    <th className="text-xs font-semibold text-muted-foreground py-3 px-4 text-center">التقدم</th>
                    <th className="text-xs font-semibold text-muted-foreground py-3 px-4 hidden sm:table-cell">الحالة</th>
                    <th className="text-xs font-semibold text-muted-foreground py-3 px-4 hidden md:table-cell">التاريخ</th>
                    <th className="text-xs font-semibold text-muted-foreground py-3 px-4 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {targets.map((target) => {
                    const isComplete = target.progressPercent >= 100
                    return (
                      <tr
                        key={target.id}
                        className="border-b border-border/30 last:border-0 hover:bg-muted/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span>{getTypeIcon(target.type)}</span>
                            <span className="text-sm font-medium text-foreground">{TYPE_LABELS[target.type]}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-left">
                          <span className="text-sm font-bold text-foreground tabular-nums">
                            {formatCurrency(target.targetAmount)}
                            <span className="text-[10px] text-muted-foreground mr-1">ر.س</span>
                          </span>
                        </td>
                        <td className="py-3 px-4 text-left">
                          <span className={`text-sm font-bold tabular-nums ${getProgressTextColor(target.progressPercent)}`}>
                            {formatCurrency(target.currentAmount)}
                            <span className="text-[10px] mr-1">ر.س</span>
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="relative h-2 flex-1 rounded-full bg-muted/60 overflow-hidden">
                              <div
                                className={`absolute inset-y-0 right-0 rounded-full ${getProgressColor(target.progressPercent)}`}
                                style={{ width: `${Math.min(target.progressPercent, 100)}%` }}
                              />
                            </div>
                            <span className={`text-xs font-bold tabular-nums min-w-[36px] ${getProgressTextColor(target.progressPercent)}`}>
                              {target.progressPercent.toFixed(0)}%
                            </span>
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden sm:table-cell">
                          {isComplete ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0 text-[10px]">
                              <CheckCircle2 className="w-3 h-3 ml-1" />
                              محقق
                            </Badge>
                          ) : target.isActive ? (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0 text-[10px]">
                              <Zap className="w-3 h-3 ml-1" />
                              نشط
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px]">
                              <XCircle className="w-3 h-3 ml-1" />
                              منتهي
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell">
                          <span className="text-xs text-muted-foreground">{formatDate(target.createdAt)}</span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => openEditDialog(target)}
                              className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteTarget(target)
                                setDeleteDialogOpen(true)
                              }}
                              className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Empty State ────────────────────────────────────────────── */}
      {!loading && targets.length === 0 && (
        <div className="flex items-center justify-center py-16 empty-state">
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center empty-state-icon">
              <Target className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground empty-state-title">لا توجد أهداف بعد</p>
              <p className="text-xs text-muted-foreground mt-1 empty-state-description">
                أنشئ أول هدف لمتابعة أداء المبيعات وتحقيق النتائج المطلوبة
              </p>
            </div>
            <Button
              onClick={openCreateDialog}
              variant="outline"
              size="sm"
              className="gap-2 mt-2"
            >
              <Plus className="w-4 h-4" />
              إنشاء أول هدف
            </Button>
          </div>
        </div>
      )}

      {/* ── Create/Edit Dialog ────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              {editingTarget ? 'تعديل الهدف' : 'إنشاء هدف جديد'}
            </DialogTitle>
            <DialogDescription>
              {editingTarget ? 'قم بتعديل بيانات الهدف' : 'حدد نوع ومبلغ الهدف الجديد'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Target Type */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">نوع الهدف <span className="text-destructive">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {TARGET_TYPES.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setFormType(t.value)}
                    className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                      formType === t.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border/50 hover:border-primary/50 hover:bg-muted/50'
                    }`}
                  >
                    <span className="text-xl">{t.icon}</span>
                    <span className={`text-xs font-semibold ${formType === t.value ? 'text-primary' : 'text-muted-foreground'}`}>
                      {t.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Target Amount */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">مبلغ الهدف (ر.س) <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.01"
                min="1"
                placeholder="0.00"
                value={formAmount}
                onChange={(e) => setFormAmount(e.target.value)}
                className="h-10 text-sm tabular-nums text-left"
                dir="ltr"
              />
              {formAmount && parseFloat(formAmount) > 0 && (
                <div className="flex gap-2 mt-1">
                  {[0.5, 1, 2, 5, 10].map((mult) => (
                    <button
                      key={mult}
                      type="button"
                      onClick={() => setFormAmount(String(parseFloat(formAmount) * (mult + 1)))}
                      className="px-2 py-0.5 text-[10px] rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      ×{mult + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* End Date (Optional) */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">تاريخ الانتهاء (اختياري)</Label>
              <Input
                type="date"
                value={formEndDate}
                onChange={(e) => setFormEndDate(e.target.value)}
                className="h-10 text-sm input-glass"
              />
              <p className="text-[10px] text-muted-foreground">
                اتركه فارغاً ليكون الهدف متجدد (يومي/أسبوعي/شهري)
              </p>
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={submitting}>
              إلغاء
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !formType || !formAmount || parseFloat(formAmount) <= 0} className="gap-2 btn-ripple shimmer">
              {submitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              {editingTarget ? 'تحديث' : 'إنشاء'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirmation Dialog ────────────────────────────── */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-sm glass-card" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <Trash2 className="w-5 h-5" />
              حذف الهدف
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من حذف هذا الهدف؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          {deleteTarget && (
            <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <span className="text-xl">{getTypeIcon(deleteTarget.type)}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    هدف {TYPE_LABELS[deleteTarget.type]}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    المبلغ: {formatCurrency(deleteTarget.targetAmount)} ر.س · التقدم: {deleteTarget.progressPercent.toFixed(0)}%
                  </p>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2 mt-2">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={deleting}>
              إلغاء
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="gap-2">
              {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
