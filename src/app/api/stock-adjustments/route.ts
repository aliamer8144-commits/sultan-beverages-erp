import { db } from '@/lib/db'
import { Prisma } from '@prisma/client'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse, notFound } from '@/lib/api-response'
import { validateBody, createStockAdjustmentSchema } from '@/lib/validations'
import { logAction } from '@/lib/audit-logger'
import { tryCatch } from '@/lib/api-error-handler'

// GET: Fetch stock adjustments with filters, pagination, and stats
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url)
  const productId = searchParams.get('productId')
  const type = searchParams.get('type')
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const dateFrom = searchParams.get('dateFrom')
  const dateTo = searchParams.get('dateTo')
  const search = searchParams.get('search')
  const includeStats = searchParams.get('stats') === 'true'

  const where: Record<string, unknown> = {}

  if (productId) where.productId = productId
  if (type && type !== 'all') where.type = type

  if (dateFrom || dateTo) {
    where.createdAt = {} as Record<string, Date>
    if (dateFrom) (where.createdAt as Record<string, Date>).gte = new Date(dateFrom)
    if (dateTo) (where.createdAt as Record<string, Date>).lte = new Date(dateTo + 'T23:59:59.999Z')
  }

  if (search && search.trim()) {
    where.product = {
      name: { contains: search.trim() },
    } as Prisma.ProductWhereInput
  }

  const [adjustments, total] = await Promise.all([
    db.stockAdjustment.findMany({
      where,
      include: {
        product: {
          select: { id: true, name: true, category: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.stockAdjustment.count({ where }),
  ])

  // Stats (only when ?stats=true)
  let stats = undefined as Record<string, unknown> | undefined

  if (includeStats) {
    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date()
    todayEnd.setHours(23, 59, 59, 999)

    const todayWhere = { createdAt: { gte: todayStart, lte: todayEnd } } as Record<string, unknown>

    const [todayTotal, inCount, outCount, adjustmentCount, saleCount, purchaseCount, returnCount, netChangeResult] = await Promise.all([
      db.stockAdjustment.count({ where: todayWhere }),
      db.stockAdjustment.count({ where: { ...todayWhere, type: 'in' } }),
      db.stockAdjustment.count({ where: { ...todayWhere, type: 'out' } }),
      db.stockAdjustment.count({ where: { ...todayWhere, type: 'adjustment' } }),
      db.stockAdjustment.count({ where: { ...todayWhere, type: 'sale' } }),
      db.stockAdjustment.count({ where: { ...todayWhere, type: 'purchase' } }),
      db.stockAdjustment.count({ where: { ...todayWhere, type: 'return' } }),
      db.stockAdjustment.aggregate({
        where: todayWhere,
        _sum: { newQty: true, previousQty: true },
      }),
    ])

    const netChange = (netChangeResult._sum.newQty || 0) - (netChangeResult._sum.previousQty || 0)

    // Group by type for today
    const increaseAgg = await db.stockAdjustment.groupBy({
      by: ['type'],
      where: { ...todayWhere },
      _count: true,
      _sum: { quantity: true },
    })

    let totalIncrease = 0
    let totalDecrease = 0
    for (const group of increaseAgg) {
      const qty = group._sum.quantity || 0
      if (['in', 'purchase', 'return'].includes(group.type)) {
        totalIncrease += qty
      } else if (['out', 'sale'].includes(group.type)) {
        totalDecrease += qty
      }
    }

    // Adjustment net changes
    const adjustmentAgg = await db.stockAdjustment.findMany({
      where: { ...todayWhere, type: 'adjustment' },
      select: { newQty: true, previousQty: true },
    })

    for (const adj of adjustmentAgg) {
      const diff = adj.newQty - adj.previousQty
      if (diff > 0) totalIncrease += diff
      else if (diff < 0) totalDecrease += Math.abs(diff)
    }

    stats = {
      todayTotal,
      inCount,
      outCount,
      adjustmentCount,
      saleCount,
      purchaseCount,
      returnCount,
      totalIncrease,
      totalDecrease,
      netChange,
    }
  }

  return successResponse({
    adjustments,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
    ...(stats ? { stats } : {}),
  })
}, 'فشل في تحميل سجل التعديلات'))

// POST: Create stock adjustment and update product quantity atomically
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const validation = validateBody(createStockAdjustmentSchema, body)
  if (!validation.success) return errorResponse(validation.error)

  const { productId, type, quantity, reason, reference, referenceType } = validation.data
  const user = getRequestUser(request)

  // Check product exists
  const product = await db.product.findUnique({
    where: { id: productId },
  })

  if (!product) {
    return notFound('المنتج غير موجود')
  }

  const previousQty = product.quantity

  // Calculate new quantity based on adjustment type
  let newQty: number
  switch (type) {
    case 'in':
    case 'purchase':
    case 'return':
      newQty = previousQty + quantity
      break
    case 'out':
    case 'sale':
      if (quantity > previousQty) {
        return errorResponse(`الكمية المطلوبة (${quantity}) أكبر من المخزون المتاح (${previousQty})`)
      }
      newQty = previousQty - quantity
      break
    case 'adjustment':
      newQty = quantity
      break
    default:
      newQty = previousQty
  }

  // Use transaction to create adjustment and update product atomically
  const adjustment = await db.$transaction(async (tx) => {
    const adj = await tx.stockAdjustment.create({
      data: {
        productId,
        type,
        quantity,
        previousQty,
        newQty,
        reason: reason || '',
        reference: reference || null,
        referenceType: referenceType || null,
        userId: user?.userId || '',
        userName: user?.username || null,
      },
      include: {
        product: {
          select: { id: true, name: true, category: { select: { name: true } } },
        },
      },
    })

    await tx.product.update({
      where: { id: productId },
      data: { quantity: newQty },
    })

    return adj
  })

  logAction({
    action: 'create',
    entity: 'StockAdjustment',
    entityId: adjustment.id,
    userId: user?.userId,
    userName: user?.username,
    details: { productId, type, quantity, previousQty, newQty },
  })

  return successResponse({
    ...adjustment,
    message: `تم تعديل المخزون بنجاح (${previousQty} → ${newQty})`,
  })
}, 'فشل في تعديل المخزون'), { requireManager: true })
