import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/supplier-payments?supplierId=xxx
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')

    if (!supplierId) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID is required' },
        { status: 400 }
      )
    }

    const payments = await db.supplierPayment.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
    })

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

    return NextResponse.json({
      success: true,
      data: payments,
      totalPaid,
    })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to fetch supplier payments'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// POST /api/supplier-payments
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { supplierId, amount, method, notes } = body

    if (!supplierId || !amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Supplier ID and a valid amount are required' },
        { status: 400 }
      )
    }

    const result = await db.$transaction(async (tx) => {
      // 1. Create the supplier payment record
      const createdPayment = await tx.supplierPayment.create({
        data: {
          supplierId,
          amount,
          method: method || 'cash',
          notes: notes || null,
        },
      })

      // 2. Update related purchase invoices - reduce paidAmount by distributing
      // the payment across invoices that still have remaining balance
      let remainingPayment = amount
      const unpaidInvoices = await tx.invoice.findMany({
        where: {
          supplierId,
          type: 'purchase',
          // Only invoices where totalAmount > paidAmount (still have remaining)
        },
        orderBy: { createdAt: 'asc' }, // Pay oldest first
      })

      for (const invoice of unpaidInvoices) {
        if (remainingPayment <= 0) break

        const invoiceRemaining = invoice.totalAmount - invoice.discount - invoice.paidAmount
        if (invoiceRemaining <= 0) continue

        const paymentForInvoice = Math.min(remainingPayment, invoiceRemaining)

        await tx.invoice.update({
          where: { id: invoice.id },
          data: { paidAmount: { increment: paymentForInvoice } },
        })

        remainingPayment -= paymentForInvoice
      }

      return createdPayment
    })

    return NextResponse.json({ success: true, data: result }, { status: 201 })
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to record supplier payment'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
