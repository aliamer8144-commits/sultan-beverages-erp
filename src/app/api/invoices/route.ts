import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/invoices?type=sale&search=INV-001&dateFrom=2024-01-01&dateTo=2024-12-31
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const type = searchParams.get('type') as 'sale' | 'purchase' | null
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause based on params
    const where: Record<string, unknown> = {}

    if (type) {
      where.type = type
    }

    if (search) {
      where.OR = [
        { invoiceNo: { contains: search } },
        { customer: { name: { contains: search } } },
        { supplier: { name: { contains: search } } },
      ]
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        // Include the entire end date by setting to end of day
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        ;(where.createdAt as Record<string, unknown>).lte = endDate
      }
    }

    const invoices = await db.invoice.findMany({
      where,
      include: {
        customer: true,
        supplier: true,
        user: {
          select: { id: true, name: true },
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    return NextResponse.json({ success: true, data: invoices })
  } catch (error) {
    console.error('Error fetching invoices:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch invoices' },
      { status: 500 }
    )
  }
}

// POST /api/invoices
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, customerId, supplierId, discount, paidAmount, userId, items } = body

    if (!type || !userId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: type, userId, items' },
        { status: 400 }
      )
    }

    const invoice = await db.$transaction(async (tx) => {
      // 1. Generate invoice number
      const invoiceNo = `INV-${Math.floor(Date.now() / 1000)}`

      // 2. Calculate totalAmount from items
      const totalAmount = items.reduce((sum: number, item: { quantity: number; price: number }) => {
        return sum + item.quantity * item.price
      }, 0)

      // 3. Create the invoice with nested items
      const createdInvoice = await tx.invoice.create({
        data: {
          invoiceNo,
          type,
          customerId: customerId || null,
          supplierId: supplierId || null,
          totalAmount,
          discount: discount || 0,
          paidAmount: paidAmount || 0,
          userId,
          items: {
            create: items.map(
              (item: { productId: string; quantity: number; price: number }) => ({
                productId: item.productId,
                quantity: item.quantity,
                price: item.price,
                total: item.quantity * item.price,
              })
            ),
          },
        },
        include: {
          customer: true,
          supplier: true,
          user: {
            select: { id: true, name: true },
          },
          items: {
            include: {
              product: {
                select: { id: true, name: true },
              },
            },
          },
        },
      })

      // 4 & 5. Update product quantities based on invoice type
      for (const item of items) {
        if (type === 'sale') {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { decrement: item.quantity } },
          })
        } else if (type === 'purchase') {
          await tx.product.update({
            where: { id: item.productId },
            data: { quantity: { increment: item.quantity } },
          })
        }
      }

      // 6. Update customer debt if sale and not fully paid
      if (customerId && type === 'sale') {
        const remaining = totalAmount - (paidAmount || 0)
        if (remaining > 0) {
          await tx.customer.update({
            where: { id: customerId },
            data: { debt: { increment: remaining } },
          })
        }
      }

      return createdInvoice
    })

    return NextResponse.json({ success: true, data: invoice }, { status: 201 })
  } catch (error) {
    console.error('Error creating invoice:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create invoice' },
      { status: 500 }
    )
  }
}
