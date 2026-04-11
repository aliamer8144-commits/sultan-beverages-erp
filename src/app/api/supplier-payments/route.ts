import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse, serverError } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { validateBody, createSupplierPaymentSchema } from '@/lib/validations'

// GET /api/supplier-payments?supplierId=xxx
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const supplierId = searchParams.get('supplierId')

    if (!supplierId) {
      return errorResponse('معرف المورد مطلوب')
    }

    const payments = await db.supplierPayment.findMany({
      where: { supplierId },
      orderBy: { createdAt: 'desc' },
    })

    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

    return successResponse({ payments, totalPaid })
  } catch (error) {
    console.error('Error fetching supplier payments:', error)
    return serverError('فشل في جلب مدفوعات المورد')
  }
})

// POST /api/supplier-payments
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const validation = validateBody(createSupplierPaymentSchema, body)
    if (!validation.success) return errorResponse(validation.error)

    const { supplierId, amount, method, notes } = validation.data
    const user = getRequestUser(request)

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

    logAction({
      action: 'create',
      entity: 'SupplierPayment',
      entityId: result.id,
      userId: user?.userId,
      userName: user?.username,
      details: { supplierId, amount, method },
    })

    return successResponse(result, 201)
  } catch (error) {
    console.error('Error recording supplier payment:', error)
    return serverError('فشل في تسجيل دفعة المورد')
  }
})
