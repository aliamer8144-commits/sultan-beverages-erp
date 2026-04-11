// ─── Customer Types ─────────────────────────────────────────────

export interface Customer {
  id: string
  name: string
  phone: string | null
  debt: number
  loyaltyPoints: number
  isActive: boolean
  category: string
  notes: string | null
  totalPurchases: number
  visitCount: number
  lastVisit: string | null
}

export interface CustomerFormData {
  name: string
  phone: string
  debt: string
  category: string
  notes: string
}

export interface Payment {
  id: string
  customerId: string
  amount: number
  method: string
  notes: string | null
  createdAt: string
}

export interface LoyaltyTransaction {
  id: string
  customerId: string
  points: number
  transactionType: string
  description: string
  createdAt: string
}

export interface CustomerInvoice {
  id: string
  invoiceNo: string
  type: string
  totalAmount: number
  discount: number
  paidAmount: number
  createdAt: string
}

import {
  Users,
  Crown,
  BadgeCheck,
  Store,
  type LucideIcon,
} from 'lucide-react'

export const CUSTOMER_CATEGORIES: Array<{
  value: string
  label: string
  icon: LucideIcon
  chipClass: string
}> = [
  { value: 'عادي', label: 'عادي', icon: Users, chipClass: 'chip-outline' },
  { value: 'VIP', label: 'VIP', icon: Crown, chipClass: 'chip-warning' },
  { value: 'موظف', label: 'موظف', icon: BadgeCheck, chipClass: 'chip-info' },
  { value: 'تاجر', label: 'تاجر', icon: Store, chipClass: 'chip-primary' },
]

export const emptyForm: CustomerFormData = {
  name: '',
  phone: '',
  debt: '0',
  category: 'عادي',
  notes: '',
}
