import { writeFileSync } from 'fs'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { hashPassword } from '@/lib/auth'
import { tryCatch } from '@/lib/api-error-handler'

async function createPreRestoreBackup(): Promise<string> {
  const [
    users, categories, products, customers, suppliers,
    invoices, invoiceItems, payments, stockAdjustments,
    productReturns, supplierPayments, supplierReviews,
    loyaltyTransactions, salesTargets, expenseCategories, expenses
  ] = await Promise.all([
    db.user.findMany(),
    db.category.findMany(),
    db.product.findMany(),
    db.customer.findMany(),
    db.supplier.findMany(),
    db.invoice.findMany(),
    db.invoiceItem.findMany(),
    db.payment.findMany(),
    db.stockAdjustment.findMany(),
    db.productReturn.findMany(),
    db.supplierPayment.findMany(),
    db.supplierReview.findMany(),
    db.loyaltyTransaction.findMany(),
    db.salesTarget.findMany(),
    db.expenseCategory.findMany(),
    db.expense.findMany(),
  ])

  const backup = {
    backupDate: new Date().toISOString(),
    type: 'pre-restore' as const,
    data: {
      users, categories, products, customers, suppliers,
      invoices, invoiceItems, payments, stockAdjustments,
      productReturns, supplierPayments, supplierReviews,
      loyaltyTransactions, salesTargets, expenseCategories, expenses,
    }
  }

  const backupPath = '/tmp/sultan-erp-pre-restore-backup.json'
  writeFileSync(backupPath, JSON.stringify(backup, null, 2))
  return backupPath
}

interface BackupData {
  backupDate: string
  version?: string
  app?: string
  confirmCode?: string
  data: {
    users?: unknown[]
    categories?: unknown[]
    products?: unknown[]
    customers?: unknown[]
    suppliers?: unknown[]
    invoices?: unknown[]
    invoiceItems?: unknown[]
    payments?: unknown[]
    stockAdjustments?: unknown[]
    productReturns?: unknown[]
    supplierPayments?: unknown[]
    supplierReviews?: unknown[]
    loyaltyTransactions?: unknown[]
    salesTargets?: unknown[]
    expenseCategories?: unknown[]
    expenses?: unknown[]
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

  // Verify confirmation code
  const confirmCode = body.confirmCode
  const invoiceCount = await db.invoice.count()
  const expectedCode = String(invoiceCount).slice(-4).padStart(4, '0')
  if (confirmCode !== expectedCode) {
    return errorResponse(`رمز التأكيد غير صحيح — أدخل آخر 4 أرقام من عدد الفواتير (${expectedCode})`, 400)
  }

  const backup = body as BackupData
  const { data } = backup

  // Validate that at least one table exists
  const tables = Object.keys(data)
  if (tables.length === 0) {
    return errorResponse('لا توجد بيانات في النسخة الاحتياطية')
  }

  // Dry-run mode: preview what would be restored without modifying data
  if (body.dryRun === true) {
    const previewCounts: Record<string, number> = {}
    if (data.users && Array.isArray(data.users)) previewCounts.users = data.users.length
    if (data.categories && Array.isArray(data.categories)) previewCounts.categories = data.categories.length
    if (data.products && Array.isArray(data.products)) previewCounts.products = data.products.length
    if (data.customers && Array.isArray(data.customers)) previewCounts.customers = data.customers.length
    if (data.suppliers && Array.isArray(data.suppliers)) previewCounts.suppliers = data.suppliers.length
    if (data.invoices && Array.isArray(data.invoices)) previewCounts.invoices = data.invoices.length
    if (data.invoiceItems && Array.isArray(data.invoiceItems)) previewCounts.invoiceItems = data.invoiceItems.length
    if (data.payments && Array.isArray(data.payments)) previewCounts.payments = data.payments.length
    if (data.stockAdjustments && Array.isArray(data.stockAdjustments)) previewCounts.stockAdjustments = data.stockAdjustments.length
    if (data.productReturns && Array.isArray(data.productReturns)) previewCounts.productReturns = data.productReturns.length
    if (data.supplierPayments && Array.isArray(data.supplierPayments)) previewCounts.supplierPayments = data.supplierPayments.length
    if (data.supplierReviews && Array.isArray(data.supplierReviews)) previewCounts.supplierReviews = data.supplierReviews.length
    if (data.loyaltyTransactions && Array.isArray(data.loyaltyTransactions)) previewCounts.loyaltyTransactions = data.loyaltyTransactions.length
    if (data.salesTargets && Array.isArray(data.salesTargets)) previewCounts.salesTargets = data.salesTargets.length
    if (data.expenseCategories && Array.isArray(data.expenseCategories)) previewCounts.expenseCategories = data.expenseCategories.length
    if (data.expenses && Array.isArray(data.expenses)) previewCounts.expenses = data.expenses.length
    return successResponse({ message: 'معاينة الاستعادة', preview: true, counts: previewCounts })
  }

  // Create pre-restore backup
  let preRestoreBackupPath: string | null = null
  try {
    preRestoreBackupPath = await createPreRestoreBackup()
  } catch (e) {
    // Non-fatal — log warning but continue
    console.warn('[Restore] Pre-restore backup failed:', e)
  }

  // Restore within a transaction
  const result = await db.$transaction(async (tx) => {
    const counts: Record<string, number> = {}

    // Delete in reverse dependency order (including new tables)
    if (data.expenses && Array.isArray(data.expenses)) {
      await tx.expense.deleteMany()
    }
    if (data.expenseCategories && Array.isArray(data.expenseCategories)) {
      await tx.expenseCategory.deleteMany()
    }
    if (data.salesTargets && Array.isArray(data.salesTargets)) {
      await tx.salesTarget.deleteMany()
    }
    if (data.loyaltyTransactions && Array.isArray(data.loyaltyTransactions)) {
      await tx.loyaltyTransaction.deleteMany()
    }
    if (data.supplierReviews && Array.isArray(data.supplierReviews)) {
      await tx.supplierReview.deleteMany()
    }
    if (data.supplierPayments && Array.isArray(data.supplierPayments)) {
      await tx.supplierPayment.deleteMany()
    }
    if (data.productReturns && Array.isArray(data.productReturns)) {
      await tx.productReturn.deleteMany()
    }
    if (data.stockAdjustments && Array.isArray(data.stockAdjustments)) {
      await tx.stockAdjustment.deleteMany()
    }
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
      })
      counts.payments = cleanedPayments.length
    }

