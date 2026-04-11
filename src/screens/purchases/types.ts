// ── Purchases Screen Types ──

export interface Supplier {
  id: string
  name: string
  phone: string | null
  phone2: string | null
  address: string | null
  website: string | null
  paymentTerms: string
  rating: number
  ratingCount: number
  notes: string | null
  isActive: boolean
  totalPurchases: number
  totalPaid: number
  remainingBalance: number
}

export interface Product {
  id: string
  name: string
  costPrice: number
  quantity: number
  category: { id: string; name: string }
}

export interface PurchaseItem {
  productId: string
  productName: string
  quantity: number
  costPrice: number
}

export interface SupplierPayment {
  id: string
  supplierId: string
  amount: number
  method: string
  notes: string | null
  createdAt: string
}

// ── Payment Terms Labels ──
export const PAYMENT_TERMS = [
  { value: 'نقدي', label: 'نقدي' },
  { value: '30 يوم', label: '30 يوم' },
  { value: '60 يوم', label: '60 يوم' },
  { value: '90 يوم', label: '90 يوم' },
] as const
