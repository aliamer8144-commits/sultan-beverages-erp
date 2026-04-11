import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, rating, review, userName } = body

    if (!supplierId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { success: false, error: 'بيانات التقييم غير صالحة' },
        { status: 400 }
      )
    }

    // Get current supplier rating
    const supplier = await db.supplier.findUnique({ where: { id: supplierId } })
    if (!supplier) {
      return NextResponse.json(
        { success: false, error: 'المورد غير موجود' },
        { status: 404 }
      )
    }

    // Create review record
    await db.supplierReview.create({
      data: {
        supplierId,
        rating,
        review: review?.trim() || null,
        userName: userName?.trim() || null,
      },
    })

    // Calculate new average rating from all reviews
    const allReviews = await db.supplierReview.findMany({
      where: { supplierId },
      select: { rating: true },
    })
    const totalCount = allReviews.length
    const totalRating = allReviews.reduce((sum, r) => sum + r.rating, 0)
    const newAverage = Math.round((totalRating / totalCount) * 10) / 10

    const updated = await db.supplier.update({
      where: { id: supplierId },
      data: {
        rating: newAverage,
        ratingCount: totalCount,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        rating: updated.rating,
        ratingCount: updated.ratingCount,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to rate supplier'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'يرجى تحديد المورد' },
        { status: 400 }
      )
    }

    const reviews = await db.supplierReview.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })

    return NextResponse.json({ success: true, data: reviews })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch reviews'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
