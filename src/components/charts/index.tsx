/**
 * Shared high-level chart components for Sultan Beverages ERP.
 *
 * Each component wraps a Recharts chart with consistent styling:
 * - ResponsiveContainer, CartesianGrid, XAxis/YAxis defaults
 * - Unified tooltip from chart-utils
 * - Empty state handling
 * - Animation defaults (800ms ease-out)
 *
 * Usage:
 *   <VerticalBarChart data={data} dataKey="total" labelKey="month" />
 */

'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, PieChart, Pie, Legend,
  AreaChart, Area,
} from 'recharts'
import type { LucideIcon } from 'lucide-react'
import { EmptyState } from '@/components/empty-state'
import {
  ChartTooltipContent, ComparisonTooltip, CustomLegend,
  CHART_COLORS,
} from '@/components/chart-utils'

// ─── Shared Types ───────────────────────────────────────────────────

/** Recharts XAxis interval — number or special keywords */
type AxisInterval = number | 'preserveStartEnd' | 'preserveStart' | 'preserveEnd'

// ─── Shared Defaults ─────────────────────────────────────────────────

const GRID_STROKE = 'oklch(0.92 0.005 260)'
const TICK_COLOR = 'oklch(0.5 0.01 260)'
const CURSOR_FILL = 'oklch(0.55 0.2 260 / 8%)'
const TICK_FONT = { fontSize: 11, fill: TICK_COLOR }

const DEFAULT_MARGIN = { top: 5, right: 10, left: 10, bottom: 5 }

const kFormatter = (val: number) => `${(val / 1000).toFixed(0)}k`

// ─── Vertical Bar Chart ─────────────────────────────────────────────
// Used by: Dashboard (monthly sales), Daily-close (hourly)

interface VerticalBarChartProps<T = Record<string, unknown>> {
  data: T[]
  dataKey: string
  labelKey?: string
  color?: string
  height?: number
  barRadius?: [number, number, number, number]
  maxBarSize?: number
  animationBegin?: number
  /** Override default k-formatter */
  yAxisFormatter?: (val: number) => string
  xAxisTickFormatter?: (value: unknown) => string
  xAxisInterval?: AxisInterval
  xAxisAngle?: number
  xAxisHeight?: number
  tooltipSuffix?: string
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
}

