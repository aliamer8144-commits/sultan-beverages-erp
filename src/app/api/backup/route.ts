import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/backup — Export all data as a JSON backup
export async function GET() {
  try {
    const [users, categories, products, customers, suppliers, invoices, invoiceItems, payments] =
      await Promise.all([
        db.user.findMany({ orderBy: { createdAt: 'asc' } }),
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
        db.invoiceItem.findMany(),
        db.payment.findMany({ orderBy: { createdAt: 'asc' } }),
      ])

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
      },
    }

    return NextResponse.json({ success: true, data: backup })
  } catch (error) {
    console.error('Error creating backup:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create backup' },
      { status: 500 }
    )
  }
}
