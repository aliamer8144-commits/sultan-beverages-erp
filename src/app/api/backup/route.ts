import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { tryCatch } from '@/lib/api-error-handler'

// GET /api/backup — Export all data as a JSON backup (admin only)
export const GET = withAuth(tryCatch(async (request) => {
  const user = getRequestUser(request)

  const [users, categories, products, customers, suppliers, invoices, payments,
    stockAdjustments, productReturns, supplierPayments, supplierReviews,
    loyaltyTransactions, salesTargets, expenseCategories, expenses] =
    await Promise.all([
      // SECURITY: Exclude password field from backup export
      db.user.findMany({
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      db.category.findMany({ orderBy: { createdAt: 'asc' } }),
      db.product.findMany({
        orderBy: { createdAt: 'asc' },
        include: { category: { select: { id: true, name: true, icon: true } } },
      }),
      db.customer.findMany({ orderBy: { createdAt: 'asc' } }),
      db.supplier.findMany({ orderBy: { createdAt: 'asc' } }),
      db.invoice.findMany({
        orderBy: { createdAt: 'asc' },
        include: {
          items: {
            include: { product: { select: { id: true, name: true } } },
          },
        },
      }),
      db.payment.findMany({ orderBy: { createdAt: 'asc' } }),
      db.stockAdjustment.findMany({ orderBy: { createdAt: 'asc' } }),
      db.productReturn.findMany({ orderBy: { createdAt: 'asc' } }),
      db.supplierPayment.findMany({ orderBy: { createdAt: 'asc' } }),
      db.supplierReview.findMany({ orderBy: { createdAt: 'asc' } }),
      db.loyaltyTransaction.findMany({ orderBy: { createdAt: 'asc' } }),
      db.salesTarget.findMany({ orderBy: { createdAt: 'asc' } }),
      db.expenseCategory.findMany({ orderBy: { createdAt: 'asc' } }),
      db.expense.findMany({ orderBy: { createdAt: 'asc' } }),
    ])

  // Extract invoice items from the nested invoices for backward compatibility
  const invoiceItems = invoices.flatMap((inv) => inv.items)

  // Serialize dates to ISO strings for JSON
  const serialize = (obj: unknown) => JSON.parse(JSON.stringify(obj))

  const backup = {
    backupDate: new Date().toISOString(),
    version: '1.0.0',
    app: 'السلطان للمشروبات',
    data: {
      users: serialize(users),
      categories: serialize(categories),
      products: serialize(products),
      customers: serialize(customers),
      suppliers: serialize(suppliers),
      invoices: serialize(invoices),
      invoiceItems: serialize(invoiceItems),
      payments: serialize(payments),
      stockAdjustments: serialize(stockAdjustments),
      productReturns: serialize(productReturns),
      supplierPayments: serialize(supplierPayments),
      supplierReviews: serialize(supplierReviews),
      loyaltyTransactions: serialize(loyaltyTransactions),
      salesTargets: serialize(salesTargets),
      expenseCategories: serialize(expenseCategories),
      expenses: serialize(expenses),
    },
    summary: {
      users: users.length,
      categories: categories.length,
      products: products.length,
      customers: customers.length,
      suppliers: suppliers.length,
      invoices: invoices.length,
      invoiceItems: invoiceItems.length,
      payments: payments.length,
      stockAdjustments: stockAdjustments.length,
      productReturns: productReturns.length,
      supplierPayments: supplierPayments.length,
      supplierReviews: supplierReviews.length,
      loyaltyTransactions: loyaltyTransactions.length,
      salesTargets: salesTargets.length,
      expenseCategories: expenseCategories.length,
      expenses: expenses.length,
    },
  }

  logAction({
    action: 'backup',
    entity: 'System',
    userId: user?.userId,
    userName: user?.username,
    details: { type: 'manual', summary: backup.summary },
  })

  return successResponse(backup)
}, 'فشل في إنشاء النسخة الاحتياطية'), { requireAdmin: true })
