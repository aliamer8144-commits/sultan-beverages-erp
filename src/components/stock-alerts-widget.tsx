'use client'

import { useCallback, useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
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
import { Bell, AlertTriangle, PackageSearch, XCircle, Package } from 'lucide-react'
import { useAppStore } from '@/store/app-store'

// ─── Types ──────────────────────────────────────────────────────────
interface StockAlert {
  id: string
  name: string
  quantity: number
  minQuantity: number
  price: number
  categoryName: string
  status: 'out' | 'low'
  deficit: number
}

interface StockAlertSummary {
  total: number
  outOfStock: number
  lowStock: number
}

interface StockAlertResponse {
  success: boolean
  data: StockAlert[]
  summary?: StockAlertSummary
}

// ─── Component ──────────────────────────────────────────────────────
export function StockAlertsWidget() {
  const [alerts, setAlerts] = useState<StockAlert[]>([])
  const [summary, setSummary] = useState<StockAlertSummary>({ total: 0, outOfStock: 0, lowStock: 0 })
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { setScreen } = useAppStore()

  const fetchAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/stock-alerts')
      const json: StockAlertResponse = await res.json()
      if (json.success && json.data) {
        setAlerts(json.data)
        setSummary(json.summary || { total: json.data.length, outOfStock: 0, lowStock: 0 })
      }
    } catch {
      // Silently fail - non-critical feature
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAlerts()
    // Auto-refresh every 60 seconds
    const interval = setInterval(fetchAlerts, 60000)
    return () => clearInterval(interval)
  }, [fetchAlerts])

  const totalCount = summary.total
  const outCount = summary.outOfStock
  const lowCount = summary.lowStock

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <TooltipProvider delayDuration={0}>
        <Tooltip>
          <TooltipTrigger asChild>
            <PopoverTrigger asChild>
              <button
                className="relative p-2 rounded-xl hover:bg-muted transition-all duration-200 badge-ping"
                aria-label="تنبيهات المخزون"
              >
                <Bell className="w-5 h-5 text-foreground/70" />
                {totalCount > 0 && (
                  <span className="absolute -top-0.5 -left-0.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-destructive text-white text-[10px] font-bold leading-none animate-fade-in-up">
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

      <PopoverContent align="start" side="bottom" className="w-[340px] p-0" dir="rtl">
        {/* Header */}
        <div className="p-3 border-b border-border/50 flex items-center gap-2">
          <Bell className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-semibold">تنبيهات المخزون</h3>
          {totalCount > 0 && (
            <div className="mr-auto flex items-center gap-1.5">
              {outCount > 0 && (
                <Badge variant="destructive" className="badge-danger text-[10px] px-1.5 py-0">
                  {outCount} نفذت
                </Badge>
              )}
              {lowCount > 0 && (
                <Badge className="badge-warning text-[10px] px-1.5 py-0 bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400 dark:border-amber-500/30">
                  {lowCount} منخفضة
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Alerts List */}
        <ScrollArea className="max-h-72">
          {loading ? (
            <div className="p-6 text-center text-muted-foreground text-xs animate-fade-in-up">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-2" />
              جاري التحميل...
            </div>
          ) : totalCount === 0 ? (
            <div className="p-6 text-center animate-fade-in-up">
              <Package className="w-8 h-8 text-emerald-400/40 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground font-medium">جميع المنتجات بمخزون كافٍ</p>
              <p className="text-[10px] text-muted-foreground/60 mt-1">لا توجد تنبيهات حالياً</p>
            </div>
          ) : (
            <div className="divide-y divide-border/30">
              {alerts.map((item, index) => (
                <div
                  key={item.id}
                  className="flex items-start gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer animate-fade-in-up"
                  style={{ animationDelay: `${index * 50}ms` }}
                  onClick={() => {
                    setOpen(false)
                    setScreen('inventory')
                  }}
                >
                  {/* Status Icon */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                      item.status === 'out'
                        ? 'bg-destructive/10'
                        : 'bg-amber-500/10'
                    }`}
                  >
                    {item.status === 'out' ? (
                      <XCircle className="w-4 h-4 text-destructive" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                    )}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
                      <Badge
                        variant={item.status === 'out' ? 'destructive' : 'secondary'}
                        className={`text-[9px] px-1.5 py-0 flex-shrink-0 ${
                          item.status === 'low'
                            ? 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-400'
                            : 'badge-danger'
                        }`}
                      >
                        {item.status === 'out' ? 'نفذ' : 'منخفض'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className={`text-xs font-semibold ${
                          item.status === 'out'
                            ? 'text-destructive'
                            : 'text-amber-600 dark:text-amber-400'
                        }`}
                      >
                        الكمية: {item.quantity}
                      </span>
                      <Separator orientation="vertical" className="h-3" />
                      <span className="text-[10px] text-muted-foreground">
                        الحد الأدنى: {item.minQuantity}
                      </span>
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
              ))}
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
