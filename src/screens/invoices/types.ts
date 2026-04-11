// ── Invoices Screen Types ──

export interface InvoiceItem {
  id: string
  productId: string
  product: { id: string; name: string }
  quantity: number
  price: number
  total: number
}

export interface Invoice {
  id: string
  invoiceNo: string
  type: 'sale' | 'purchase'
  customerId: string | null
  customer: { id: string; name: string } | null
  supplierId: string | null
  supplier: { id: string; name: string } | null
  totalAmount: number
  discount: number
  paidAmount: number
  userId: string
  user: { id: string; name: string }
  items: InvoiceItem[]
  createdAt: string
}
