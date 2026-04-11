// ─── POS Screen Types ─────────────────────────────────────────────────────────

export interface Product {
  id: string
  name: string
  price: number
  costPrice: number
  quantity: number
  minQuantity: number
  categoryId: string
  category: { id: string; name: string; icon: string }
  image?: string
  barcode?: string
  isActive: boolean
  _count?: { variants: number }
}

export interface Category {
  id: string
  name: string
  icon: string
  _count?: { products: number }
}

export interface Customer {
  id: string
  name: string
  phone?: string
  debt: number
  loyaltyPoints?: number
}

export interface ProductVariant {
  id: string
  productId: string
  name: string
  sku?: string
  barcode?: string
  costPrice: number
  sellPrice: number
  stock: number
  isActive: boolean
}

export interface LastInvoice {
  id: string
  invoiceNo: string
  totalAmount: number
  createdAt: string
  customer: { name: string } | null
}

export interface SalesTargetCompact {
  progressPercent: number
  targetAmount: number
  currentAmount: number
  type: string
}
