import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { successResponse } from '@/lib/api-response'
import { tryCatch } from '@/lib/api-error-handler'

export const GET = withAuth(tryCatch(async () => {
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0))
  const endOfDay = new Date(new Date().setHours(23, 59, 59, 999))

  // 1. Total Sales: sum of sale invoices for today
  const salesResult = await db.invoice.aggregate({
    where: {
      type: 'sale',
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    _sum: { totalAmount: true },
  })
  const totalSales = salesResult._sum.totalAmount ?? 0

  // 2. Total Profit: (sell_price - cost_price) * quantity for today's sale items
  const todaySaleItems = await db.invoiceItem.findMany({
    where: {
      invoice: {
        type: 'sale',
        createdAt: { gte: startOfDay, lte: endOfDay },
      },
    },
    include: {
      product: {
        select: { costPrice: true, name: true },
      },
    },
  })

  const totalProfit = todaySaleItems.reduce(
    (sum, item) => sum + (item.price - item.product.costPrice) * item.quantity,
    0
  )

  // 3. Total Purchases: sum of purchase invoices for today
  const purchasesResult = await db.invoice.aggregate({
    where: {
      type: 'purchase',
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    _sum: { totalAmount: true },
  })
  const totalPurchases = purchasesResult._sum.totalAmount ?? 0

  // 4. Total Expenses = purchases
  const totalExpenses = totalPurchases

  // 5. Net Profit = Total Sales - Total Purchases
  const netProfit = totalSales - totalPurchases

  // 6. Invoice Count: number of sale invoices today
  const invoiceCount = await db.invoice.count({
    where: {
      type: 'sale',
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
  })

  // 7. Items Sold: total quantity
  const itemsSold = todaySaleItems.reduce((sum, item) => sum + item.quantity, 0)

  // 8. Average Invoice: Total Sales / Invoice Count
  const averageInvoice = invoiceCount > 0 ? totalSales / invoiceCount : 0

  // 9. Top Selling Product: product with highest total quantity sold today
  const productQuantityMap = new Map<string, { name: string; quantity: number; revenue: number }>()
  for (const item of todaySaleItems) {
    const existing = productQuantityMap.get(item.productId)
    if (existing) {
      existing.quantity += item.quantity
      existing.revenue += item.price * item.quantity
    } else {
      productQuantityMap.set(item.productId, {
        name: item.product.name,
        quantity: item.quantity,
        revenue: item.price * item.quantity,
      })
    }
  }

  const topSellingProducts = Array.from(productQuantityMap.values())
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5)

  const topSellingProduct = topSellingProducts[0] ?? null

  // 10. Payment Methods: Cash (paid >= total) vs Credit (remaining > 0)
  const todaySaleInvoices = await db.invoice.findMany({
    where: {
      type: 'sale',
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: {
      totalAmount: true,
      paidAmount: true,
    },
  })

  let cashTotal = 0
  let creditTotal = 0
  let cashCount = 0
  let creditCount = 0

  for (const inv of todaySaleInvoices) {
    const remaining = inv.totalAmount - inv.paidAmount
    if (remaining <= 0) {
      cashTotal += inv.paidAmount
      cashCount++
    } else {
      creditTotal += inv.paidAmount
      creditCount++
    }
  }

  // 11. Hourly Breakdown: sales per hour
  const hourlyMap = new Map<number, number>()
  for (let h = 0; h < 24; h++) {
    hourlyMap.set(h, 0)
  }

  const hourlyInvoices = await db.invoice.findMany({
    where: {
      type: 'sale',
      createdAt: { gte: startOfDay, lte: endOfDay },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  })

  for (const inv of hourlyInvoices) {
    const hour = inv.createdAt.getHours()
    hourlyMap.set(hour, (hourlyMap.get(hour) ?? 0) + inv.totalAmount)
  }

  const hourlyBreakdown = Array.from(hourlyMap.entries())
    .filter(([, total]) => total > 0)
    .map(([hour, total]) => ({
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      total: Math.round(total * 100) / 100,
    }))
    .sort((a, b) => a.hour - b.hour)

  return successResponse({
    totalSales,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalPurchases,
    totalExpenses,
    netProfit: Math.round(netProfit * 100) / 100,
    invoiceCount,
    itemsSold,
    averageInvoice: Math.round(averageInvoice * 100) / 100,
    topSellingProduct,
    topSellingProducts,
    paymentMethods: {
      cash: { total: Math.round(cashTotal * 100) / 100, count: cashCount },
      credit: { total: Math.round(creditTotal * 100) / 100, count: creditCount },
    },
    hourlyBreakdown,
  })
}, 'فشل في تحميل بيانات الإغلاق اليومي'))
