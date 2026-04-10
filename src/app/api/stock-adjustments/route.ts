import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'

// GET: Fetch stock adjustments with filters and pagination
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

    const [todayTotal, inCount, outCount, adjustmentCount] = await Promise.all([
      db.stockAdjustment.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      db.stockAdjustment.count({
        where: { type: 'in', createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      db.stockAdjustment.count({
        where: { type: 'out', createdAt: { gte: todayStart, lte: todayEnd } },
      }),
      db.stockAdjustment.count({
        where: { type: 'adjustment', createdAt: { gte: todayStart, lte: todayEnd } },
      }),
    ])

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
    const { productId, type, quantity, reason, reference, userId, userName } = body

    // Validate required fields
    if (!productId || !type || !quantity) {
      return NextResponse.json(
        { success: false, error: 'يرجى تعبئة جميع الحقول المطلوبة' },
        { status: 400 },
      )
    }

    if (quantity <= 0) {
      return NextResponse.json(
        { success: false, error: 'الكمية يجب أن تكون أكبر من صفر' },
        { status: 400 },
      )
    }

    const validTypes = ['in', 'out', 'adjustment']
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'نوع التعديل غير صالح. الأنواع: إضافة (in)، خصم (out)، تعديل (adjustment)' },
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
        newQty = previousQty + quantity
        break
      case 'out':
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
          quantity: type === 'adjustment' ? quantity : quantity,
          previousQty,
          newQty,
          reason: reason || '',
          reference: reference || null,
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
