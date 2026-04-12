import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { validateBody, createCustomerPaymentSchema } from '@/lib/validations'
import { tryCatch } from '@/lib/api-error-handler'

// GET /api/customer-payments?customerId=xxx
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')

  if (!customerId) {
    return errorResponse('معرف العميل مطلوب')
  }

  const payments = await db.payment.findMany({
    where: { customerId },
    orderBy: { createdAt: 'desc' },
  })

  return successResponse(payments)
}, 'فشل في جلب المدفوعات'))

// POST /api/customer-payments
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const validation = validateBody(createCustomerPaymentSchema, body)
  if (!validation.success) return errorResponse(validation.error)

  const { customerId, amount, method, notes } = validation.data
  const user = getRequestUser(request)

  const payment = await db.$transaction(async (tx) => {
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
