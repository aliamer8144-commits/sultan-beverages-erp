import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { hashPassword } from '@/lib/auth'
import { tryCatch } from '@/lib/api-error-handler'

interface BackupData {
  backupDate: string
  version?: string
  app?: string
  data: {
    users?: unknown[]
    categories?: unknown[]
    products?: unknown[]
    customers?: unknown[]
    suppliers?: unknown[]
    invoices?: unknown[]
    invoiceItems?: unknown[]
    payments?: unknown[]
  }
}

// POST /api/restore — Restore database from backup JSON (admin only)
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const user = getRequestUser(request)

  // Validate backup structure
  if (!body || !body.data || typeof body.data !== 'object') {
    return errorResponse('هيكل النسخة الاحتياطية غير صالح')
  }

  const backup = body as BackupData
  const { data } = backup

  // Validate that at least one table exists
  const tables = Object.keys(data)
  if (tables.length === 0) {
    return errorResponse('لا توجد بيانات في النسخة الاحتياطية')
  }

  // Restore within a transaction
  const result = await db.$transaction(async (tx) => {
    const counts: Record<string, number> = {}

    // Delete in reverse dependency order
    if (data.invoiceItems && Array.isArray(data.invoiceItems)) {
      await tx.invoiceItem.deleteMany()
    }
    if (data.invoices && Array.isArray(data.invoices)) {
      await tx.invoice.deleteMany()
    }
    if (data.payments && Array.isArray(data.payments)) {
      await tx.payment.deleteMany()
    }
    if (data.products && Array.isArray(data.products)) {
      await tx.product.deleteMany()
    }
    if (data.customers && Array.isArray(data.customers)) {
      await tx.customer.deleteMany()
    }
    if (data.suppliers && Array.isArray(data.suppliers)) {
      await tx.supplier.deleteMany()
    }
    if (data.categories && Array.isArray(data.categories)) {
      await tx.category.deleteMany()
    }
    if (data.users && Array.isArray(data.users)) {
      await tx.user.deleteMany()
    }

    // 1. Users — SECURITY: Hash plaintext passwords before restoring
    if (data.users && Array.isArray(data.users) && data.users.length > 0) {
      for (const userRecord of data.users as Record<string, unknown>[]) {
        const { id, createdAt, updatedAt, invoices, ...userData } = userRecord
        // Hash password if it's plaintext (not already a bcrypt hash)
        if (userData.password && typeof userData.password === 'string') {
          if (!userData.password.startsWith('$2')) {
            userData.password = await hashPassword(userData.password)
          }
        }
        await tx.user.create({
          data: userData as Prisma.UserCreateInput,
        })
      }
      counts.users = data.users.length
    }

    // 2. Categories — use createMany
    if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
      const cleanedCats = (data.categories as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, products, ...rest }) => rest
      )
      await tx.category.createMany({
        data: cleanedCats as Prisma.CategoryCreateManyInput[],
        skipDuplicates: true,
      })
      counts.categories = cleanedCats.length
    }

    // 3. Products — use createMany
    if (data.products && Array.isArray(data.products) && data.products.length > 0) {
      const cleanedProducts = (data.products as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, category, invoiceItems, returns, stockAdjustments, variants, ...rest }) => rest
      )
      await tx.product.createMany({
        data: cleanedProducts as Prisma.ProductCreateManyInput[],
        skipDuplicates: true,
      })
      counts.products = cleanedProducts.length
    }

    // 4. Customers — use createMany
    if (data.customers && Array.isArray(data.customers) && data.customers.length > 0) {
      const cleanedCustomers = (data.customers as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, invoices, payments, loyaltyTransactions, ...rest }) => rest
      )
      await tx.customer.createMany({
        data: cleanedCustomers as Prisma.CustomerCreateManyInput[],
        skipDuplicates: true,
      })
      counts.customers = cleanedCustomers.length
    }

    // 5. Suppliers — use createMany
    if (data.suppliers && Array.isArray(data.suppliers) && data.suppliers.length > 0) {
      const cleanedSuppliers = (data.suppliers as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, invoices, supplierPayments, reviews, ...rest }) => rest
      )
      await tx.supplier.createMany({
        data: cleanedSuppliers as Prisma.SupplierCreateManyInput[],
        skipDuplicates: true,
      })
      counts.suppliers = cleanedSuppliers.length
    }

    // 6. Invoices — use createMany
    if (data.invoices && Array.isArray(data.invoices) && data.invoices.length > 0) {
      const cleanedInvoices = (data.invoices as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, items, customer, supplier, user, returns, loyaltyTransactions, ...rest }) => rest
      )
      await tx.invoice.createMany({
        data: cleanedInvoices as Prisma.InvoiceCreateManyInput[],
        skipDuplicates: true,
      })
      counts.invoices = cleanedInvoices.length
    }

    // 7. InvoiceItems — use createMany
    if (data.invoiceItems && Array.isArray(data.invoiceItems) && data.invoiceItems.length > 0) {
      const cleanedItems = (data.invoiceItems as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, invoice, product, ...rest }) => rest
      )
      await tx.invoiceItem.createMany({
        data: cleanedItems as Prisma.InvoiceItemCreateManyInput[],
        skipDuplicates: true,
      })
      counts.invoiceItems = cleanedItems.length
    }

    // 8. Payments — use createMany
    if (data.payments && Array.isArray(data.payments) && data.payments.length > 0) {
      const cleanedPayments = (data.payments as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, customer, ...rest }) => rest
      )
      await tx.payment.createMany({
        data: cleanedPayments as Prisma.PaymentCreateManyInput[],
        skipDuplicates: true,
      })
      counts.payments = cleanedPayments.length
    }

    return counts
  })

  logAction({
    action: 'restore',
    entity: 'System',
    userId: user?.userId,
    userName: user?.username,
    details: { type: 'manual', counts: result },
  })

  return successResponse({
    message: 'تم استعادة النسخة الاحتياطية بنجاح',
    data: result,
  })
}, 'فشل في استعادة النسخة الاحتياطية'), { requireAdmin: true })
