import { db } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

// ─── Helper: calculate date range based on target type ─────────────────────
function getDateRange(type: string, startDate: Date, endDate?: Date | null) {
  const now = new Date()
  let rangeStart: Date
  let rangeEnd: Date

  if (endDate) {
    // Use the target's own start/end dates
    rangeStart = new Date(startDate)
    rangeEnd = new Date(endDate)
  } else {
    // Rolling target based on type
    rangeEnd = new Date(now)
    switch (type) {
      case 'daily':
        rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'weekly': {
        // Start of the week (Sunday)
        const dayOfWeek = now.getDay()
        rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - dayOfWeek)
        break
      }
      case 'monthly':
        rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      default:
        rangeStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    }
  }

  return { rangeStart, rangeEnd }
}

// ─── Helper: compute sales data for a target ────────────────────────────────
async function computeTargetData(target: {
  id: string
  type: string
  targetAmount: number
  startDate: Date
  endDate: Date | null
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}) {
  const { rangeStart, rangeEnd } = getDateRange(target.type, target.startDate, target.endDate)

  // Calculate current sales amount from Invoice table (type='sale')
  const salesAgg = await db.invoice.aggregate({
    _sum: { totalAmount: true },
    where: {
      type: 'sale',
      createdAt: {
        gte: rangeStart,
        lte: rangeEnd,
      },
    },
  })

  const currentAmount = salesAgg._sum.totalAmount || 0
  const targetAmount = target.targetAmount
  const progressPercent = targetAmount > 0 ? Math.min((currentAmount / targetAmount) * 100, 100) : 0
  const remainingAmount = Math.max(targetAmount - currentAmount, 0)

  // Calculate days/hours remaining
  let daysRemaining = 0
  let hoursRemaining = 0
  const now = new Date()

  if (target.endDate) {
    const end = new Date(target.endDate)
    const diffMs = end.getTime() - now.getTime()
    if (diffMs > 0) {
      daysRemaining = Math.floor(diffMs / (1000 * 60 * 60 * 24))
      hoursRemaining = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
    }
  } else {
    // Rolling target: remaining time in the period
    const { rangeStart, rangeEnd } = getDateRange(target.type, target.startDate, null)
    const diffMs = rangeEnd.getTime() - now.getTime()
    if (diffMs > 0) {
      hoursRemaining = Math.floor(diffMs / (1000 * 60 * 60))
      daysRemaining = Math.floor(hoursRemaining / 24)
      hoursRemaining = hoursRemaining % 24
    }
  }

  // Calculate daily target needed
  let dailyTargetNeeded = 0
  if (remainingAmount > 0 && daysRemaining > 0) {
    dailyTargetNeeded = Math.round((remainingAmount / daysRemaining) * 100) / 100
  }

  return {
    ...target,
    currentAmount: Math.round(currentAmount * 100) / 100,
    progressPercentage: Math.round(progressPercent * 10) / 10,
    remainingAmount: Math.round(remainingAmount * 100) / 100,
    daysRemaining,
    hoursRemaining,
    dailyTargetNeeded,
  }
}

// ─── GET: Return active target (with computed fields) or all targets ────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const all = searchParams.get('all') === 'true'

    if (all) {
      // Return all targets with computed fields
      const targets = await db.salesTarget.findMany({
        orderBy: { createdAt: 'desc' },
      })

      const targetsWithData = await Promise.all(
        targets.map((t) => computeTargetData(t))
      )

      return NextResponse.json({ success: true, data: targetsWithData })
    }

    // Return only the active target(s)
    const now = new Date()
    const activeTargets = await db.salesTarget.findMany({
      where: {
        isActive: true,
        OR: [
          { endDate: null },
          { endDate: { gt: now } },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    })

    if (activeTargets.length === 0) {
      return NextResponse.json({ success: true, data: null })
    }

    const targetWithData = await computeTargetData(activeTargets[0])

    return NextResponse.json({ success: true, data: targetWithData })
  } catch (error) {
    console.error('Error fetching sales targets:', error)
    return NextResponse.json(
      { success: false, error: 'خطأ في جلب أهداف المبيعات' },
      { status: 500 }
    )
  }
}

// ─── POST: Create new sales target ──────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { type, targetAmount, startDate, endDate } = body

    if (!type || !targetAmount) {
      return NextResponse.json(
        { success: false, error: 'النوع والمبلغ مطلوبان' },
        { status: 400 }
      )
    }

    if (!['daily', 'weekly', 'monthly'].includes(type)) {
      return NextResponse.json(
        { success: false, error: 'نوع الهدف غير صالح (يومي/أسبوعي/شهري)' },
        { status: 400 }
      )
    }

    if (targetAmount <= 0) {
      return NextResponse.json(
        { success: false, error: 'مبلغ الهدف يجب أن يكون أكبر من صفر' },
        { status: 400 }
      )
    }

    // Deactivate any existing active targets of the same type
    await db.salesTarget.updateMany({
      where: { type, isActive: true },
      data: { isActive: false },
    })

    const target = await db.salesTarget.create({
      data: {
        type,
        targetAmount,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        isActive: true,
      },
    })

    const targetWithData = await computeTargetData(target)

    return NextResponse.json({ success: true, data: targetWithData })
  } catch (error) {
    console.error('Error creating sales target:', error)
    return NextResponse.json(
      { success: false, error: 'خطأ في إنشاء هدف المبيعات' },
      { status: 500 }
    )
  }
}

// ─── PUT: Update existing sales target ──────────────────────────────────────
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, targetAmount, type, isActive } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الهدف مطلوب' },
        { status: 400 }
      )
    }

    const existing = await db.salesTarget.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'الهدف غير موجود' },
        { status: 404 }
      )
    }

    const updateData: Record<string, unknown> = {}
    if (targetAmount !== undefined) updateData.targetAmount = targetAmount
    if (type !== undefined) updateData.type = type
    if (isActive !== undefined) updateData.isActive = isActive

    const target = await db.salesTarget.update({
      where: { id },
      data: updateData,
    })

    const targetWithData = await computeTargetData(target)

    return NextResponse.json({ success: true, data: targetWithData })
  } catch (error) {
    console.error('Error updating sales target:', error)
    return NextResponse.json(
      { success: false, error: 'خطأ في تحديث هدف المبيعات' },
      { status: 500 }
    )
  }
}

// ─── DELETE: Delete a target ────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف الهدف مطلوب' },
        { status: 400 }
      )
    }

    await db.salesTarget.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'تم حذف الهدف بنجاح' })
  } catch (error) {
    console.error('Error deleting sales target:', error)
    return NextResponse.json(
      { success: false, error: 'خطأ في حذف هدف المبيعات' },
      { status: 500 }
    )
  }
}
