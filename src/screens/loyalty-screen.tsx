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
import { toast } from 'sonner'
import { useApi } from '@/hooks/use-api'
import { useFormValidation } from '@/hooks/use-form-validation'
import { createLoyaltyTransactionSchema } from '@/lib/validations'
import { EmptyState } from '@/components/empty-state'
import { formatDate, formatTime } from '@/lib/date-utils'
import { useTranslation } from '@/lib/translations'
import {
  Gift,
  Plus,
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Users,
  Trophy,
  Star,
  Crown,
  Medal,
  ArrowLeft,
  Loader2,
  Minus,
  Award,
  Clock,
  Zap,
} from 'lucide-react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

// ── Types ──────────────────────────────────────────────────────────

interface LeaderboardCustomer {
  id: string
  name: string
  phone: string | null
  loyaltyPoints: number
  _count: { loyaltyTransactions: number }
}

interface RecentTransaction {
  id: string
  customerId: string
  points: number
  transactionType: 'earned' | 'redeemed' | 'adjusted'
  description: string | null
  createdAt: string
  customer: { name: string } | null
}

interface ActivityDate {
  date: string
  earned: number
  redeemed: number
}

interface CustomerTransaction {
  id: string
  customerId: string
  points: number
  transactionType: 'earned' | 'redeemed' | 'adjusted'
  description: string | null
  referenceId: string | null
  invoiceId: string | null
  createdAt: string
}

interface CustomerOption {
  id: string
  name: string
  phone: string | null
}

interface LoyaltyDashboardData {
  totalEarned: number
  totalRedeemed: number
  customerLeaderboard: LeaderboardCustomer[]
  activityByDate: Record<string, { earned: number; redeemed: number }>
  recentTransactions: RecentTransaction[]
}

interface LoyaltyCustomerDetailData {
  transactions: CustomerTransaction[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  currentPoints: number
}

// ── Helpers ────────────────────────────────────────────────────────

function getRankBadge(rank: number) {
  if (rank === 1) return { icon: Crown, color: 'text-amber-500', bg: 'bg-amber-500/10', label: '🥇' }
  if (rank === 2) return { icon: Medal, color: 'text-gray-400', bg: 'bg-gray-400/10', label: '🥈' }
  if (rank === 3) return { icon: Medal, color: 'text-amber-700', bg: 'bg-amber-700/10', label: '🥉' }
  return { icon: Star, color: 'text-muted-foreground', bg: 'bg-muted/30', label: `#${rank}` }
}

function getTransactionColor(type: string) {
  switch (type) {
    case 'earned': return { bg: 'bg-green-500/10', text: 'text-green-600 dark:text-green-400', border: 'border-green-500/20' }
    case 'redeemed': return { bg: 'bg-red-500/10', text: 'text-red-600 dark:text-red-400', border: 'border-red-500/20' }
    case 'adjusted': return { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-500/20' }
    default: return { bg: 'bg-muted/30', text: 'text-muted-foreground', border: 'border-border' }
  }
}

// ── Loading Skeleton ──────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="skeleton-shimmer h-4 w-24 rounded" />
            <div className="skeleton-shimmer h-8 w-16 rounded" />
          </div>
          <div className="skeleton-shimmer w-11 h-11 rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  )
}

function LeaderboardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardContent className="p-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 py-3 border-b border-border/50 last:border-0">
            <div className="skeleton-shimmer w-8 h-8 rounded-full" />
            <div className="flex-1 space-y-1.5">
              <div className="skeleton-shimmer h-4 w-32 rounded" />
              <div className="skeleton-shimmer h-3 w-20 rounded" />
            </div>
            <div className="skeleton-shimmer h-6 w-16 rounded-lg" />
          </div>
        ))}
      </CardContent>
    </Card>
  )
}

