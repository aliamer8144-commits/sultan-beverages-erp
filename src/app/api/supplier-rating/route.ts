import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, rating } = body

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

    // Calculate new average rating
    const totalCount = supplier.ratingCount + 1
    const totalRating = (supplier.rating * supplier.ratingCount) + rating
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
