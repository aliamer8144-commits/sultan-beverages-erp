import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'

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

// POST /api/restore — Restore database from backup JSON
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate backup structure
    if (!body || !body.data || typeof body.data !== 'object') {
      return NextResponse.json(
        { success: false, error: 'هيكل النسخة الاحتياطية غير صالح' },
        { status: 400 }
      )
    }

    const backup = body as BackupData
    const { data } = backup

    // Validate that at least one table exists
    const tables = Object.keys(data)
    if (tables.length === 0) {
      return NextResponse.json(
        { success: false, error: 'لا توجد بيانات في النسخة الاحتياطية' },
        { status: 400 }
      )
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

      // 1. Users
      if (data.users && Array.isArray(data.users) && data.users.length > 0) {
        for (const user of data.users as Record<string, unknown>[]) {
          const { id, createdAt, updatedAt, invoices, ...userData } = user
          await tx.user.create({
            data: userData as Prisma.UserCreateInput,
          })
        }
        counts.users = data.users.length
      }

      // 2. Categories
      if (data.categories && Array.isArray(data.categories) && data.categories.length > 0) {
        for (const cat of data.categories as Record<string, unknown>[]) {
          const { id, createdAt, updatedAt, products, ...catData } = cat
          await tx.category.create({
            data: catData as Prisma.CategoryCreateInput,
          })
        }
        counts.categories = data.categories.length
      }

      // 3. Products
      if (data.products && Array.isArray(data.products) && data.products.length > 0) {
        for (const prod of data.products as Record<string, unknown>[]) {
          const { id, createdAt, updatedAt, category, invoiceItems, returns, ...prodData } = prod
          await tx.product.create({
            data: prodData as Prisma.ProductCreateInput,
          })
        }
        counts.products = data.products.length
      }

      // 4. Customers
      if (data.customers && Array.isArray(data.customers) && data.customers.length > 0) {
        for (const cust of data.customers as Record<string, unknown>[]) {
          const { id, createdAt, updatedAt, invoices, payments, ...custData } = cust
          await tx.customer.create({
            data: custData as Prisma.CustomerCreateInput,
          })
        }
        counts.customers = data.customers.length
      }

      // 5. Suppliers
      if (data.suppliers && Array.isArray(data.suppliers) && data.suppliers.length > 0) {
        for (const supp of data.suppliers as Record<string, unknown>[]) {
          const { id, createdAt, updatedAt, invoices, supplierPayments, ...suppData } = supp
          await tx.supplier.create({
            data: suppData as Prisma.SupplierCreateInput,
          })
        }
        counts.suppliers = data.suppliers.length
      }

      // 6. Invoices
      if (data.invoices && Array.isArray(data.invoices) && data.invoices.length > 0) {
        for (const inv of data.invoices as Record<string, unknown>[]) {
          const { id, createdAt, updatedAt, items, customer, supplier, user, returns, ...invData } = inv
          await tx.invoice.create({
            data: invData as Prisma.InvoiceCreateInput,
          })
        }
        counts.invoices = data.invoices.length
      }

      // 7. InvoiceItems
      if (data.invoiceItems && Array.isArray(data.invoiceItems) && data.invoiceItems.length > 0) {
        for (const item of data.invoiceItems as Record<string, unknown>[]) {
          const { id, createdAt, updatedAt, invoice, product, ...itemData } = item
          await tx.invoiceItem.create({
            data: itemData as Prisma.InvoiceItemCreateInput,
          })
        }
        counts.invoiceItems = data.invoiceItems.length
      }

      // 8. Payments
      if (data.payments && Array.isArray(data.payments) && data.payments.length > 0) {
        for (const pay of data.payments as Record<string, unknown>[]) {
          const { id, createdAt, updatedAt, customer, ...payData } = pay
          await tx.payment.create({
            data: payData as Prisma.PaymentCreateInput,
          })
        }
        counts.payments = data.payments.length
      }

      return counts
    })

    return NextResponse.json({
      success: true,
      message: 'تم استعادة النسخة الاحتياطية بنجاح',
      data: result,
    })
  } catch (error) {
    console.error('Error restoring backup:', error)
    return NextResponse.json(
      { success: false, error: 'فشل في استعادة النسخة الاحتياطية: ' + (error instanceof Error ? error.message : 'خطأ غير معروف') },
      { status: 500 }
    )
  }
}
