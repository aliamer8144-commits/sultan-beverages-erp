/**
 * Validation Schemas — Sultan Beverages ERP
 *
 * Zod schemas for all API request bodies. Used in route handlers
 * for type-safe input validation.
 */

import { z } from 'zod'

// ── Category ────────────────────────────────────────────────────────

export const createCategorySchema = z.object({
  name: z.string().min(1, 'اسم الفئة مطلوب').max(100),
  icon: z.string().max(50).default('CupSoda'),
})

export const updateCategorySchema = z.object({
  name: z.string().min(1, 'اسم الفئة مطلوب').max(100).optional(),
  icon: z.string().max(50).optional(),
})

// ── Product ─────────────────────────────────────────────────────────

const imageValidation = z.string()
  .refine(
    (val) => !val || val.startsWith('data:image/'),
    'صيغة الصورة غير مدعومة'
  )
  .refine(
    (val) => !val || val.length <= 2700000,
    'حجم الصورة كبير جداً (الحد الأقصى 2 ميجابايت)'
  )
  .nullable()
  .optional()

export const createProductSchema = z.object({
  name: z.string().min(1, 'اسم المنتج مطلوب').max(200),
  categoryId: z.string().min(1, 'الفئة مطلوبة').optional(),
  price: z.coerce.number().positive('السعر مطلوب'),
  costPrice: z.coerce.number().min(0).default(0),
  quantity: z.coerce.number().int().min(0).default(0),
  minQuantity: z.coerce.number().int().min(0).default(5),
  barcode: z.string().max(100).nullable().optional(),
  image: imageValidation,
})

export const updateProductSchema = z.object({
  name: z.string().min(1, 'اسم المنتج مطلوب').max(200).optional(),
  categoryId: z.string().min(1).optional(),
  price: z.coerce.number().positive().optional(),
  costPrice: z.coerce.number().min(0).optional(),
  quantity: z.coerce.number().int().min(0).optional(),
  minQuantity: z.coerce.number().int().min(0).optional(),
  barcode: z.string().max(100).nullable().optional(),
  image: imageValidation,
  isActive: z.boolean().optional(),
})

export const bulkImportSchema = z.object({
  action: z.literal('bulk-import'),
  products: z.array(z.object({
    name: z.string().min(1),
    categoryId: z.string().optional(),
    price: z.number().positive(),
    costPrice: z.number().min(0).optional(),
    quantity: z.number().int().min(0).optional(),
    barcode: z.string().optional(),
  })).max(500, 'الحد الأقصى 500 منتج لكل عملية استيراد'),
})

export const batchUpdateSchema = z.object({
  ids: z.array(z.string().min(1)).min(1, 'يرجى تحديد منتج واحد على الأقل'),
  price: z.coerce.number().positive().optional(),
  categoryId: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  priceChangeType: z.enum(['fixed', 'percentage']).optional(),
  priceChangeValue: z.number().optional(),
})

export const deleteProductsSchema = z.object({
  id: z.string().min(1).optional(),
  ids: z.array(z.string().min(1)).optional(),
}).refine((data) => data.id || (data.ids && data.ids.length > 0), {
  message: 'يرجى تحديد منتج واحد على الأقل',
})

// ── Customer ────────────────────────────────────────────────────────

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'اسم العميل مطلوب').max(200),
  phone: z.string().max(20).nullable().optional(),
  category: z.string().max(50).default('عادي'),
  notes: z.string().max(500).nullable().optional(),
})

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'اسم العميل مطلوب').max(200).optional(),
  phone: z.string().max(20).nullable().optional(),
  debt: z.number().min(0).optional(),
  category: z.string().max(50).optional(),
  notes: z.string().max(500).nullable().optional(),
})

// ── Supplier ────────────────────────────────────────────────────────

export const createSupplierSchema = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب').max(200),
  phone: z.string().max(20).nullable().optional(),
  phone2: z.string().max(20).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  website: z.string().max(200).url('رابط الموقع غير صالح').nullable().optional().or(z.literal('')),
  paymentTerms: z.string().max(50).default('نقدي'),
  notes: z.string().max(500).nullable().optional(),
})

export const updateSupplierSchema = z.object({
  name: z.string().min(1, 'اسم المورد مطلوب').max(200).optional(),
  phone: z.string().max(20).nullable().optional(),
  phone2: z.string().max(20).nullable().optional(),
  address: z.string().max(300).nullable().optional(),
  website: z.string().max(200).nullable().optional().or(z.literal('')),
  paymentTerms: z.string().max(50).optional(),
  notes: z.string().max(500).nullable().optional(),
  isActive: z.boolean().optional(),
})

// ── Invoice ─────────────────────────────────────────────────────────

export const invoiceItemSchema = z.object({
  productId: z.string().min(1, 'معرف المنتج مطلوب'),
  quantity: z.number().int().positive('الكمية مطلوبة'),
  price: z.number().positive('السعر مطلوب'),
})

export const createInvoiceSchema = z.object({
  type: z.enum(['sale', 'purchase']),
  customerId: z.string().min(1).nullable().optional(),
  supplierId: z.string().min(1).nullable().optional(),
  discount: z.number().min(0).default(0),
  paidAmount: z.number().min(0).default(0),
  items: z.array(invoiceItemSchema).min(1, 'يجب إضافة عنصر واحد على الأقل'),
})

// ── Loyalty Transaction ────────────────────────────────────────────

export const createLoyaltyTransactionSchema = z.object({
  customerId: z.string().min(1, 'معرف العميل مطلوب'),
  points: z.number().int('النقاط مطلوبة'),
  transactionType: z.enum(['earned', 'redeemed', 'adjusted'], { message: 'نوع العملية غير صالح' }),
  invoiceId: z.string().nullable().optional(),
  description: z.string().min(1, 'الوصف مطلوب').max(500),
})

