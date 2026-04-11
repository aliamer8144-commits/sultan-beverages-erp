// ── Settings Screen Types ──

export interface Customer {
  id: string
  name: string
  phone: string
}

export interface SalesTarget {
  id: string
  type: string
  targetAmount: number
  startDate: string
  endDate: string | null
  isActive: boolean
  createdAt: string
  updatedAt: string
  currentAmount: number
  progressPercent: number
  remainingAmount: number
  daysRemaining: number
  hoursRemaining: number
}
