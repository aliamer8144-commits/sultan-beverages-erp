/**
 * Inventory Screen — Types & Form Defaults
 *
 * Extracted from inventory-screen.tsx for maintainability.
 */

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
}

export interface Category {
  id: string
  name: string
  icon: string
  _count?: { products: number }
}

export interface ProductFormData {
  name: string
  categoryId: string
  price: string
  costPrice: string
  quantity: string
  minQuantity: string
  barcode: string
  image: string
}

export interface StockAdjustment {
  id: string
  productId: string
  type: string
  quantity: number
  previousQty: number
  newQty: number
  reason: string
  userId: string
  userName: string | null
  reference: string | null
  createdAt: string
  product: { id: string; name: string; category: { name: string } }
}

export interface AdjustmentFormData {
  type: 'addition' | 'subtraction' | 'correction'
  quantity: string
  reason: string
  reference: string
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
  createdAt: string
}

export interface VariantFormData {
  name: string
  sku: string
  barcode: string
  costPrice: string
  sellPrice: string
  stock: string
}

// ─── Form Defaults ──────────────────────────────────────────────────

export const emptyForm: ProductFormData = {
  name: '',
  categoryId: '',
  price: '',
  costPrice: '',
  quantity: '0',
  minQuantity: '5',
  barcode: '',
  image: '',
}

export const emptyAdjustmentForm: AdjustmentFormData = {
  type: 'addition',
  quantity: '',
  reason: '',
  reference: '',
}

export const emptyVariantForm: VariantFormData = {
  name: '',
  sku: '',
  barcode: '',
  costPrice: '',
  sellPrice: '',
  stock: '0',
}