    // 9. StockAdjustments — use createMany
    if (data.stockAdjustments && Array.isArray(data.stockAdjustments) && data.stockAdjustments.length > 0) {
      const cleanedStockAdj = (data.stockAdjustments as Record<string, unknown>[]).map(
        ({ id, createdAt, product, ...rest }) => rest
      )
      await tx.stockAdjustment.createMany({
        data: cleanedStockAdj as Prisma.StockAdjustmentCreateManyInput[],
      })
      counts.stockAdjustments = cleanedStockAdj.length
    }

    // 10. ProductReturns — use createMany
    if (data.productReturns && Array.isArray(data.productReturns) && data.productReturns.length > 0) {
      const cleanedReturns = (data.productReturns as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, invoice, product, ...rest }) => rest
      )
      await tx.productReturn.createMany({
        data: cleanedReturns as Prisma.ProductReturnCreateManyInput[],
      })
      counts.productReturns = cleanedReturns.length
    }

    // 11. SupplierPayments — use createMany
    if (data.supplierPayments && Array.isArray(data.supplierPayments) && data.supplierPayments.length > 0) {
      const cleanedSupPayments = (data.supplierPayments as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, supplier, ...rest }) => rest
      )
      await tx.supplierPayment.createMany({
        data: cleanedSupPayments as Prisma.SupplierPaymentCreateManyInput[],
      })
      counts.supplierPayments = cleanedSupPayments.length
    }

    // 12. SupplierReviews — use createMany
    if (data.supplierReviews && Array.isArray(data.supplierReviews) && data.supplierReviews.length > 0) {
      const cleanedReviews = (data.supplierReviews as Record<string, unknown>[]).map(
        ({ id, createdAt, supplier, ...rest }) => rest
      )
      await tx.supplierReview.createMany({
        data: cleanedReviews as Prisma.SupplierReviewCreateManyInput[],
      })
      counts.supplierReviews = cleanedReviews.length
    }

    // 13. LoyaltyTransactions — use createMany
    if (data.loyaltyTransactions && Array.isArray(data.loyaltyTransactions) && data.loyaltyTransactions.length > 0) {
      const cleanedLoyalty = (data.loyaltyTransactions as Record<string, unknown>[]).map(
        ({ id, createdAt, customer, invoice, ...rest }) => rest
      )
      await tx.loyaltyTransaction.createMany({
        data: cleanedLoyalty as Prisma.LoyaltyTransactionCreateManyInput[],
      })
      counts.loyaltyTransactions = cleanedLoyalty.length
    }

    // 14. SalesTargets — use createMany
    if (data.salesTargets && Array.isArray(data.salesTargets) && data.salesTargets.length > 0) {
      const cleanedTargets = (data.salesTargets as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, ...rest }) => rest
      )
      await tx.salesTarget.createMany({
        data: cleanedTargets as Prisma.SalesTargetCreateManyInput[],
      })
      counts.salesTargets = cleanedTargets.length
    }

    // 15. ExpenseCategories — use createMany
    if (data.expenseCategories && Array.isArray(data.expenseCategories) && data.expenseCategories.length > 0) {
      const cleanedExpCats = (data.expenseCategories as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, expenses, ...rest }) => rest
      )
      await tx.expenseCategory.createMany({
        data: cleanedExpCats as Prisma.ExpenseCategoryCreateManyInput[],
      })
      counts.expenseCategories = cleanedExpCats.length
    }

    // 16. Expenses — use createMany (after expenseCategories for FK dependency)
    if (data.expenses && Array.isArray(data.expenses) && data.expenses.length > 0) {
      const cleanedExpenses = (data.expenses as Record<string, unknown>[]).map(
        ({ id, createdAt, updatedAt, categoryObj, ...rest }) => rest
      )
      await tx.expense.createMany({
        data: cleanedExpenses as Prisma.ExpenseCreateManyInput[],
      })
      counts.expenses = cleanedExpenses.length
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
    preRestoreBackup: preRestoreBackupPath ? `تم حفظ نسخة احتياطية قبل الاستعادة في ${preRestoreBackupPath}` : undefined,
  })
}, 'فشل في استعادة النسخة الاحتياطية'), { requireAdmin: true })
