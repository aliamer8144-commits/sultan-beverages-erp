import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { successResponse } from '@/lib/api-response'
import { tryCatch } from '@/lib/api-error-handler'

export const GET = withAuth(tryCatch(async () => {
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0))

  // 1. Today's Sales Total
  const todaySalesResult = await db.invoice.aggregate({
    where: {
      type: 'sale',
      createdAt: { gte: startOfDay },
    },
    _sum: { totalAmount: true },
  })

  const todaySales = todaySalesResult._sum.totalAmount ?? 0

  // 2. Today's Profit: (item.price - product.costPrice) * item.quantity
  const todayInvoiceItems = await db.invoiceItem.findMany({
    where: {
      invoice: {
        type: 'sale',
        createdAt: { gte: startOfDay },
      },
    },
    include: {
      product: {
        select: { costPrice: true },
      },
    },
  })

  const todayProfit = todayInvoiceItems.reduce(
    (sum, item) => sum + (item.price - item.product.costPrice) * item.quantity,
    0
  )

  // 3. Today's Invoice Count
  const todayInvoiceCount = await db.invoice.count({
    where: {
      type: 'sale',
      createdAt: { gte: startOfDay },
    },
  })

  // 4. Low Stock Products Count
  const lowStockCount = await db.product.count({
    where: {
      quantity: { lte: db.product.fields.minQuantity },
      isActive: true,
    },
  })

  // 5. Top Selling Products (top 5 by total quantity sold)
  const topProductGroups = await db.invoiceItem.groupBy({
    by: ['productId'],
    where: {
      invoice: { type: 'sale' },
    },
    _sum: { quantity: true },
    orderBy: { _sum: { quantity: 'desc' } },
    take: 5,
  })

  const topProductIds = topProductGroups.map((g) => g.productId)
  const topProductsData =
    topProductIds.length > 0
      ? await db.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true },
        })
      : []

  const topProducts = topProductGroups.map((group) => {
    const product = topProductsData.find((p) => p.id === group.productId)
    return {
      name: product?.name ?? 'Unknown',
      quantity: group._sum.quantity ?? 0,
    }
  })

  // 6. Recent Sales (last 10 sale invoices with customer name)
  const recentSales = await db.invoice.findMany({
    where: { type: 'sale' },
    include: {
      customer: {
        select: { name: true },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 10,
  })

  const recentSalesData = recentSales.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    customerName: inv.customer?.name ?? 'Walk-in',
    total: inv.totalAmount,
    createdAt: inv.createdAt,
  }))

  // 7. Monthly Sales (last 6 months)
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0)

  const monthlyInvoices = await db.invoice.findMany({
    where: {
      type: 'sale',
      createdAt: { gte: sixMonthsAgo },
    },
    select: {
      totalAmount: true,
      createdAt: true,
    },
  })

  // Aggregate by month
  const monthMap = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, 0)
  }

  for (const inv of monthlyInvoices) {
    const key = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, '0')}`
    if (monthMap.has(key)) {
      monthMap.set(key, (monthMap.get(key) ?? 0) + inv.totalAmount)
    }
  }

  const monthlySales = Array.from(monthMap.entries()).map(([key, total]) => {
    const [year, month] = key.split('-')
    const date = new Date(Number(year), Number(month) - 1, 1)
    const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return { month: label, total }
  })

  // 8. Sales by Category (donut chart data)
  const salesByCategoryRaw = await db.invoiceItem.findMany({
    where: {
      invoice: { type: 'sale' },
    },
    include: {
      product: {
        include: {
          category: {
            select: { name: true },
          },
        },
      },
    },
  })

  const categorySalesMap = new Map<string, number>()
  for (const item of salesByCategoryRaw) {
    const categoryName = item.product?.category?.name ?? 'أخرى'
    const total = item.price * item.quantity
    categorySalesMap.set(categoryName, (categorySalesMap.get(categoryName) ?? 0) + total)
  }

  const salesByCategory = Array.from(categorySalesMap.entries())
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value)

  return successResponse({
    todaySales,
    todayProfit,
    todayInvoiceCount,
    lowStockCount,
    topProducts,
    recentSales: recentSalesData,
    monthlySales,
    salesByCategory,
  })
}, 'فشل في تحميل بيانات لوحة التحكم'))
