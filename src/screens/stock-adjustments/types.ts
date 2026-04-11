// ── Stock Adjustments Screen Types ──

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Equal,
  ShoppingCart,
  Truck,
  RotateCcw,
} from 'lucide-react'

export interface StockAdjustmentItem {
  id: string
  productId: string
  product: { id: string; name: string; category: { name: string } | null }
  type: string
  quantity: number
  previousQty: number
  newQty: number
  reason: string
  reference: string | null
  referenceType: string | null
  userId: string
  userName: string | null
  createdAt: string
}

export interface ProductItem {
  id: string
  name: string
  quantity: number
  category: { id: string; name: string } | null
}

export interface AdjustmentStats {
  todayTotal: number
  inCount: number
  outCount: number
  adjustmentCount: number
  saleCount: number
  purchaseCount: number
  returnCount: number
  totalIncrease: number
  totalDecrease: number
  netChange: number
}

export interface StockAdjustmentsResponse {
  adjustments: StockAdjustmentItem[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
  stats: AdjustmentStats
}

// Type badge configuration
export const typeConfig: Record<string, {
  label: string
  icon: React.ElementType
  colorClass: string
  bgClass: string
  badgeClass: string
  direction: 'up' | 'down' | 'neutral'
}> = {
  in: {
    label: 'إضافة',
    icon: ArrowDownToLine,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0',
    direction: 'up',
  },
  out: {
    label: 'خصم',
    icon: ArrowUpFromLine,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0',
    direction: 'down',
  },
  adjustment: {
    label: 'تعديل',
    icon: Equal,
    colorClass: 'text-amber-600 dark:text-amber-400',
    bgClass: 'bg-amber-50 dark:bg-amber-900/20',
    badgeClass: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-0',
    direction: 'neutral',
  },
  sale: {
    label: 'بيع',
    icon: ShoppingCart,
    colorClass: 'text-red-600 dark:text-red-400',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    badgeClass: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-0',
    direction: 'down',
  },
  purchase: {
    label: 'شراء',
    icon: Truck,
    colorClass: 'text-emerald-600 dark:text-emerald-400',
    bgClass: 'bg-emerald-50 dark:bg-emerald-900/20',
    badgeClass: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-0',
    direction: 'up',
  },
  return: {
    label: 'إرجاع',
    icon: RotateCcw,
    colorClass: 'text-blue-600 dark:text-blue-400',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    badgeClass: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-0',
    direction: 'up',
  },
}
