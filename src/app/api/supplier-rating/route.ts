import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse, notFound } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { validateBody, createSupplierReviewSchema } from '@/lib/validations'
import { tryCatch } from '@/lib/api-error-handler'

// POST /api/supplier-rating
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const validation = validateBody(createSupplierReviewSchema, body)
  if (!validation.success) return errorResponse(validation.error)

  const { supplierId, rating, review } = validation.data
  const user = getRequestUser(request)

  // Get current supplier rating
  const supplier = await db.supplier.findUnique({ where: { id: supplierId } })
  if (!supplier) return notFound('المورد غير موجود')

  // Create review record — userName comes from JWT, not body
  await db.supplierReview.create({
    data: {
      supplierId,
      rating,
      review: review?.trim() || null,
      userName: user?.username?.trim() || null,
    },
  })

  // Calculate new average rating using aggregate
  const agg = await db.supplierReview.aggregate({
    where: { supplierId },
    _avg: { rating: true },
    _count: { id: true },
  })
  const totalCount = agg._count.id
  const totalRating = agg._avg.rating ?? 0
  const newAverage = Math.round((totalRating / totalCount) * 10) / 10

  const updated = await db.supplier.update({
    where: { id: supplierId },
    data: {
      rating: newAverage,
      ratingCount: totalCount,
    },
  })

  logAction({
    action: 'create',
    entity: 'SupplierReview',
    entityId: supplierId,
    userId: user?.userId,
    userName: user?.username,
    details: { rating, review },
  })

  return successResponse({
    rating: updated.rating,
    ratingCount: updated.ratingCount,
  })
}, 'فشل في تقييم المورد'))

// GET /api/supplier-rating?supplierId=xxx
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url)
  const supplierId = searchParams.get('supplierId')

  if (!supplierId) {
    return errorResponse('يرجى تحديد المورد')
  }

  const reviews = await db.supplierReview.findMany({
    where: { supplierId },
    orderBy: { createdAt: 'desc' },
    take: 20,
  })

  return successResponse(reviews)
}, 'فشل في جلب التقييمات'))