// ── Audit Log ──────────────────────────────────────────────────────

export const createAuditLogSchema = z.object({
  action: z.string().min(1, 'العملية مطلوبة'),
  entity: z.string().min(1, 'الكيان مطلوب'),
  entityId: z.string().nullable().optional(),
  details: z.record(z.string(), z.unknown()).nullable().optional(),
  userName: z.string().nullable().optional(),
  ipAddress: z.string().nullable().optional(),
})

// ── Sales Target ────────────────────────────────────────────────────

export const createSalesTargetSchema = z.object({
  type: z.enum(['daily', 'weekly', 'monthly'], 'نوع الهدف غير صالح'),
  targetAmount: z.number().positive('مبلغ الهدف يجب أن يكون أكبر من صفر'),
  startDate: z.string().optional(),
  endDate: z.string().nullable().optional(),
})

export const updateSalesTargetSchema = z.object({
  id: z.string().min(1, 'معرف الهدف مطلوب'),
  targetAmount: z.number().positive().optional(),
  type: z.enum(['daily', 'weekly', 'monthly']).optional(),
  isActive: z.boolean().optional(),
})

// ── Product Variant ────────────────────────────────────────────────

export const createProductVariantSchema = z.object({
  productId: z.string().min(1, 'المنتج مطلوب'),
  name: z.string().min(1, 'اسم المتغير مطلوب').max(200),
  sku: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  costPrice: z.number().min(0).optional(),
  sellPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
})

export const updateProductVariantSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  sku: z.string().max(100).nullable().optional(),
  barcode: z.string().max(100).nullable().optional(),
  costPrice: z.number().min(0).optional(),
  sellPrice: z.number().min(0).optional(),
  stock: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
})

// ── Supplier Payment ───────────────────────────────────────────────

export const createSupplierPaymentSchema = z.object({
  supplierId: z.string().min(1, 'معرف المورد مطلوب'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  method: z.string().max(50).default('cash'),
  notes: z.string().max(500).nullable().optional(),
})

// ── Customer Payment ───────────────────────────────────────────────

export const createCustomerPaymentSchema = z.object({
  customerId: z.string().min(1, 'معرف العميل مطلوب'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  method: z.string().max(50).default('cash'),
  notes: z.string().max(500).nullable().optional(),
})

// ── Supplier Review ────────────────────────────────────────────────

export const createSupplierReviewSchema = z.object({
  supplierId: z.string().min(1, 'معرف المورد مطلوب'),
  rating: z.number().int().min(1).max(5, 'التقييم يجب أن يكون بين 1 و 5'),
  review: z.string().max(500).nullable().optional(),
})

// ── Return ─────────────────────────────────────────────────────────

export const createReturnSchema = z.object({
  invoiceId: z.string().min(1, 'رقم الفاتورة مطلوب'),
  productId: z.string().min(1, 'المنتج مطلوب'),
  quantity: z.number().int().positive('الكمية مطلوبة'),
  reason: z.string().max(500).optional(),
})

export const updateReturnSchema = z.object({
  id: z.string().min(1, 'معرف المرتجع مطلوب'),
  status: z.enum(['approved', 'rejected'], { message: 'الحالة غير صالحة' }),
})

// ── Expense ────────────────────────────────────────────────────────

export const createExpenseSchema = z.object({
  category: z.string().min(1, 'الفئة مطلوبة'),
  amount: z.number().positive('المبلغ يجب أن يكون أكبر من صفر'),
  description: z.string().min(1, 'الوصف مطلوب').max(500),
  date: z.string().optional(),
  recurring: z.boolean().optional(),
  recurringPeriod: z.enum(['daily', 'weekly', 'monthly']).optional(),
})

export const updateExpenseSchema = z.object({
  id: z.string().min(1, 'معرف المصروف مطلوب'),
  recurring: z.boolean().optional(),
  recurringPeriod: z.enum(['daily', 'weekly', 'monthly']).optional(),
})

// ── Expense Category ───────────────────────────────────────────────

export const createExpenseCategorySchema = z.object({
  name: z.string().min(1, 'يرجى إدخال اسم الفئة').max(100),
  description: z.string().max(300).nullable().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  monthlyBudget: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
})

export const updateExpenseCategorySchema = z.object({
  id: z.string().min(1, 'معرف الفئة مطلوب'),
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(300).nullable().optional(),
  icon: z.string().max(50).optional(),
  color: z.string().max(7).optional(),
  monthlyBudget: z.number().min(0).nullable().optional(),
  isActive: z.boolean().optional(),
})

// ── Stock Adjustment ───────────────────────────────────────────────

const VALID_ADJUSTMENT_TYPES = ['in', 'out', 'adjustment', 'sale', 'purchase', 'return']

export const createStockAdjustmentSchema = z.object({
  productId: z.string().min(1, 'المنتج مطلوب'),
  type: z.enum(VALID_ADJUSTMENT_TYPES as [string, ...string[]], { message: 'نوع التعديل غير صالح' }),
  quantity: z.number().int().min(0, 'الكمية يجب أن تكون صفر أو أكبر'),
  reason: z.string().max(500).optional(),
  reference: z.string().max(100).nullable().optional(),
  referenceType: z.string().max(50).nullable().optional(),
})

// ── Validate Helper ─────────────────────────────────────────────────

export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown) {
  const result = schema.safeParse(body)
  if (!result.success) {
    const firstError = result.error.issues[0]
    return { success: false as const, error: firstError?.message || 'بيانات غير صالحة' }
  }
  return { success: true as const, data: result.data }
}

export type SchemaResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
