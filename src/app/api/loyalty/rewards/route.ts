import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { successResponse, errorResponse, notFound, serverError } from '@/lib/api-response'

// GET: Get available rewards based on points balance
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return errorResponse('معرف العميل مطلوب')
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { loyaltyPoints: true },
    })

    if (!customer) {
      return notFound('العميل غير موجود')
    }

    // Define reward tiers based on points balance
    const points = customer.loyaltyPoints
    const rewards = [
      {
        id: 'small',
        name: 'خصم صغير',
        description: 'خصم 500 ريال يمني',
        pointsRequired: 100,
        discountValue: 500,
        available: points >= 100,
      },
      {
        id: 'medium',
        name: 'خصم متوسط',
        description: 'خصم 1,500 ريال يمني',
        pointsRequired: 300,
        discountValue: 1500,
        available: points >= 300,
      },
      {
        id: 'large',
        name: 'خصم كبير',
        description: 'خصم 3,000 ريال يمني',
        pointsRequired: 500,
        discountValue: 3000,
        available: points >= 500,
      },
      {
        id: 'premium',
        name: 'خصم متميز',
        description: 'خصم 5,000 ريال يمني',
        pointsRequired: 1000,
        discountValue: 5000,
        available: points >= 1000,
      },
    ]

    return successResponse({
      currentPoints: points,
      rewards,
    })
  } catch {
    return serverError('فشل في جلب المكافآت')
  }
})
