'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { formatWithSettings, formatDualCurrency } from '@/lib/currency'
import { useAppStore } from '@/store/app-store'

// ─── Animated Number Hook ────────────────────────────────────────────
export function useAnimatedNumber(target: number, duration = 1200) {
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

// ─── Dual Currency Format Helper ──────────────────────────────────────
export function dualFormat(amount: number): { primary: string; secondary: string | null; display: string } {
  const settings = useAppStore.getState().settings
  return formatDualCurrency(amount, settings)
}

// ─── Currency Format ─────────────────────────────────────────────────
export const formatCurrency = formatWithSettings

// ─── Chart Tooltip Components ─────────────────────────────────────────

interface TooltipPayloadItem {
  value: number
  payload?: { name?: string }
}

export function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload?: { name?: string } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const dual = dualFormat(payload[0].value)
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-bold text-foreground">{dual.display}</p>
    </div>
  )
}

export function PieTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: Array<{ name: string; value: number; payload: { name: string; value: number } }>
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  const dual = dualFormat(item.value)
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{item.payload.name}</p>
      <p className="text-sm font-bold text-foreground">{dual.display}</p>
    </div>
  )
}

export function BarTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; payload?: { name?: string } }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  const item = payload[0]
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {item.payload?.name || label}
      </p>
      <p className="text-sm font-bold text-foreground">{item.value} وحدة</p>
    </div>
  )
}

export function ComparisonTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean
  payload?: Array<{ value: number; dataKey: string }>
  label?: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-popover text-popover-foreground border border-border rounded-xl px-3 py-2 shadow-lg">
      <p className="text-xs font-medium text-muted-foreground mb-1">{label}</p>
      {payload.map((item) => (
        <p key={item.dataKey} className="text-sm font-bold text-foreground">
          {item.dataKey === 'sales' ? 'المبيعات' : 'المشتريات'}: {dualFormat(item.value).display}
        </p>
      ))}
    </div>
  )
}

export function CustomLegend({
  payload,
}: {
  payload?: Array<{ value: string; color: string }>
}) {
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

// ─── Chart Color Palette ─────────────────────────────────────────────

export const CHART_COLORS = [
  '#3b5bdb', '#364fc7', '#5c7cfa', '#e03131', '#c92a2a',
  '#0ca678', '#f08c00', '#9c36b5', '#1c7ed6', '#e8590c',
]

// ─── Skeleton Components ─────────────────────────────────────────────

export function SummaryCardSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm skeleton-card">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="w-12 h-12 rounded-2xl" />
        </div>
      </CardContent>
    </Card>
  )
}

export function ChartSkeleton() {
  return (
    <Card className="rounded-2xl border-0 shadow-sm skeleton-card">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
        <Skeleton className="h-3 w-48 mt-1" />
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <Skeleton className="h-[280px] w-full rounded-xl" />
      </CardContent>
    </Card>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <Card className="rounded-2xl border-0 shadow-sm">
      <CardHeader className="pb-2">
        <Skeleton className="h-5 w-36" />
      </CardHeader>
      <CardContent className="p-6 pt-0">
        <div className="space-y-3">
          {Array.from({ length: rows }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Stat Card with Animated Number ──────────────────────────────────
import type { LucideIcon } from 'lucide-react'

export function StatCard({
  label,
  value,
  suffix,
  icon: Icon,
  iconBg,
  statClass,
  isInteger = false,
}: {
  label: string
  value: number
  suffix: string
  icon: LucideIcon
  iconBg: string
  statClass: string
  isInteger?: boolean
}) {
  const animatedValue = useAnimatedNumber(value)
  const dual = dualFormat(value)

  return (
    <Card className={`rounded-2xl border-0 shadow-sm card-elevated stat-card-gradient data-card-micro stat-card-v2 ${statClass}`}>
      <CardContent className="p-6 relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="text-3xl font-bold text-foreground mt-1 tabular-nums">
              {isInteger ? Math.round(animatedValue).toLocaleString('ar-SA') : dual.display}
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
