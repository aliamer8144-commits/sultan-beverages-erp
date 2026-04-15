import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { validateBody, createSupplierPaymentSchema } from '@/lib/validations'
import { tryCatch } from '@/lib/api-error-handler'

// GET /api/supplier-payments?supplierId=xxx&page=1&limit=20
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url)
  const supplierId = searchParams.get('supplierId')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))

  if (!supplierId) {
    return errorResponse('معرف المورد مطلوب')
  }

  const where = { supplierId }

  const [payments, total] = await Promise.all([
    db.supplierPayment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.supplierPayment.count({ where }),
  ])

  const totalPaidResult = await db.supplierPayment.aggregate({
    where: supplierId ? { supplierId } : {},
    _sum: { amount: true },
  })
  const totalPaid = totalPaidResult._sum.amount || 0

  return successResponse({ payments, totalPaid, total, totalPages: Math.ceil(total / limit), page })
}, 'فشل في جلب مدفوعات المورد'))

// POST /api/supplier-payments
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const validation = validateBody(createSupplierPaymentSchema, body)
  if (!validation.success) return errorResponse(validation.error)

  const { supplierId, amount, method, notes } = validation.data
  const user = getRequestUser(request)

  const result = await db.$transaction(async (tx) => {
    // 1. Create the supplier payment record
    const createdPayment = await tx.supplierPayment.create({
      data: {
        supplierId,
        amount,
        method: method || 'cash',
        notes: notes || null,
      },
    })

    // 2. Update related purchase invoices - reduce paidAmount by distributing
    // the payment across invoices that still have remaining balance
    let remainingPayment = amount
    const unpaidInvoices = await tx.invoice.findMany({
      where: {
        supplierId,
        type: 'purchase',
        // Only invoices where totalAmount > paidAmount (still have remaining)
      },
      orderBy: { createdAt: 'asc' }, // Pay oldest first
    })

    // Pre-compute allocations sequentially (remainingPayment depends on order)
    const allocations: { invoiceId: string; amount: number }[] = []
    for (const invoice of unpaidInvoices) {
      if (remainingPayment <= 0) break

      const invoiceRemaining = invoice.totalAmount - invoice.discount - invoice.paidAmount
      if (invoiceRemaining <= 0) continue

      const paymentForInvoice = Math.min(remainingPayment, invoiceRemaining)
      allocations.push({ invoiceId: invoice.id, amount: paymentForInvoice })
      remainingPayment -= paymentForInvoice
    }

    // Execute all updates in parallel (independent rows)
    if (allocations.length > 0) {
      await Promise.all(
        allocations.map(({ invoiceId, amount }) =>
          tx.invoice.update({
            where: { id: invoiceId },
            data: { paidAmount: { increment: amount } },
          })
        )
      )
    }

    return createdPayment
  })

  logAction({
    action: 'create',
    entity: 'SupplierPayment',
    entityId: result.id,
    userId: user?.userId,
    userName: user?.username,
    details: { supplierId, amount, method },
  })

  return successResponse(result, 201)
}, 'فشل في تسجيل دفعة المورد'))
