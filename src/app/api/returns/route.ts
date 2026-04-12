import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse } from '@/lib/api-response'
import { validateBody } from '@/lib/validations'
import { createReturnSchema, updateReturnSchema } from '@/lib/validations'
import { logAction } from '@/lib/audit-logger'
import { tryCatch } from '@/lib/api-error-handler'

// GET /api/returns?page=1&limit=20&status=pending&search=RET-001&dateFrom=2024-01-01&dateTo=2024-12-31
export const GET = withAuth(tryCatch(async (request) => {
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

  return successResponse({ returns, total, page, totalPages })
}, 'فشل في تحميل المرتجعات'))

// POST /api/returns — Create a new return
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const user = getRequestUser(request)
  const userId = user?.userId || ''
  const userName = user?.username

  const validation = validateBody(createReturnSchema, body)
  if (!validation.success) {
    return errorResponse(validation.error)
  }

  const { invoiceId, productId, quantity, reason } = validation.data

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

  await logAction({
    action: 'create',
    entity: 'ProductReturn',
    entityId: returnRecord.id,
    userId,
    userName,
    details: { returnNo: returnRecord.returnNo, invoiceId, productId, quantity, amount: returnRecord.totalAmount },
  })

  return successResponse(returnRecord, 201)
}, 'فشل في إنشاء المرتجع'))

// PATCH /api/returns — Update return status
export const PATCH = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const user = getRequestUser(request)
  const userId = user?.userId || ''
  const userName = user?.username

  const validation = validateBody(updateReturnSchema, body)
  if (!validation.success) {
    return errorResponse(validation.error)
  }

  const { id, status } = validation.data

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

  await logAction({
    action: 'update',
    entity: 'ProductReturn',
    entityId: id,
    userId,
    userName,
    details: { status, returnNo: updatedReturn.returnNo },
  })

  return successResponse(updatedReturn)
}, 'فشل في تحديث المرتجع'))
