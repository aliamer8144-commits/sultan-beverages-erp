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
