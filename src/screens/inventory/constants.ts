/**
 * Inventory Screen — Constants
 *
 * Extracted from inventory-screen.tsx for maintainability.
 */

import {
  ArrowUp,
  ArrowDown,
  PenLine,
  RotateCcw,
  FileInput,
  TrendingUp,
  TrendingDown,
  ArrowUpDown,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

// ─── Adjustment Type Config ──────────────────────────────────────

export const adjustmentTypeConfig: Record<string, { label: string; color: string; bgColor: string; icon: LucideIcon }> = {
  addition: { label: 'إضافة', color: 'text-emerald-700 dark:text-emerald-400', bgColor: 'bg-emerald-100 dark:bg-emerald-900/30', icon: ArrowUp },
  subtraction: { label: 'خصم', color: 'text-red-700 dark:text-red-400', bgColor: 'bg-red-100 dark:bg-red-900/30', icon: ArrowDown },
  correction: { label: 'تصحيح', color: 'text-blue-700 dark:text-blue-400', bgColor: 'bg-blue-100 dark:bg-blue-900/30', icon: PenLine },
  return: { label: 'إرجاع', color: 'text-amber-700 dark:text-amber-400', bgColor: 'bg-amber-100 dark:bg-amber-900/30', icon: RotateCcw },
  initial: { label: 'رصيد أولي', color: 'text-purple-700 dark:text-purple-400', bgColor: 'bg-purple-100 dark:bg-purple-900/30', icon: FileInput },
}

// ─── Movement Type Config (for mini timeline) ───────────────────

export const movementTypeConfig: Record<string, { label: string; icon: LucideIcon; color: string; bg: string }> = {
  in: { label: 'إضافة', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  purchase: { label: 'شراء', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  return: { label: 'إرجاع', icon: TrendingUp, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-100 dark:bg-blue-900/30' },
  out: { label: 'خصم', icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  sale: { label: 'بيع', icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  adjustment: { label: 'تعديل', icon: ArrowUpDown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
  addition: { label: 'إضافة', icon: TrendingUp, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-900/30' },
  subtraction: { label: 'خصم', icon: TrendingDown, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/30' },
  correction: { label: 'تصحيح', icon: ArrowUpDown, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-900/30' },
}
