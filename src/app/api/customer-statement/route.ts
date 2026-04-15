import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { successResponse, errorResponse, notFound } from '@/lib/api-response'
import { tryCatch } from '@/lib/api-error-handler'

// ─── GET: Customer account statement ─────────────────────────────────
export const GET = withAuth(tryCatch(async (request) => {
  const searchParams = request.nextUrl.searchParams
  const customerId = searchParams.get('customerId')
  const startDateStr = searchParams.get('startDate')
  const endDateStr = searchParams.get('endDate')

  if (!customerId) {
    return errorResponse('معرف العميل مطلوب')
  }

  const customer = await db.customer.findUnique({
    where: { id: customerId },
  })

  if (!customer) {
    return notFound('العميل غير موجود')
  }

  const startDate = startDateStr ? new Date(startDateStr) : new Date(new Date().getFullYear(), new Date().getMonth(), 1)
  const endDate = endDateStr ? new Date(endDateStr + 'T23:59:59.999Z') : new Date()

  // ── Opening balance: debt from before startDate ─────────────────
  // Sum of sales invoice totals - sum of payments made before startDate
  const [salesBefore, paymentsBefore, returnsBefore] = await Promise.all([
    db.invoice.aggregate({
      where: {
        type: 'sale',
        customerId,
        createdAt: { lt: startDate },
      },
      _sum: { totalAmount: true },
    }),
    db.payment.aggregate({
      where: {
        customerId,
        createdAt: { lt: startDate },
      },
      _sum: { amount: true },
    }),
    db.productReturn.aggregate({
      where: {
        invoice: { customerId },
        status: 'approved',
        createdAt: { lt: startDate },
      },
      _sum: { totalAmount: true },
    }),
  ])

  const totalSalesBefore = salesBefore._sum.totalAmount ?? 0
  const totalPaymentsBefore = paymentsBefore._sum.amount ?? 0
  const totalReturnsBefore = returnsBefore._sum.totalAmount ?? 0
  const openingBalance = totalSalesBefore - totalPaymentsBefore - totalReturnsBefore

  // ── Invoices & Payments within date range (parallelized) ─────────
  const [invoices, payments] = await Promise.all([
    db.invoice.findMany({
      where: {
        customerId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
      include: {
        returns: {
          include: { product: { select: { name: true } } },
        },
      },
    }),
    db.payment.findMany({
      where: {
        customerId,
        createdAt: { gte: startDate, lte: endDate },
      },
      orderBy: { createdAt: 'asc' },
    }),
  ])

  // ── Build transaction list with running balance ─────────────────
  interface Transaction {
    date: string
    type: 'invoice' | 'payment' | 'return'
    reference: string
    debit: number
    credit: number
    balance: number
    details: string
  }

  const transactions: Transaction[] = []
  let runningBalance = openingBalance

  // Add sales invoices (debit = increase debt)
  for (const inv of invoices) {
    if (inv.type === 'sale') {
      const netAmount = inv.totalAmount - (inv.paidAmount || 0)
      runningBalance += netAmount
      transactions.push({
        date: inv.createdAt.toISOString(),
        type: 'invoice',
        reference: inv.invoiceNo,
        debit: netAmount,
        credit: 0,
        balance: runningBalance,
        details: `فاتورة بيع — ${inv.totalAmount.toLocaleString()} (مدفوع: ${(inv.paidAmount || 0).toLocaleString()})`,
      })
    }
  }

  // Add returns (credit = decrease debt)
  for (const inv of invoices) {
    for (const ret of inv.returns) {
      runningBalance -= ret.totalAmount
      transactions.push({
        date: ret.createdAt.toISOString(),
        type: 'return',
        reference: ret.returnNo,
        debit: 0,
        credit: ret.totalAmount,
        balance: runningBalance,
        details: `مرتجع — ${ret.product.name} × ${ret.quantity}`,
      })
    }
  }

  // Add payments (credit = decrease debt)
  for (const pay of payments) {
    runningBalance -= pay.amount
    transactions.push({
      date: pay.createdAt.toISOString(),
      type: 'payment',
      reference: pay.id.slice(-8).toUpperCase(),
      debit: 0,
      credit: pay.amount,
      balance: runningBalance,
      details: `دفعة — ${pay.method === 'cash' ? 'نقدي' : pay.method === 'transfer' ? 'تحويل' : pay.method}${pay.notes ? ` (${pay.notes})` : ''}`,
    })
  }

  // Sort all transactions chronologically
  transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Recalculate running balance after sort
  let recalculatedBalance = openingBalance
  for (const t of transactions) {
    recalculatedBalance = recalculatedBalance + t.debit - t.credit
    t.balance = recalculatedBalance
  }

  // ── Summary totals ───────────────────────────────────────────────
  const totalDebits = transactions.reduce((sum, t) => sum + t.debit, 0)
  const totalCredits = transactions.reduce((sum, t) => sum + t.credit, 0)
  const closingBalance = recalculatedBalance

  // ── Total purchases (all-time) ───────────────────────────────────
  const allPurchasesAgg = await db.invoice.aggregate({
    where: { type: 'sale', customerId },
    _sum: { totalAmount: true },
  })

  return successResponse({
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      debt: customer.debt,
      totalPurchases: customer.totalPurchases,
      category: customer.category,
      createdAt: customer.createdAt.toISOString(),
    },
    period: {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
    },
    summary: {
      openingBalance,
      totalDebits,
      totalCredits,
      closingBalance,
      invoiceCount: invoices.filter((i) => i.type === 'sale').length,
      returnCount: invoices.reduce((sum, i) => sum + i.returns.length, 0),
      paymentCount: payments.length,
      totalPurchasesAllTime: allPurchasesAgg._sum.totalAmount ?? 0,
    },
    transactions,
  })
}, 'فشل في تحميل كشف الحساب'))
