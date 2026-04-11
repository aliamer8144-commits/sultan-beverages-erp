import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { validateBody, createCustomerPaymentSchema } from '@/lib/validations'

// GET /api/customer-payments?customerId=xxx
export const GET = withAuth(async (request: NextRequest) => {
  try {
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
  } catch (error) {
    console.error('Error fetching payments:', error)
    return serverError('فشل في جلب المدفوعات')
  }
})

// POST /api/customer-payments
export const POST = withAuth(async (request: NextRequest) => {
  try {
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
  } catch (error) {
    console.error('Error recording payment:', error)
    return serverError('فشل في تسجيل الدفعة')
  }
})
