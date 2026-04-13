'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { Bell, AlertTriangle, PackageSearch, XCircle, Package, ShoppingCart, Eye, Filter, RefreshCw } from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { useCurrency } from '@/hooks/use-currency'
import { fetchWithAuth } from '@/lib/fetch-with-auth'
import { toast } from 'sonner'

// ─── Types ──────────────────────────────────────────────────────────
type Severity = 'out' | 'critical' | 'low'

interface StockAlert {
  id: string
  name: string
  quantity: number
  minQuantity: number
  price: number
  costPrice: number
  barcode: string | null
  image: string | null
  categoryName: string
  categoryId: string | null
  status: 'out' | 'low'
  severity: Severity
  deficit: number
  stockPercentage: number
  suggestedOrder: number
  reorderCost: number
  totalSold: number
  daysRemaining: number | null
}

interface StockAlertSummary {
  total: number
  outOfStock: number
  critical: number
  lowStock: number
  totalReorderCost: number
  avgDeficit: number
}

interface StockAlertResponse {
  success: boolean
  data: {
    alerts: StockAlert[]
    summary?: StockAlertSummary
    pagination?: { total: number; page: number; totalPages: number }
  }
}

type FilterSeverity = 'all' | Severity

// ─── Severity Config ────────────────────────────────────────────────
const severityConfig: Record<Severity, {
  label: string
  icon: React.ElementType
  iconBg: string
  iconColor: string
  badgeClass: string
  dotColor: string
}> = {
  out: {
    label: 'نفذ',
    icon: XCircle,
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    badgeClass: 'bg-destructive/15 text-destructive border-destructive/30',
    dotColor: 'bg-red-500',
  },
  critical: {
    label: 'حرج',
    icon: AlertTriangle,
    iconBg: 'bg-orange-500/10',
    iconColor: 'text-orange-600 dark:text-orange-400',
    badgeClass: 'bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:border-orange-500/30',
    dotColor: 'bg-orange-500',
  },
  low: {
    label: 'منخفض',
    icon: AlertTriangle,
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-500 dark:text-amber-400',
    badgeClass: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/30',
    dotColor: 'bg-amber-500',
  },
}

