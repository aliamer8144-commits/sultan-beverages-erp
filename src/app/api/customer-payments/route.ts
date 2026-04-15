import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { validateBody, createCustomerPaymentSchema } from '@/lib/validations'
import { tryCatch } from '@/lib/api-error-handler'

// GET /api/customer-payments?customerId=xxx&page=1&limit=20
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))

  if (!customerId) {
    return errorResponse('معرف العميل مطلوب')
  }

  const where = { customerId }

  const [payments, total] = await Promise.all([
    db.payment.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.payment.count({ where }),
  ])

  return successResponse({ payments, total, totalPages: Math.ceil(total / limit), page })
}, 'فشل في جلب المدفوعات'))

// POST /api/customer-payments
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const validation = validateBody(createCustomerPaymentSchema, body)
  if (!validation.success) return errorResponse(validation.error)

  const { customerId, amount, method, notes } = validation.data
  const user = getRequestUser(request)

  const payment = await db.$transaction(async (tx) => {
    // 0. Validate customer and payment amount against current debt
    const customer = await tx.customer.findUnique({ where: { id: customerId } })
    if (!customer) {
      throw new Error('العميل غير موجود')
    }
    if (amount > customer.debt) {
      throw new Error(`المبلغ يتجاوز الدين الحالي (الدين: ${customer.debt})`)
    }

    // 1. Create the payment record
    const createdPayment = await tx.payment.create({
      data: {
        customerId,
        amount,
        method: method || 'cash',
        notes: notes || null,
      },
    })

    // 2. Reduce customer debt
    await tx.customer.update({
      where: { id: customerId },
      data: { debt: { decrement: amount } },
    })

    return createdPayment
  })

  logAction({
    action: 'create',
    entity: 'CustomerPayment',
    entityId: payment.id,
    userId: user?.userId,
    userName: user?.username,
    details: { customerId, amount, method },
  })

  return successResponse(payment, 201)
}, 'فشل في تسجيل الدفعة'))
