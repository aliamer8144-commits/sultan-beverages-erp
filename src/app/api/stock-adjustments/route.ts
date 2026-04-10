import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// Valid adjustment types
const VALID_TYPES = ['in', 'out', 'adjustment', 'sale', 'purchase', 'return']

// GET: Fetch stock adjustments with filters, pagination, and stats
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')
    const type = searchParams.get('type')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')
    const search = searchParams.get('search')

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
        name: { contains: search.trim(), mode: 'insensitive' },
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

    // Today stats
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
      // Net change = sum of (newQty - previousQty) for today
      db.stockAdjustment.aggregate({
        where: todayWhere,
        _sum: {
          newQty: true,
          previousQty: true,
        },
      }),
    ])

    const netChange = (netChangeResult._sum.newQty || 0) - (netChangeResult._sum.previousQty || 0)

    // Count increases vs decreases
    const [increasesResult, decreasesResult] = await Promise.all([
      db.stockAdjustment.aggregate({
        where: { ...todayWhere, newQty: { gt: 0 } },
        _sum: { quantity: true },
        _count: true,
      }),
      db.stockAdjustment.aggregate({
        where: { ...todayWhere, newQty: { lt: 0 } },
        _sum: { quantity: true },
        _count: true,
      }),
    ])

    // More accurate: count where newQty > previousQty (increase) and where newQty < previousQty (decrease)
    const [increaseAgg, decreaseAgg] = await Promise.all([
      db.stockAdjustment.groupBy({
        by: ['type'],
        where: { ...todayWhere },
        _count: true,
        _sum: { quantity: true },
      }),
    ])

    let totalIncrease = 0
    let totalDecrease = 0
    for (const group of increaseAgg) {
      const qty = group._sum.quantity || 0
      if (['in', 'purchase', 'return'].includes(group.type)) {
        totalIncrease += qty
      } else if (['out', 'sale'].includes(group.type)) {
        totalDecrease += qty
      }
      // 'adjustment' can be either way - we check newQty vs previousQty
    }

    // Also get adjustment net changes
    const adjustmentAgg = await db.stockAdjustment.findMany({
      where: { ...todayWhere, type: 'adjustment' },
      select: { newQty: true, previousQty: true },
    })

    for (const adj of adjustmentAgg) {
      const diff = adj.newQty - adj.previousQty
      if (diff > 0) totalIncrease += diff
      else if (diff < 0) totalDecrease += Math.abs(diff)
    }

    return NextResponse.json({
      success: true,
      data: adjustments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      stats: {
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
      },
    })
  } catch (error) {
    console.error('Error fetching stock adjustments:', error)
    return NextResponse.json(
      { success: false, error: 'فشل في تحميل سجل التعديلات' },
      { status: 500 },
    )
  }
}

// POST: Create stock adjustment and update product quantity atomically
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { productId, type, quantity, reason, reference, referenceType, userId, userName } = body

    // Validate required fields
    if (!productId || !type || quantity === undefined || quantity === null) {
      return NextResponse.json(
        { success: false, error: 'يرجى تعبئة جميع الحقول المطلوبة' },
        { status: 400 },
      )
    }

    if (quantity < 0) {
      return NextResponse.json(
        { success: false, error: 'الكمية يجب أن تكون صفر أو أكبر' },
        { status: 400 },
      )
    }

    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { success: false, error: `نوع التعديل غير صالح. الأنواع: ${VALID_TYPES.join(', ')}` },
        { status: 400 },
      )
    }

    // Check product exists
    const product = await db.product.findUnique({
      where: { id: productId },
    })

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'المنتج غير موجود' },
        { status: 404 },
      )
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
          return NextResponse.json(
            { success: false, error: `الكمية المطلوبة (${quantity}) أكبر من المخزون المتاح (${previousQty})` },
            { status: 400 },
          )
        }
        newQty = previousQty - quantity
        break
      case 'adjustment':
        newQty = quantity // For adjustment, quantity IS the new absolute value
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
          userId: userId || '',
          userName: userName || null,
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

    return NextResponse.json({
      success: true,
      data: adjustment,
      message: `تم تعديل المخزون بنجاح (${previousQty} → ${newQty})`,
    })
  } catch (error) {
    console.error('Error creating stock adjustment:', error)
    return NextResponse.json(
      { success: false, error: 'فشل في تعديل المخزون' },
      { status: 500 },
    )
  }
}