function TransactionSkeleton() {
  return (
    <Card className="rounded-xl border-0 shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className="skeleton-shimmer w-10 h-10 rounded-xl" />
          <div className="flex-1 space-y-1.5">
            <div className="skeleton-shimmer h-4 w-40 rounded" />
            <div className="skeleton-shimmer h-3 w-24 rounded" />
          </div>
          <div className="skeleton-shimmer h-5 w-14 rounded-lg" />
        </div>
      </CardContent>
    </Card>
  )
}

// ── Main Component ────────────────────────────────────────────────

export function LoyaltyScreen() {
  const { t, isRTL, lang } = useTranslation()
  const { get, post } = useApi()
  const adjustValidation = useFormValidation({ schema: createLoyaltyTransactionSchema })

  // ── State ──────────────────────────────────────────────────────
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  // Dashboard data
  const [totalEarned, setTotalEarned] = useState(0)
  const [totalRedeemed, setTotalRedeemed] = useState(0)
  const [leaderboard, setLeaderboard] = useState<LeaderboardCustomer[]>([])
  const [activityByDate, setActivityByDate] = useState<ActivityDate[]>([])
  const [recentTransactions, setRecentTransactions] = useState<RecentTransaction[]>([])

  // Customer detail view
  const [selectedCustomer, setSelectedCustomer] = useState<LeaderboardCustomer | null>(null)
  const [customerTransactions, setCustomerTransactions] = useState<CustomerTransaction[]>([])
  const [currentPoints, setCurrentPoints] = useState(0)
  const [customerPage, setCustomerPage] = useState(1)
  const [customerTotalPages, setCustomerTotalPages] = useState(1)
  const [loadingCustomer, setLoadingCustomer] = useState(false)

  // Adjust points dialog
  const [adjustDialogOpen, setAdjustDialogOpen] = useState(false)
  const [adjustCustomers, setAdjustCustomers] = useState<CustomerOption[]>([])
  const [adjustCustomerId, setAdjustCustomerId] = useState('')
  const [adjustPoints, setAdjustPoints] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [adjustType, setAdjustType] = useState<'add' | 'deduct'>('add')
  const [submittingAdjust, setSubmittingAdjust] = useState(false)

  // ── Fetch Dashboard Data ───────────────────────────────────────
  const fetchDashboard = useCallback(async (showRefresh = false) => {
    if (showRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const result = await get<LoyaltyDashboardData>('/api/loyalty', undefined, { showErrorToast: false })
      if (result) {
        setTotalEarned(result.totalEarned || 0)
        setTotalRedeemed(result.totalRedeemed || 0)
        setLeaderboard(result.customerLeaderboard || [])
        setRecentTransactions(result.recentTransactions || [])

        // Transform activityByDate into array for chart
        const actMap = result.activityByDate || {}
        const actArray = Object.entries(actMap)
          .map(([date, val]) => ({
            date,
            earned: val.earned || 0,
            redeemed: val.redeemed || 0,
          }))
          .sort((a, b) => a.date.localeCompare(b.date))
        setActivityByDate(actArray)
      }
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [get])

  useEffect(() => {
    fetchDashboard()
  }, [fetchDashboard])

  // ── Fetch Customer Detail ──────────────────────────────────────
  const fetchCustomerDetail = useCallback(async (customer: LeaderboardCustomer, page = 1) => {
    setLoadingCustomer(true)
    setSelectedCustomer(customer)
    setCustomerPage(page)

    try {
      const result = await get<LoyaltyCustomerDetailData>('/api/loyalty', { customerId: customer.id, page, limit: 10 })
      if (result) {
        setCustomerTransactions(result.transactions || [])
        setCurrentPoints(result.currentPoints || 0)
        setCustomerTotalPages(result.pagination?.totalPages || 1)
      }
    } finally {
      setLoadingCustomer(false)
    }
  }, [get])

  // ── Fetch Customers for Adjust Dialog ──────────────────────────
  const openAdjustDialog = async () => {
    setAdjustDialogOpen(true)
    setAdjustCustomerId('')
    setAdjustPoints('')
    setAdjustReason('')
    setAdjustType('add')
    adjustValidation.clearAllErrors()

    const result = await get<{ customers: CustomerOption[] }>('/api/customers')
    if (result?.customers) {
      setAdjustCustomers(result.customers)
    }
  }

  // ── Submit Adjust Points ───────────────────────────────────────
  const handleSubmitAdjust = async () => {
    const pointsValue = parseInt(adjustPoints)
    const finalPoints = adjustType === 'add' ? pointsValue : -pointsValue

    const isValid = adjustValidation.validate({
      customerId: adjustCustomerId,
      points: finalPoints,
      transactionType: 'adjusted',
      description: adjustReason,
    })
    if (!isValid) return

    setSubmittingAdjust(true)
    try {
      const result = await post<{ transaction: unknown; newPointsBalance: number }>('/api/loyalty', {
        customerId: adjustCustomerId,
        points: finalPoints,
        transactionType: 'adjusted',
        description: adjustReason,
      }, { showSuccessToast: true, successMessage: t('common.success') })

      if (result) {
        setAdjustDialogOpen(false)
        fetchDashboard(true)
        // If viewing a customer and they were adjusted, refresh their detail
        if (selectedCustomer && selectedCustomer.id === adjustCustomerId) {
          fetchCustomerDetail({ ...selectedCustomer, loyaltyPoints: result.newPointsBalance ?? selectedCustomer.loyaltyPoints }, customerPage)
        }
      }
    } finally {
      setSubmittingAdjust(false)
    }
  }

  // ── Back to Dashboard ──────────────────────────────────────────
  const backToDashboard = () => {
    setSelectedCustomer(null)
    setCustomerTransactions([])
    setCurrentPoints(0)
    setCustomerPage(1)
    setCustomerTotalPages(1)
  }

  // ── Computed ───────────────────────────────────────────────────
  const netPoints = totalEarned - totalRedeemed
  const activeCustomers = leaderboard.filter(c => c.loyaltyPoints > 0).length

  // ── Chart data for last 30 days ────────────────────────────────
  const chartData = activityByDate.length > 0 ? activityByDate : []

  // ── Render: Customer Detail View ───────────────────────────────
  if (selectedCustomer) {
    return (
      <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up">
        {/* Back Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={backToDashboard}
            className="p-2 rounded-xl hover:bg-muted transition-colors"
          >
            <ArrowLeft className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
          </button>
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Users className="w-5 h-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-foreground truncate">{selectedCustomer.name}</h2>
              <p className="text-sm text-muted-foreground">{selectedCustomer.phone || '—'}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="badge-active text-sm px-3 py-1">
              <Award className="w-3.5 h-3.5" />
              <span className="ms-1">{t('loyalty.pointsBalance')}: {currentPoints.toLocaleString()}</span>
            </Badge>
          </div>
        </div>

        {/* Customer Points Card */}
        <Card className="rounded-2xl border-0 shadow-sm stat-card-gradient stat-card-blue">
          <CardContent className="p-6 relative z-10">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">{t('loyalty.customerPoints')}</p>
                <p className="text-3xl font-bold text-foreground mt-1 number-animate-in">{currentPoints.toLocaleString()}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transaction History */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            {t('loyalty.recentTransactions')}
          </h3>

          {loadingCustomer ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <TransactionSkeleton key={i} />
              ))}
            </div>
          ) : customerTransactions.length === 0 ? (
            <EmptyState
              icon={Gift}
              title={t('loyalty.noTransactions')}
              compact
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 stagger-children">
              {customerTransactions.map((tx) => {
                const colorStyle = getTransactionColor(tx.transactionType)
                return (
                  <Card key={tx.id} className={`rounded-xl border-0 shadow-sm card-hover ${colorStyle.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorStyle.bg}`}>
                          {tx.transactionType === 'earned' && <TrendingUp className={`w-5 h-5 ${colorStyle.text}`} />}
                          {tx.transactionType === 'redeemed' && <TrendingDown className={`w-5 h-5 ${colorStyle.text}`} />}
                          {tx.transactionType === 'adjusted' && <Zap className={`w-5 h-5 ${colorStyle.text}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {tx.description || t(`loyalty.${tx.transactionType}`)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDate(tx.createdAt)} - {formatTime(tx.createdAt)}
                          </p>
                        </div>
                        <div className={`text-sm font-bold tabular-nums ${colorStyle.text}`}>
                          {tx.points > 0 ? '+' : ''}{tx.points.toLocaleString()}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Pagination */}
          {customerTotalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={customerPage <= 1}
                onClick={() => fetchCustomerDetail(selectedCustomer, customerPage - 1)}
              >
                {t('common.previous')}
              </Button>
              <span className="text-sm text-muted-foreground px-3">
                {customerPage} / {customerTotalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={customerPage >= customerTotalPages}
                onClick={() => fetchCustomerDetail(selectedCustomer, customerPage + 1)}
              >
                {t('common.next')}
              </Button>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Render: Main Dashboard ─────────────────────────────────────
  return (
    <div className="h-full overflow-y-auto p-4 md:p-6 space-y-6 animate-fade-in-up">
      {/* ── Page Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">{t('loyalty.title')}</h2>
            <p className="text-sm text-muted-foreground">{t('loyalty.customerLeaderboard')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-sm font-medium disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t('common.refresh')}</span>
          </button>
          <button
            onClick={openAdjustDialog}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-colors text-sm font-medium btn-ripple"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('loyalty.adjustPoints')}</span>
            <Plus className="w-4 h-4 sm:hidden" />
          </button>
        </div>
      </div>

      {/* ── Decorative Glow Orb ─────────────────────────────────── */}
      <div className="relative">
        <div className="glow-orb glow-orb-blue absolute -top-10 -right-10 w-48 h-48 opacity-20 pointer-events-none" />
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────── */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 stagger-children">
          {/* Total Earned */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient stat-card-green">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loyalty.earnedPoints')}</p>
                  <p className="text-2xl font-bold text-green-600 mt-1 number-animate-in">
                    {totalEarned.toLocaleString()}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-green-500/10 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Redeemed */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient stat-card-red">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loyalty.redeemedPoints')}</p>
                  <p className="text-2xl font-bold text-red-500 mt-1 number-animate-in">
                    {totalRedeemed.toLocaleString()}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-red-500/10 flex items-center justify-center">
                  <TrendingDown className="w-5 h-5 text-red-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Net Points */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover stat-card-gradient stat-card-blue">
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loyalty.totalPoints')}</p>
                  <p className="text-2xl font-bold text-primary mt-1 number-animate-in">
                    {netPoints.toLocaleString()}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Star className="w-5 h-5 text-primary" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Customers */}
          <Card className="rounded-2xl border-0 shadow-sm card-hover" style={{ '--card-gradient': 'linear-gradient(135deg, rgba(156,54,181,0.08), transparent)' } as React.CSSProperties}>
            <CardContent className="p-5 relative z-10">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{t('loyalty.topCustomers')}</p>
                  <p className="text-2xl font-bold text-purple-600 mt-1 number-animate-in">
                    {activeCustomers}
                  </p>
                </div>
                <div className="w-11 h-11 rounded-2xl bg-purple-500/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="section-divider" />

      {/* ── Activity Chart ──────────────────────────────────────── */}
      <div className="space-y-3">
        <h3 className="text-base font-bold text-foreground flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-primary" />
          {t('loyalty.activityChart')}
        </h3>

        {loading ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="skeleton-shimmer h-64 w-full rounded-xl" />
            </CardContent>
          </Card>
        ) : chartData.length === 0 ? (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-12 flex flex-col items-center justify-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                <TrendingUp className="w-7 h-7 text-muted-foreground/50" />
              </div>
              <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
            </CardContent>
          </Card>
        ) : (
          <Card className="rounded-2xl border-0 shadow-sm">
            <CardContent className="p-4 md:p-6">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(val: string) => {
                        const d = new Date(val)
                        return `${d.getDate()}/${d.getMonth() + 1}`
                      }}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{
                        borderRadius: '12px',
                        border: 'none',
                        boxShadow: '0 10px 40px rgba(0,0,0,0.15)',
                        fontSize: '12px',
                      }}
                      labelFormatter={(label: string) => formatDate(label)}
                    />
                    <Legend />
                    <Bar
                      dataKey="earned"
                      name={t('loyalty.earned')}
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                    <Bar
                      dataKey="redeemed"
                      name={t('loyalty.redeemed')}
                      fill="#ef4444"
                      radius={[4, 4, 0, 0]}
                      maxBarSize={20}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="section-divider" />

      {/* ── Two Column: Leaderboard + Recent Transactions ───────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Customer Leaderboard */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Trophy className="w-5 h-5 text-amber-500" />
            {t('loyalty.customerLeaderboard')}
            <Badge variant="secondary" className="text-xs">{leaderboard.length}</Badge>
          </h3>

          {loading ? (
            <LeaderboardSkeleton />
          ) : leaderboard.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-12 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center">
                  <Trophy className="w-7 h-7 text-muted-foreground/50" />
                </div>
                <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-2xl border-0 shadow-sm card-hover overflow-hidden">
              <CardContent className="p-0">
                <div className="max-h-96 overflow-y-auto scrollbar-none">
                  {leaderboard.map((customer, index) => {
                    const rank = index + 1
                    const badge = getRankBadge(rank)
                    const RankIcon = badge.icon
                    return (
                      <button
                        key={customer.id}
                        onClick={() => fetchCustomerDetail(customer)}
                        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition-colors text-start border-b border-border/30 last:border-0 group"
                      >
                        {/* Rank Badge */}
                        <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${badge.bg}`}>
                          {rank <= 3 ? (
                            <RankIcon className={`w-5 h-5 ${badge.color}`} />
                          ) : (
                            <span className="text-xs font-bold text-muted-foreground">{rank}</span>
                          )}
                        </div>

                        {/* Customer Info */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                            {customer.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {customer.phone || '—'} · {customer._count.loyaltyTransactions} {t('loyalty.recentTransactions').replace(t('loyalty.recentTransactions'), lang === 'ar' ? 'معاملة' : 'transaction')}
                          </p>
                        </div>

                        {/* Points */}
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          <Star className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-sm font-bold tabular-nums text-foreground">
                            {customer.loyaltyPoints.toLocaleString()}
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Recent Transactions */}
        <div className="space-y-3">
          <h3 className="text-base font-bold text-foreground flex items-center gap-2">
            <Clock className="w-5 h-5 text-muted-foreground" />
            {t('loyalty.recentTransactions')}
            <Badge variant="secondary" className="text-xs">{recentTransactions.length}</Badge>
          </h3>

          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <TransactionSkeleton key={i} />
              ))}
            </div>
          ) : recentTransactions.length === 0 ? (
            <Card className="rounded-2xl border-0 shadow-sm">
              <CardContent className="p-12">
                <EmptyState
                  icon={Gift}
                  title={t('loyalty.noTransactions')}
                  compact
                />
              </CardContent>
            </Card>
          ) : (
            <div className="max-h-96 overflow-y-auto scrollbar-none space-y-2.5">
              {recentTransactions.slice(0, 20).map((tx) => {
                const colorStyle = getTransactionColor(tx.transactionType)
                return (
                  <Card key={tx.id} className={`rounded-xl border-0 shadow-sm card-hover ${colorStyle.bg}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        {/* Icon */}
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${colorStyle.bg}`}>
                          {tx.transactionType === 'earned' && <TrendingUp className={`w-5 h-5 ${colorStyle.text}`} />}
                          {tx.transactionType === 'redeemed' && <TrendingDown className={`w-5 h-5 ${colorStyle.text}`} />}
                          {tx.transactionType === 'adjusted' && <Zap className={`w-5 h-5 ${colorStyle.text}`} />}
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {tx.customer?.name || '—'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {tx.description || t(`loyalty.${tx.transactionType}`)} · {formatDate(tx.createdAt)}
                          </p>
                        </div>

                        {/* Points + Type Badge */}
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`text-sm font-bold tabular-nums ${colorStyle.text}`}>
                            {tx.points > 0 ? '+' : ''}{tx.points.toLocaleString()}
                          </span>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${colorStyle.bg} ${colorStyle.text}`}>
                            {t(`loyalty.${tx.transactionType}`)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Adjust Points Dialog ────────────────────────────────── */}
      <Dialog open={adjustDialogOpen} onOpenChange={setAdjustDialogOpen}>
        <DialogContent className="sm:max-w-md glass-card" dir={isRTL ? 'rtl' : 'ltr'}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-primary" />
              {t('loyalty.adjustPoints')}
            </DialogTitle>
            <DialogDescription>
              {t('loyalty.pointsBalance')} — {t('loyalty.addPoints')} / {t('loyalty.deductPoints')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 mt-2">
            {/* Customer Select */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('loyalty.selectCustomer')} <span className="text-destructive">*</span></Label>
              <Select value={adjustCustomerId} onValueChange={(val) => {
                setAdjustCustomerId(val)
                adjustValidation.clearFieldError('customerId')
              }}>
                <SelectTrigger className={`h-10 ${adjustValidation.errors.customerId ? 'border-destructive' : ''}`}>
                  <SelectValue placeholder={t('loyalty.selectCustomer')} />
                </SelectTrigger>
                <SelectContent>
                  {adjustCustomers.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name} {c.phone ? `(${c.phone})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {adjustValidation.errors.customerId && (
                <p className="text-sm text-destructive">{adjustValidation.errors.customerId}</p>
              )}
            </div>

            {/* Type Toggle */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('common.type')}</Label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType('add')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                    adjustType === 'add'
                      ? 'border-green-500 bg-green-500/5 text-green-600'
                      : 'border-border/50 hover:border-green-500/50 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  <span className="text-sm font-semibold">{t('loyalty.addPoints')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustType('deduct')}
                  className={`flex items-center justify-center gap-2 p-3 rounded-xl border-2 transition-all duration-200 ${
                    adjustType === 'deduct'
                      ? 'border-red-500 bg-red-500/5 text-red-600'
                      : 'border-border/50 hover:border-red-500/50 hover:bg-muted/50 text-muted-foreground'
                  }`}
                >
                  <Minus className="w-4 h-4" />
                  <span className="text-sm font-semibold">{t('loyalty.deductPoints')}</span>
                </button>
              </div>
            </div>

            {/* Points Amount */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('loyalty.pointsAmount')} <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                min="1"
                placeholder="0"
                value={adjustPoints}
                onChange={(e) => {
                  setAdjustPoints(e.target.value)
                  adjustValidation.clearFieldError('points')
                }}
                className={`h-10 text-sm tabular-nums ${adjustValidation.errors.points ? 'border-destructive' : ''}`}
                dir="ltr"
              />
              {adjustValidation.errors.points && (
                <p className="text-sm text-destructive">{adjustValidation.errors.points}</p>
              )}
            </div>

            {/* Reason */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">{t('loyalty.reason')} <span className="text-destructive">*</span></Label>
              <Input
                type="text"
                placeholder={t('loyalty.reason')}
                value={adjustReason}
                onChange={(e) => {
                  setAdjustReason(e.target.value)
                  adjustValidation.clearFieldError('description')
                }}
                className={`h-10 text-sm ${adjustValidation.errors.description ? 'border-destructive' : ''}`}
              />
              {adjustValidation.errors.description && (
                <p className="text-sm text-destructive">{adjustValidation.errors.description}</p>
              )}
            </div>
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setAdjustDialogOpen(false)} disabled={submittingAdjust}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleSubmitAdjust}
              disabled={submittingAdjust || !adjustCustomerId || !adjustPoints || !adjustReason}
              className="gap-2 btn-ripple shimmer"
            >
              {submittingAdjust ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Zap className="w-4 h-4" />
              )}
              {t('common.submit')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