export function VerticalBarChart<T = Record<string, unknown>>({
  data,
  dataKey,
  labelKey = 'name',
  color = '#3b5bdb',
  height = 280,
  barRadius = [8, 8, 0, 0],
  maxBarSize = 50,
  animationBegin = 0,
  yAxisFormatter = kFormatter,
  xAxisTickFormatter,
  xAxisInterval,
  xAxisAngle,
  xAxisHeight,
  tooltipSuffix,
  emptyIcon,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription,
}: VerticalBarChartProps<T>) {
  return (
    <div className="w-full" style={{ height }}>
      {!data || data.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="h-full" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={DEFAULT_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey={labelKey}
              tick={TICK_FONT}
              axisLine={false}
              tickLine={false}
              tickFormatter={xAxisTickFormatter}
              interval={xAxisInterval}
              angle={xAxisAngle}
              textAnchor={xAxisAngle ? 'end' : undefined}
              height={xAxisHeight}
            />
            <YAxis tick={TICK_FONT} axisLine={false} tickLine={false} tickFormatter={yAxisFormatter} />
            <Tooltip content={<ChartTooltipContent suffix={tooltipSuffix} />} cursor={{ fill: CURSOR_FILL }} />
            <Bar
              dataKey={dataKey}
              fill={color}
              radius={barRadius}
              maxBarSize={maxBarSize}
              animationDuration={800}
              animationEasing="ease-out"
              animationBegin={animationBegin}
            />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Horizontal Bar Chart ───────────────────────────────────────────
// Used by: Dashboard (top products), Analytics (category revenue)

interface HorizontalBarChartProps<T = Record<string, unknown>> {
  data: T[]
  dataKey: string
  labelKey?: string
  colors?: string[]
  height?: number
  barRadius?: [number, number, number, number]
  maxBarSize?: number
  animationBegin?: number
  yAxisWidth?: number
  margin?: { top: number; right: number; left: number; bottom: number }
  tooltipSuffix?: string
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
}

export function HorizontalBarChart<T = Record<string, unknown>>({
  data,
  dataKey,
  labelKey = 'name',
  colors = CHART_COLORS,
  height = 280,
  barRadius = [0, 8, 8, 0],
  maxBarSize = 30,
  animationBegin = 0,
  yAxisWidth = 100,
  margin = DEFAULT_MARGIN,
  tooltipSuffix,
  emptyIcon,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription,
}: HorizontalBarChartProps<T>) {
  return (
    <div className="w-full" style={{ height }}>
      {!data || data.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="h-full" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} layout="vertical" margin={margin}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} horizontal={false} />
            <XAxis
              type="number"
              tick={TICK_FONT}
              axisLine={false}
              tickLine={false}
              tickFormatter={tooltipSuffix ? undefined : kFormatter}
            />
            <YAxis
              type="category"
              dataKey={labelKey}
              tick={{ ...TICK_FONT, fontSize: 11 }}
              axisLine={false}
              tickLine={false}
              width={yAxisWidth}
            />
            <Tooltip content={<ChartTooltipContent suffix={tooltipSuffix} />} cursor={{ fill: CURSOR_FILL }} />
            <Bar
              dataKey={dataKey}
              radius={barRadius}
              maxBarSize={maxBarSize}
              animationDuration={800}
              animationEasing="ease-out"
              animationBegin={animationBegin}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Area Trend Chart ───────────────────────────────────────────────
// Used by: Analytics (sales trend), Expense (daily trend)

interface AreaTrendChartProps<T = Record<string, unknown>> {
  data: T[]
  dataKey: string
  labelKey?: string
  color?: string
  gradientId: string
  height?: number
  strokeWidth?: number
  animationDuration?: number
  xAxisTickFormatter?: (value: unknown) => string
  xAxisInterval?: AxisInterval
  yAxisFormatter?: (val: number) => string
  showDot?: boolean
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
}

export function AreaTrendChart<T = Record<string, unknown>>({
  data,
  dataKey,
  labelKey = 'date',
  color = '#3b5bdb',
  gradientId,
  height = 280,
  strokeWidth = 2,
  animationDuration = 1000,
  xAxisTickFormatter,
  xAxisInterval,
  yAxisFormatter = kFormatter,
  showDot = false,
  emptyIcon,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription,
}: AreaTrendChartProps<T>) {
  return (
    <div className="w-full" style={{ height }}>
      {!data || data.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="h-full" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey={labelKey}
              tick={TICK_FONT}
              axisLine={false}
              tickLine={false}
              tickFormatter={xAxisTickFormatter}
              interval={xAxisInterval}
            />
            <YAxis tick={TICK_FONT} axisLine={false} tickLine={false} tickFormatter={yAxisFormatter} />
            <Tooltip content={<ChartTooltipContent />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={strokeWidth}
              fill={`url(#${gradientId})`}
              animationDuration={animationDuration}
              animationEasing="ease-out"
              dot={showDot ? true : false}
              activeDot={showDot ? { r: 5, fill: color, stroke: '#fff', strokeWidth: 2 } : undefined}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Donut Chart ────────────────────────────────────────────────────
// Used by: Dashboard (sales by category), Analytics (expense breakdown), Expense (category)

interface DonutChartProps<T = Record<string, unknown>> {
  data: T[]
  dataKey?: string
  nameKey?: string
  colors?: string[]
  height?: number
  innerRadius?: number
  outerRadius?: number
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
}

export function DonutChart<T = Record<string, unknown>>({
  data,
  dataKey = 'value',
  nameKey = 'name',
  colors = CHART_COLORS,
  height = 320,
  innerRadius = 60,
  outerRadius = 90,
  emptyIcon,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription,
}: DonutChartProps<T>) {
  return (
    <div className="w-full" style={{ height }}>
      {!data || data.length === 0 ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="h-full" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={3}
              dataKey={dataKey}
              nameKey={nameKey}
              stroke="none"
            >
              {data.map((entry, index) => {
                // Support per-entry color from data (e.g., entry.color) or use palette
                const entryColor = (entry as Record<string, unknown>).color as string | undefined
                return <Cell key={`pie-cell-${index}`} fill={entryColor || colors[index % colors.length]} />
              })}
            </Pie>
            <Tooltip content={<ChartTooltipContent />} />
            <Legend content={<CustomLegend />} />
          </PieChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

// ─── Grouped Bar Chart ──────────────────────────────────────────────
// Used by: Daily-close (sales vs purchases), Loyalty (earned vs redeemed)

interface BarSeries {
  dataKey: string
  name: string
  color: string
  radius?: [number, number, number, number]
  maxBarSize?: number
}

interface GroupedBarChartProps<T = Record<string, unknown>> {
  data: T[]
  bars: BarSeries[]
  labelKey?: string
  height?: number
  tooltipLabels?: Record<string, string>
  legendFormatter?: (value: string) => string
  emptyIcon?: LucideIcon
  emptyTitle?: string
  emptyDescription?: string
}

export function GroupedBarChart<T = Record<string, unknown>>({
  data,
  bars,
  labelKey = 'name',
  height = 280,
  tooltipLabels,
  legendFormatter,
  emptyIcon,
  emptyTitle = 'لا توجد بيانات',
  emptyDescription,
}: GroupedBarChartProps<T>) {
  // Check if any bar series has data
  const hasData = data.length > 0 && bars.some(b => data.some(d => (d as Record<string, unknown>)[b.dataKey] as number > 0))

  return (
    <div className="w-full" style={{ height }}>
      {!hasData ? (
        <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} className="h-full" />
      ) : (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={DEFAULT_MARGIN}>
            <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
            <XAxis
              dataKey={labelKey}
              tick={TICK_FONT}
              axisLine={false}
              tickLine={false}
            />
            <YAxis tick={TICK_FONT} axisLine={false} tickLine={false} tickFormatter={kFormatter} />
            <Tooltip content={<ComparisonTooltip labels={tooltipLabels} />} />
            {legendFormatter && (
              <Legend formatter={legendFormatter} wrapperStyle={{ fontSize: '12px' }} />
            )}
            {bars.map((bar) => (
              <Bar
                key={bar.dataKey}
                dataKey={bar.dataKey}
                fill={bar.color}
                radius={bar.radius ?? [6, 6, 0, 0]}
                maxBarSize={bar.maxBarSize ?? 50}
                name={bar.name}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