// ─── Component ──────────────────────────────────────────────────────
export function StockAlertsWidget() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [summary, setSummary] = useState<StockAlertSummary>({ total: 0, outOfStock: 0, critical: 0, lowStock: 0, totalReorderCost: 0, avgDeficit: 0 })
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<FilterSeverity>('all')
  const { setScreen } = useAppStore()
  const { formatCurrency } = useCurrency()

  const fetchAlerts = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    try {
      const res = await fetchWithAuth('/api/stock-alerts')
      const json: StockAlertResponse = await res.json()
      if (json.success && json.data) {
        setAlerts(json.data.alerts)
        setSummary(json.data.summary || { total: json.data.alerts.length, outOfStock: 0, critical: 0, lowStock: 0, totalReorderCost: 0, avgDeficit: 0 })
      }
    } catch {
      // Silently fail - non-critical feature
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    // Auto-refresh every 60 seconds
    const interval = setInterval(() => fetchAlerts(true), 60000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const totalCount = summary.total
  const outCount = summary.outOfStock
  const criticalCount = summary.critical

  // Filter alerts by severity
  const filteredAlerts = filter === 'all' ? alerts : alerts.filter((a) => a.severity === filter)

  // Handle quick action: create purchase order
  const handleCreatePurchase = (alert: StockAlert) => {
    setOpen(false)
    setScreen('purchases')
    toast.info(`تم التوجيه لإنشاء أمر شراء: ${alert.name}`, {
      description: `الكمية المقترحة: ${alert.suggestedOrder} وحدة`,
    })
  }

  // Handle quick action: view product
  const handleViewProduct = (alert: StockAlert) => {
    setOpen(false)
    setScreen('inventory')
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('sultan-highlight-product', alert.id)
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="relative p-2 rounded-xl hover:bg-muted transition-all duration-200"
                aria-label="تنبيهات المخزون"
              >
                <Bell className="w-5 h-5 text-foreground/70" />
                {totalCount > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold leading-none animate-fade-in-up badge-bounce">
                    {totalCount > 99 ? '٩٩+' : totalCount}
                  </span>
                )}
              </button>
            </PopoverTrigger>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="font-medium">
            تنبيهات المخزون
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>

      <PopoverContent align="start" side="bottom" className="w-[380px] p-0 glass-card-v2" dir="rtl">
        {/* Header */}
        <div className="p-3 border-b border-border/50 flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
            <Bell className="w-3.5 h-3.5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold">تنبيهات المخزون</h3>
            <p className="text-[10px] text-muted-foreground">
              {totalCount === 0 ? 'جميع المنتجات بمخزون كافٍ' : `${totalCount} منتج يحتاج انتباه`}
            </p>
          </div>
          <button
            onClick={() => fetchAlerts(true)}
            disabled={refreshing}
            className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
            aria-label="تحديث"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Summary badges */}
        {totalCount > 0 && (
          <div className="px-3 py-2 border-b border-border/30 flex items-center gap-2 flex-wrap">
            {outCount > 0 && (
              <Badge variant="destructive" className="badge-danger text-[10px] px-2 py-0.5 gap-1">
                <XCircle className="w-3 h-3" />
                {outCount} نفذت
              </Badge>
            )}
            {criticalCount > 0 && (
              <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-orange-500/15 text-orange-600 border-orange-500/30 dark:text-orange-400 dark:border-orange-500/30">
                <AlertTriangle className="w-3 h-3" />
                {criticalCount} حرجة
              </Badge>
            )}
            <Badge className="text-[10px] px-2 py-0.5 gap-1 bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/30">
              <AlertTriangle className="w-3 h-3" />
              {summary.lowStock} منخفضة
            </Badge>
            {summary.totalReorderCost > 0 && (
              <span className="text-[10px] text-muted-foreground mr-auto">
                تكلفة الطلب: {formatCurrency(summary.totalReorderCost)}
              </span>
            )}
          </div>
        )}

        {/* Filter tabs */}
        {totalCount > 0 && (
          <div className="px-3 py-2 border-b border-border/30 flex items-center gap-1.5">
            <Filter className="w-3 h-3 text-muted-foreground" />
            <button
              onClick={() => setFilter('all')}
              className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                filter === 'all' ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
              }`}
            >
              الكل ({totalCount})
            </button>
            {outCount > 0 && (
              <button
                onClick={() => setFilter('out')}
                className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                  filter === 'out' ? 'bg-destructive/10 text-destructive' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                نفذت ({outCount})
              </button>
            )}
            {criticalCount > 0 && (
              <button
                onClick={() => setFilter('critical')}
                className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                  filter === 'critical' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                حرجة ({criticalCount})
              </button>
            )}
            {summary.lowStock > 0 && (
              <button
                onClick={() => setFilter('low')}
                className={`text-[10px] font-medium px-2 py-1 rounded-md transition-colors ${
                  filter === 'low' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'text-muted-foreground hover:bg-muted'
                }`}
              >
                منخفضة ({summary.lowStock})
              </button>
            )}
          </div>
        )}

        {/* Alerts List */}
        <ScrollArea className="max-h-72">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-xs animate-fade-in-up">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
              جاري التحميل...
            </div>
          ) : filteredAlerts.length === 0 ? (
            <div className="p-6 text-center animate-fade-in-up">
              <Package className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-medium">
                {filter === 'all' ? 'جميع المنتجات بمخزون كافٍ' : 'لا توجد تنبيهات بهذا المستوى'}
              </p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">لا توجد تنبيهات حالياً</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {filteredAlerts.map((item, index) => {
                const config = severityConfig[item.severity]
                const Icon = config.icon
                return (
                  <div
                    key={item.id}
                    className="p-3 hover:bg-muted/50 transition-colors animate-fade-in-up"
                    style={{ animationDelay: `${index * 50}ms` }}
                  >
                    <div className="flex items-start gap-3">
                      {/* Status Icon */}
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${config.iconBg}`}
                      >
                        <Icon className={`w-4 h-4 ${config.iconColor}`} />
                      </div>

                      {/* Product Info */}
                      <div className="flex-1 min-w-0 cursor-pointer" onClick={() => handleViewProduct(item)}>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                          <Badge
                            variant="outline"
                            className={`text-[9px] px-1.5 py-0 flex-shrink-0 ${config.badgeClass}`}
                          >
                            {config.label}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-xs font-semibold ${config.iconColor}`}>
                            الكمية: {item.quantity}
                          </span>
                          <span className="text-muted-foreground/40">|</span>
                          <span className="text-[10px] text-muted-foreground">
                            الحد الأدنى: {item.minQuantity}
                          </span>
                          {item.daysRemaining !== null && (
                            <>
                              <span className="text-muted-foreground/40">|</span>
                              <span className={`text-[10px] ${
                                item.daysRemaining <= 3 ? 'text-destructive font-medium' : 'text-muted-foreground'
                              }`}>
                                {item.daysRemaining === 0 ? 'نفذ اليوم' : `${item.daysRemaining} يوم متبقي`}
                              </span>
                            </>
                          )}
                        </div>
                        <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                          {item.categoryName}
                          {item.deficit > 0 && (
                            <span className="mr-2 text-amber-500/70 dark:text-amber-400/70">
                              تحتاج {item.deficit} وحدة
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 mt-2 mr-11">
                      <button
                        onClick={() => handleCreatePurchase(item)}
                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-primary/5 hover:bg-primary/10 text-primary transition-colors"
                      >
                        <ShoppingCart className="w-3 h-3" />
                        إنشاء أمر شراء
                      </button>
                      <button
                        onClick={() => handleViewProduct(item)}
                        className="flex items-center gap-1 text-[10px] font-medium px-2 py-1 rounded-md bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                      >
                        <Eye className="w-3 h-3" />
                        عرض المنتج
                      </button>
                      {item.suggestedOrder > 0 && (
                        <span className="text-[9px] text-muted-foreground/60 mr-auto">
                          اقتراح: {item.suggestedOrder} وحدة ({formatCurrency(item.reorderCost)})
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {totalCount > 0 && (
          <div className="p-2 border-t border-border/50">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs font-medium text-primary hover:text-primary hover:bg-primary/5"
              onClick={() => {
                setOpen(false)
                setScreen('inventory')
              }}
            >
              <PackageSearch className="w-3.5 h-3.5 ml-1.5" />
              عرض الكل في المخزون
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
