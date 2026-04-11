// ── Expense Screen Types ──

import type { LucideIcon } from 'lucide-react'
import {
  Settings,
  Wrench,
  Building2,
  Users,
  Truck,
  MoreHorizontal,
} from 'lucide-react'

export interface CategoryDef {
  value: string
  label: string
  icon: LucideIcon
  color: string          // tailwind text-* class (e.g. "text-blue-500")
  bgClass: string        // tailwind bg-* class
  borderClass: string    // tailwind border-* class
  badgeClass: string
  hexColor: string       // hex for charts
  periodLabel: string
}

export const EXPENSE_CATEGORIES: CategoryDef[] = [
  {
    value: 'مصروفات تشغيلية',
    label: 'مصروفات تشغيلية',
    icon: Settings,
    color: 'text-blue-500',
    bgClass: 'bg-blue-500/10',
    borderClass: 'border-blue-500/30',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    hexColor: '#3b82f6',
    periodLabel: 'تشغيلية',
  },
  {
    value: 'صيانة',
    label: 'صيانة',
    icon: Wrench,
    color: 'text-amber-500',
    bgClass: 'bg-amber-500/10',
    borderClass: 'border-amber-500/30',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    hexColor: '#f59e0b',
    periodLabel: 'صيانة',
  },
  {
    value: 'إيجار',
    label: 'إيجار',
    icon: Building2,
    color: 'text-purple-500',
    bgClass: 'bg-purple-500/10',
    borderClass: 'border-purple-500/30',
    badgeClass: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
    hexColor: '#a855f7',
    periodLabel: 'إيجار',
  },
  {
    value: 'رواتب',
    label: 'رواتب',
    icon: Users,
    color: 'text-green-500',
    bgClass: 'bg-green-500/10',
    borderClass: 'border-green-500/30',
    badgeClass: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    hexColor: '#22c55e',
    periodLabel: 'رواتب',
  },
  {
    value: 'نقل',
    label: 'نقل',
    icon: Truck,
    color: 'text-orange-500',
    bgClass: 'bg-orange-500/10',
    borderClass: 'border-orange-500/30',
    badgeClass: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    hexColor: '#f97316',
    periodLabel: 'نقل',
  },
  {
    value: 'متنوع',
    label: 'متنوع',
    icon: MoreHorizontal,
    color: 'text-gray-500',
    bgClass: 'bg-gray-500/10',
    borderClass: 'border-gray-500/30',
    badgeClass: 'bg-gray-100 text-gray-700 dark:bg-gray-800/50 dark:text-gray-400',
    hexColor: '#6b7280',
    periodLabel: 'متنوع',
  },
]

export const DATE_RANGE_OPTIONS = [
  { value: 'all', label: 'الكل' },
  { value: 'week', label: 'هذا الأسبوع' },
  { value: 'month', label: 'هذا الشهر' },
  { value: '3months', label: 'آخر 3 أشهر' },
  { value: 'year', label: 'هذا العام' },
] as const

export const RECURRING_PERIODS = [
  { value: 'daily', label: 'يومي', short: 'يومياً' },
  { value: 'weekly', label: 'أسبوعي', short: 'أسبوعياً' },
  { value: 'monthly', label: 'شهري', short: 'شهرياً' },
] as const

export interface ExpenseItem {
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

export interface CategorySummary {
  category: string
  total: number
  count: number
}

export interface DailyTrend {
  date: string
  total: number
}

export interface RecurringItem {
  id: string
  category: string
  amount: number
  description: string
  recurringPeriod: string | null
  nextDueDate: string
}

export interface ExpenseSummary {
  totalExpenses: number
  todayExpenses: number
  thisWeekExpenses: number
  thisMonthExpenses: number
  topCategory: string | null
  totalByCategory: CategorySummary[]
  monthlyTrend: { month: string; total: number }[]
  dailyTrend: DailyTrend[]
  recurringSummary: RecurringItem[]
  averageDailyExpense: number
}

export interface ExpenseFetchResponse {
  expenses: ExpenseItem[]
  total: number
  totalPages: number
  page: number
  summary: ExpenseSummary | null
}
