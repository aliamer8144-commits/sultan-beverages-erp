import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/returns?page=1&limit=20&status=pending&search=RET-001&dateFrom=2024-01-01&dateTo=2024-12-31
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl

    const page = parseInt(searchParams.get('page') || '1', 10)
    const limit = parseInt(searchParams.get('limit') || '20', 10)
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    // Build where clause
    const where: Record<string, unknown> = {}

    if (status && status !== 'all') {
      where.status = status
    }

    if (search) {
      where.returnNo = { contains: search }
    }

    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        ;(where.createdAt as Record<string, unknown>).gte = new Date(dateFrom)
      }
      if (dateTo) {
        const endDt = new Date(dateTo + 'T23:59:59.999Z')
        ;(where.createdAt as Record<string, unknown>).lte = endDt
      }
    }

    // Get total count
    const total = await db.productReturn.count({ where })

    // Get paginated data
    const returns = await db.productReturn.findMany({
      where,
      include: {
        invoice: {
          select: { id: true, invoiceNo: true, type: true },
        },
        product: {
          select: { id: true, name: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      success: true,
      data: returns,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    console.error('Error fetching returns:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to fetch returns' },
      { status: 500 }
    )
  }
}

// POST /api/returns — Create a new return
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { invoiceId, productId, quantity, reason, userId, userName } = body

    if (!invoiceId || !productId || !quantity || !userId) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: invoiceId, productId, quantity, userId' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'Quantity must be greater than 0' },
        { status: 400 }
      )
    }

    const returnRecord = await db.$transaction(async (tx) => {
      // 1. Get the invoice to find the unit price and verify it's a sale invoice
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: {
          items: {
            where: { productId },
          },
          customer: true,
        },
      })

      if (!invoice) {
        throw new Error('Invoice not found')
      }

      if (invoice.type !== 'sale') {
        throw new Error('Returns are only allowed for sale invoices')
      }

      // Find the specific invoice item for this product
      const invoiceItem = invoice.items.find((item) => item.productId === productId)
      if (!invoiceItem) {
        throw new Error('Product not found in this invoice')
      }

      // Check that return quantity doesn't exceed invoice item quantity
      if (quantity > invoiceItem.quantity) {
        throw new Error('Return quantity cannot exceed invoice item quantity')
      }

      const unitPrice = invoiceItem.price
      const totalAmount = unitPrice * quantity

      // 2. Generate unique return number (RET-YYYYMMDD-XXX)
      const today = new Date()
      const dateStr = today.getFullYear().toString() +
        String(today.getMonth() + 1).padStart(2, '0') +
        String(today.getDate()).padStart(2, '0')

      // Find existing returns for today to determine sequence number
      const todayPrefix = `RET-${dateStr}-`
      const lastReturn = await tx.productReturn.findFirst({
        where: {
          returnNo: { startsWith: todayPrefix },
        },
        orderBy: { createdAt: 'desc' },
      })

      let sequence = 1
      if (lastReturn) {
        const parts = lastReturn.returnNo.split('-')
        const lastSeq = parseInt(parts[parts.length - 1], 10)
        sequence = lastSeq + 1
      }

      const returnNo = `${todayPrefix}${String(sequence).padStart(3, '0')}`

      // 3. Create the Return record
      const createdReturn = await tx.productReturn.create({
        data: {
          returnNo,
          invoiceId,
          productId,
          quantity,
          unitPrice,
          totalAmount,
          reason: reason || '',
          status: 'approved', // Auto-approve on creation
          userId,
          userName: userName || null,
        },
        include: {
          invoice: {
            select: { id: true, invoiceNo: true, type: true },
          },
          product: {
            select: { id: true, name: true },
          },
        },
      })

      // 4. Restore product quantity and log stock adjustment
      const productBefore = await tx.product.findUnique({
        where: { id: productId },
        select: { quantity: true },
      })
      const previousQty = productBefore?.quantity || 0
      const newQty = previousQty + quantity

      await tx.product.update({
        where: { id: productId },
        data: { quantity: newQty },
      })

      // Auto-log stock adjustment for return
      await tx.stockAdjustment.create({
        data: {
          productId,
          type: 'return',
          quantity,
          previousQty,
          newQty,
          reason: `إرجاع - مرتجع ${returnNo}`,
          reference: returnNo,
          referenceType: 'return',
          userId: userId || '',
          userName: userName || null,
        },
      })

      // 5. Adjust customer debt if applicable (reduce by return amount)
      if (invoice.customerId && invoice.customer) {
        const debtReduction = Math.min(totalAmount, invoice.customer.debt)
        if (debtReduction > 0) {
          await tx.customer.update({
            where: { id: invoice.customerId },
            data: { debt: { decrement: debtReduction } },
          })
        }
      }

      return createdReturn
    })

    return NextResponse.json({ success: true, data: returnRecord }, { status: 201 })
  } catch (error) {
    console.error('Error creating return:', error)
    const message = error instanceof Error ? error.message : 'Failed to create return'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}

// PATCH /api/returns — Update return status
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: id, status' },
        { status: 400 }
      )
    }

    if (!['approved', 'rejected'].includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Status must be approved or rejected' },
        { status: 400 }
      )
    }

    const updatedReturn = await db.$transaction(async (tx) => {
      // Get the existing return
      const existingReturn = await tx.productReturn.findUnique({
        where: { id },
      })

      if (!existingReturn) {
        throw new Error('Return not found')
      }

      if (existingReturn.status !== 'pending') {
        throw new Error('Return is already processed')
      }

      // Update the status
      const updated = await tx.productReturn.update({
        where: { id },
        data: { status },
        include: {
          invoice: {
            select: { id: true, invoiceNo: true, type: true, customerId: true },
          },
          product: {
            select: { id: true, name: true },
          },
        },
      })

      // When approved, restore product quantity
      if (status === 'approved') {
        await tx.product.update({
          where: { id: existingReturn.productId },
          data: { quantity: { increment: existingReturn.quantity } },
        })

        // Adjust customer debt if applicable
        if (updated.invoice.customerId) {
          const invoice = await tx.invoice.findUnique({
            where: { id: existingReturn.invoiceId },
            include: { customer: true },
          })
          if (invoice?.customer && invoice.customerId) {
            const debtReduction = Math.min(existingReturn.totalAmount, invoice.customer.debt)
            if (debtReduction > 0) {
              await tx.customer.update({
                where: { id: invoice.customerId },
                data: { debt: { decrement: debtReduction } },
              })
            }
          }
        }
      }

      return updated
    })

    return NextResponse.json({ success: true, data: updatedReturn })
  } catch (error) {
    console.error('Error updating return:', error)
    const message = error instanceof Error ? error.message : 'Failed to update return'
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    )
  }
}
