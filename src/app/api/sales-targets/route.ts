import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse, notFound } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { validateBody, createSalesTargetSchema, updateSalesTargetSchema } from '@/lib/validations'
import { tryCatch } from '@/lib/api-error-handler'

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
export const GET = withAuth(tryCatch(async (request) => {
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

    return successResponse(targetsWithData)
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
    return successResponse(null)
  }

  const targetWithData = await computeTargetData(activeTargets[0])

  return successResponse(targetWithData)
}, 'خطأ في جلب أهداف المبيعات'))

// ─── POST: Create new sales target ──────────────────────────────────────────
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const validation = validateBody(createSalesTargetSchema, body)
  if (!validation.success) return errorResponse(validation.error)

  const { type, targetAmount, startDate, endDate } = validation.data
  const user = getRequestUser(request)

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

  logAction({
    action: 'create',
    entity: 'SalesTarget',
    entityId: target.id,
    userId: user?.userId,
    userName: user?.username,
    details: { type, targetAmount, startDate, endDate },
  })

  const targetWithData = await computeTargetData(target)

  return successResponse(targetWithData, 201)
}, 'خطأ في إنشاء هدف المبيعات'))

// ─── PUT: Update existing sales target ──────────────────────────────────────
export const PUT = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const validation = validateBody(updateSalesTargetSchema, body)
  if (!validation.success) return errorResponse(validation.error)

  const { id, targetAmount, type, isActive } = validation.data
  const user = getRequestUser(request)

  const existing = await db.salesTarget.findUnique({ where: { id } })
  if (!existing) return notFound('الهدف غير موجود')

  const updateData: Record<string, unknown> = {}
  if (targetAmount !== undefined) updateData.targetAmount = targetAmount
  if (type !== undefined) updateData.type = type
  if (isActive !== undefined) updateData.isActive = isActive

  const target = await db.salesTarget.update({
    where: { id },
    data: updateData,
  })

  logAction({
    action: 'update',
    entity: 'SalesTarget',
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: updateData,
  })

  const targetWithData = await computeTargetData(target)

  return successResponse(targetWithData)
}, 'خطأ في تحديث هدف المبيعات'))

// ─── DELETE: Delete a target ────────────────────────────────────────────────
export const DELETE = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  const user = getRequestUser(request)

  if (!id) return errorResponse('معرف الهدف مطلوب')

  await db.salesTarget.delete({ where: { id } })

  logAction({
    action: 'delete',
    entity: 'SalesTarget',
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: { reason: 'تم حذف الهدف' },
  })

  return successResponse({ message: 'تم حذف الهدف بنجاح' })
}, 'خطأ في حذف هدف المبيعات'))
