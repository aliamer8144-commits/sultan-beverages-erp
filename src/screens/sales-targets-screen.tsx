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
  DollarSign,
  HourglassIcon,
} from 'lucide-react'
import { formatDateShortMonth } from '@/lib/date-utils'

// ── Types ──────────────────────────────────────────────────────────

interface SalesTarget {
  id: string
  type: string
  targetAmount: number
  currentAmount: number
  progressPercentage: number
  remainingAmount: number
  daysRemaining: number
  hoursRemaining: number
  isActive: boolean
  startDate: string
  endDate: string | null
  createdAt: string
  dailyTargetNeeded: number
}

// ── Constants ──────────────────────────────────────────────────────

const TARGET_TYPES = [
  { value: 'daily', label: 'يومي', icon: '📅', color: '#3b5bdb', badgeBg: 'bg-blue-100 dark:bg-blue-900/30', badgeText: 'text-blue-700 dark:text-blue-400' },
  { value: 'weekly', label: 'أسبوعي', icon: '📆', color: '#0ca678', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30', badgeText: 'text-emerald-700 dark:text-emerald-400' },
  { value: 'monthly', label: 'شهري', icon: '🗓️', color: '#9c36b5', badgeBg: 'bg-purple-100 dark:bg-purple-900/30', badgeText: 'text-purple-700 dark:text-purple-400' },
]

const TYPE_LABELS: Record<string, string> = {
  daily: 'اليومي',
  weekly: 'الأسبوعي',
  monthly: 'الشهري',
}

// ── Helpers ────────────────────────────────────────────────────────

function formatCurrency(amount: number): string {
  return amount.toLocaleString('ar-SA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

// formatDateShortMonth imported from @/lib/date-utils

function getProgressColor(percent: number): string {
  if (percent >= 80) return 'bg-green-500'
  if (percent >= 50) return 'bg-amber-500'
  return 'bg-red-500'
}

function getProgressRingClass(percent: number): string {
  if (percent >= 80) return 'progress-ring-green'
  if (percent >= 50) return 'progress-ring-amber'
  return 'progress-ring-red'
}

function getProgressTextColor(percent: number): string {
  if (percent >= 80) return 'text-green-500'
  if (percent >= 50) return 'text-amber-500'
  return 'text-red-500'
}

function getMotivationalMessage(percent: number): string {
  if (percent >= 100) return '🎉 أحسنت! لقد حققت الهدف!'
  if (percent >= 80) return '🔥 قريب جداً! استمر بنفس الحماس'
  if (percent >= 50) return '💪 نصف الطريق! واصل المسيرة'
  if (percent >= 25) return '🌱 بداية جيدة! المزيد من الجهد'
  return '🚀 ابدأ الآن! كل خطوة تُحدث فرقاً'
}

function getTypeIcon(type: string): string {
  const t = TARGET_TYPES.find((t) => t.value === type)
  return t?.icon || '🎯'
}

function getTypeBadge(type: string) {
  return TARGET_TYPES.find((t) => t.value === type) || TARGET_TYPES[0]
}

function getTimeLabel(target: SalesTarget): string {
  if (!target.isActive && target.progressPercentage >= 100) return 'مكتمل'
  if (target.daysRemaining > 0) return `${target.daysRemaining} يوم متبقي`
  if (target.hoursRemaining > 0) return `${target.hoursRemaining} ساعة متبقية`
  return target.isActive ? 'ينتهي اليوم' : 'منتهي'
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

// ── Progress Ring Component (CSS-based) ───────────────────────────

function ProgressRing({ percent, size = 80 }: { percent: number; size?: number }) {
  const clamped = Math.min(Math.max(percent, 0), 100)
  const isComplete = percent >= 100
  const ringClass = getProgressRingClass(percent)

  return (
    <div className="progress-ring-container" style={{ width: size, height: size }}>
      <div
        className={`progress-ring ${size >= 80 ? 'progress-ring-lg' : size <= 48 ? 'progress-ring-sm' : 'progress-ring-md'} ${ringClass}`}
        style={{ '--progress': clamped } as React.CSSProperties}
      >
        <span className={`progress-ring-text ${isComplete ? getProgressTextColor(percent) : ''}`}>
          {percent.toFixed(0)}%
        </span>
      </div>
    </div>
  )
}

// ── Stat Pill Component ────────────────────────────────────────────

function StatPill({ icon: Icon, label, value, colorClass = '' }: { icon: React.ElementType; label: string; value: string; colorClass?: string }) {
  return (
    <div className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/30 min-w-0">
      <div className={`w-8 h-8 rounded-lg bg-background flex items-center justify-center shrink-0 ${colorClass}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] text-muted-foreground truncate">{label}</p>
        <p className={`text-sm font-bold tabular-nums truncate ${colorClass || 'text-foreground'}`}>{value}</p>
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
  const completedTargets = targets.filter((t) => t.progressPercentage >= 100)
  const totalTargets = targets.length

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
      const url = '/api/sales-targets'
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
            <span className="hidden sm:inline">إنشاء هدف جديد</span>
            <Plus className="w-4 h-4 sm:hidden" />
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
                  <p className="text-2xl font-bold text-green-500 mt-1 number-animate-in">{completedTargets.length}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {totalTargets > 0 ? `${((completedTargets.length / totalTargets) * 100).toFixed(0)}% نسبة الإنجاز` : 'لا توجد أهداف'}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
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
                      ? `${getTypeIcon(activeTargets.sort((a, b) => b.progressPercentage - a.progressPercentage)[0]?.type || '')} ${TYPE_LABELS[activeTargets.sort((a, b) => b.progressPercentage - a.progressPercentage)[0]?.type || '']}`
                      : '—'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {activeTargets.length > 0
                      ? `${activeTargets.sort((a, b) => b.progressPercentage - a.progressPercentage)[0]?.progressPercentage.toFixed(0)}% تحقيق`
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

      {/* ── Active Targets with Progress Rings ───────────────────── */}
      {!loading && activeTargets.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-primary" />
            <h3 className="text-base font-bold text-foreground">الأهداف النشطة</h3>
            <Badge variant="secondary" className="text-xs">{activeTargets.length}</Badge>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 stagger-children">
            {activeTargets.map((target) => {
              const percent = target.progressPercentage
              const isComplete = percent >= 100
              const typeInfo = getTypeBadge(target.type)

              return (
                <Card
                  key={target.id}
                  className={`rounded-2xl border-0 shadow-sm card-hover relative overflow-hidden ${isComplete ? 'stat-card-gradient stat-card-green' : ''}`}
                >
                  <CardContent className="p-6 relative z-10">
                    {/* Card Header */}
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{getTypeIcon(target.type)}</span>
                        <div>
                          <h4 className="text-base font-bold text-foreground flex items-center gap-2">
                            هدف {TYPE_LABELS[target.type]}
                            {/* Type badge pill */}
                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold border-0 ${typeInfo.badgeBg} ${typeInfo.badgeText}`}>
                              {TYPE_LABELS[target.type]}
                            </span>
                            {isComplete && (
                              <span className="badge-active text-[10px]">
                                <CheckCircle2 className="w-3 h-3" />
                                تم التحقيق
                              </span>
                            )}
                          </h4>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <CalendarDays className="w-3 h-3" />
                            منذ {formatDateShortMonth(target.startDate)}
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

                    {/* Main Content: Ring + Stats */}
                    <div className="flex items-start gap-5">
                      {/* CSS Progress Ring */}
                      <div className={`shrink-0 ${isComplete ? 'animate-pulse-glow' : ''}`}>
                        <ProgressRing percent={percent} size={80} />
                      </div>

                      {/* Details */}
                      <div className="flex-1 space-y-3 min-w-0">
                        {/* Progress Bar */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground">التقدم</span>
                            <span className={`text-xs font-bold tabular-nums ${getProgressTextColor(percent)}`}>
                              {percent.toFixed(1)}%
                            </span>
                          </div>
                          <div className="relative h-3 rounded-full bg-muted/60 overflow-hidden">
                            <div
                              className={`absolute inset-y-0 right-0 rounded-full progress-bar-animated ${getProgressColor(percent)} ${isComplete ? 'shimmer' : ''}`}
                              style={{ width: `${Math.min(percent, 100)}%` }}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {getMotivationalMessage(percent)}
                          </p>
                        </div>

                        {/* Stats Grid */}
                        <div className="grid grid-cols-2 gap-2">
                          <StatPill
                            icon={DollarSign}
                            label="المبلغ المتبقي"
                            value={`${formatCurrency(target.remainingAmount)} ر.س`}
                            colorClass={isComplete ? 'text-green-500' : ''}
                          />
                          <StatPill
                            icon={Clock}
                            label="الأيام المتبقية"
                            value={isComplete ? 'مكتمل ✅' : target.daysRemaining > 0 ? `${target.daysRemaining} يوم` : target.hoursRemaining > 0 ? `${target.hoursRemaining} ساعة` : 'منتهي'}
                            colorClass={!isComplete && target.daysRemaining <= 1 ? 'text-red-500' : ''}
                          />
                          <StatPill
                            icon={TrendingUp}
                            label="المعدل اليومي المطلوب"
                            value={target.dailyTargetNeeded > 0 ? `${formatCurrency(target.dailyTargetNeeded)} ر.س` : isComplete ? '—' : '∞'}
                            colorClass={target.dailyTargetNeeded > target.targetAmount * 0.05 ? 'text-amber-500' : ''}
                          />
                          <StatPill
                            icon={HourglassIcon}
                            label="الوقت"
                            value={getTimeLabel(target)}
                          />
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

      {/* ── Inactive / Completed Targets ──────────────────────────── */}
      {!loading && targets.filter((t) => !t.isActive).length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            <h3 className="text-base font-bold text-foreground">أهداف سابقة</h3>
            <Badge variant="secondary" className="text-xs">{targets.filter((t) => !t.isActive).length}</Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 stagger-children">
            {targets.filter((t) => !t.isActive).map((target) => {
              const percent = target.progressPercentage
              const isComplete = percent >= 100
              const typeInfo = getTypeBadge(target.type)

              return (
                <Card key={target.id} className="rounded-2xl border-0 shadow-sm card-hover">
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <ProgressRing percent={percent} size={56} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-sm font-bold text-foreground truncate">
                            {TYPE_LABELS[target.type]}
                          </h4>
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[9px] font-semibold border-0 ${typeInfo.badgeBg} ${typeInfo.badgeText}`}>
                            {typeInfo.label}
                          </span>
                        </div>
                        <p className={`text-lg font-bold tabular-nums ${getProgressTextColor(percent)}`}>
                          {percent.toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="relative h-2 rounded-full bg-muted/60 overflow-hidden mb-3">
                      <div
                        className={`absolute inset-y-0 right-0 rounded-full ${getProgressColor(percent)}`}
                        style={{ width: `${Math.min(percent, 100)}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{formatCurrency(target.currentAmount)} / {formatCurrency(target.targetAmount)} ر.س</span>
                      <span>{formatDateShortMonth(target.createdAt)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1 mt-2">
                      <button
                        onClick={() => openEditDialog(target)}
                        className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                        title="تعديل"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setDeleteTarget(target)
                          setDeleteDialogOpen(true)
                        }}
                        className="p-1.5 rounded-lg hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive"
                        title="حذف"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
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
              إنشاء هدف جديد
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

            {/* Start Date */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">تاريخ البداية</Label>
              <Input
                type="date"
                value={editingTarget ? new Date(editingTarget.startDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]}
                disabled
                className="h-10 text-sm opacity-60"
              />
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
                    المبلغ: {formatCurrency(deleteTarget.targetAmount)} ر.س · التقدم: {deleteTarget.progressPercentage.toFixed(0)}%
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
