import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/customer-payments?customerId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get('customerId')

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: 'Customer ID is required' },
        { status: 400 }
      )
    }

    const payments = await db.payment.findMany({
      where: { customerId },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ success: true, data: payments })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch payments'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/customer-payments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { customerId, amount, method, notes } = body

    if (!customerId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Customer ID and a valid amount are required' },
        { status: 400 }
      )
    }

    const payment = await db.$transaction(async (tx) => {
      // 1. Create the payment record
      const createdPayment = await tx.payment.create({
        data: {
          customerId,
          amount,
          method: method || 'cash',
          notes: notes || null,
        },
      })

      // 2. Reduce customer debt
      await tx.customer.update({
        where: { id: customerId },
        data: { debt: { decrement: amount } },
      })

      return createdPayment
    })

    return NextResponse.json({ success: true, data: payment }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to record payment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
