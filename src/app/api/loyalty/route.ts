import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { validateBody, createLoyaltyTransactionSchema } from '@/lib/validations'
import { tryCatch } from '@/lib/api-error-handler'

// GET: Fetch loyalty transactions for a customer (paginated)
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url)
  const customerId = searchParams.get('customerId')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const type = searchParams.get('type') // earned, redeemed, adjusted

  if (!customerId) {
    // Return loyalty stats for all customers (admin dashboard)
    const [totalEarned, totalRedeemed, customerLeaderboard] = await Promise.all([
      db.loyaltyTransaction.aggregate({
        where: { transactionType: 'earned' },
        _sum: { points: true },
      }),
      db.loyaltyTransaction.aggregate({
        where: { transactionType: 'redeemed' },
        _sum: { points: true },
      }),
      db.customer.findMany({
        select: {
          id: true,
          name: true,
          phone: true,
          loyaltyPoints: true,
          _count: { select: { loyaltyTransactions: true } },
        },
        orderBy: { loyaltyPoints: 'desc' },
        take: 10,
      }),
    ])

    // Get points activity over last 30 days + recent transactions (parallelized)
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const [dailyActivity, recentTransactions] = await Promise.all([
      db.loyaltyTransaction.groupBy({
        by: ['createdAt'],
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { points: true },
        orderBy: { createdAt: 'asc' },
      }),
      db.loyaltyTransaction.findMany({
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ])

    // Group by date
    const activityByDate: Record<string, { earned: number; redeemed: number }> = {}
    for (const item of dailyActivity) {
      const dateKey = item.createdAt.toISOString().split('T')[0]
      if (!activityByDate[dateKey]) {
        activityByDate[dateKey] = { earned: 0, redeemed: 0 }
      }
      if (item._sum.points) {
        if (item._sum.points > 0) {
          activityByDate[dateKey].earned += item._sum.points
        } else {
          activityByDate[dateKey].redeemed += Math.abs(item._sum.points)
        }
      }
    }

    return successResponse({
      totalEarned: totalEarned._sum.points || 0,
      totalRedeemed: Math.abs(totalRedeemed._sum.points || 0),
      customerLeaderboard,
      activityByDate,
      recentTransactions,
    })
  }

  // Fetch transactions for a specific customer
  const where: Record<string, unknown> = { customerId }
  if (type && type !== 'all') {
    where.transactionType = type
  }

  const [transactions, total, customer] = await Promise.all([
    db.loyaltyTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.loyaltyTransaction.count({ where }),
    db.customer.findUnique({
      where: { id: customerId },
      select: { loyaltyPoints: true },
    }),
  ])

  return successResponse({
    transactions,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    currentPoints: customer?.loyaltyPoints || 0,
  })
}, 'فشل في جلب بيانات الولاء'))

// POST: Create a loyalty transaction (earn/redeem/adjust)
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const validation = validateBody(createLoyaltyTransactionSchema, body)
  if (!validation.success) {
    return errorResponse(validation.error)
  }

  const { customerId, points, transactionType, invoiceId, description } = validation.data
  const user = getRequestUser(request)

  // Get current customer points
  const customer = await db.customer.findUnique({
    where: { id: customerId },
    select: { loyaltyPoints: true },
  })

  if (!customer) {
    return errorResponse('العميل غير موجود', 404)
  }

  // For redeemed/adjusted negative, check sufficient points
  if (points < 0 && customer.loyaltyPoints + points < 0) {
    return errorResponse('رصيد نقاط الولاء غير كافٍ')
  }

  // Create transaction and update customer points atomically
  const newPoints = customer.loyaltyPoints + points

  const transaction = await db.$transaction(async (tx) => {
    const loyaltyTx = await tx.loyaltyTransaction.create({
      data: {
        customerId,
        points,
        transactionType,
        invoiceId: invoiceId || null,
        description,
      },
    })

    await tx.customer.update({
      where: { id: customerId },
      data: { loyaltyPoints: newPoints },
    })

    return loyaltyTx
  })

  logAction({
    action: 'create',
    entity: 'LoyaltyTransaction',
    entityId: transaction.id,
    userId: user?.userId,
    userName: user?.username,
    details: { customerId, points, transactionType, invoiceId, description, newPointsBalance: newPoints },
  })

  return successResponse({
    transaction,
    newPointsBalance: newPoints,
  })
}, 'فشل في إنشاء عملية الولاء'))
