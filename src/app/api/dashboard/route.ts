import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { successResponse } from '@/lib/api-response'
import { tryCatch } from '@/lib/api-error-handler'

export const revalidate = 30 // Cache for 30 seconds

export const GET = withAuth(tryCatch(async () => {
  const startOfDay = new Date(new Date().setHours(0, 0, 0, 0))
  const now = new Date()
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1, 0, 0, 0, 0)

  // ── Parallel batch 1: all independent Prisma client queries ──────
  const [
    todaySalesResult,
    todayInvoiceItems,
    todayInvoiceCount,
    lowStockCount,
    topProductGroups,
    recentSales,
    salesByCategoryGroups,
  ] = await Promise.all([
    // 1. Today's Sales Total
    db.invoice.aggregate({
      where: { type: 'sale', createdAt: { gte: startOfDay } },
      _sum: { totalAmount: true },
    }),

    // 2. Today's Profit: (item.price - product.costPrice) * item.quantity
    db.invoiceItem.findMany({
      where: {
        invoice: { type: 'sale', createdAt: { gte: startOfDay } },
      },
      include: {
        product: { select: { costPrice: true } },
      },
    }),

    // 3. Today's Invoice Count
    db.invoice.count({
      where: { type: 'sale', createdAt: { gte: startOfDay } },
    }),

    // 4. Low Stock Products Count
    db.product.count({
      where: {
        quantity: { lte: db.product.fields.minQuantity },
        isActive: true,
      },
    }),

    // 5. Top Selling Products (top 5 by total quantity sold)
    db.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { type: 'sale' } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),

    // 6. Recent Sales (last 10 sale invoices with customer name)
    db.invoice.findMany({
      where: { type: 'sale' },
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // 7. Sales by Category — groupBy productId, resolve category names after
    db.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { type: 'sale' } },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 100,
    }),
  ])

  // ── Compute today's metrics ──────────────────────────────────────
  const todaySales = todaySalesResult._sum.totalAmount ?? 0

  const todayProfit = todayInvoiceItems.reduce(
    (sum, item) => sum + (item.price - item.product.costPrice) * item.quantity,
    0,
  )

  // ── Parallel batch 2: SQL aggregation + resolve names from IDs ───
  const topProductIds = topProductGroups.map((g) => g.productId)
  const categoryProductIds = salesByCategoryGroups.map((r) => r.productId)

  const [
    monthlyRaw,
    topProductsData,
    categoryProducts,
  ] = await Promise.all([
    // Monthly Sales (last 6 months) — SQL aggregation instead of fetching every invoice
    db.$queryRaw`
      SELECT TO_CHAR("createdAt", 'YYYY-MM') as month, COALESCE(SUM("totalAmount"), 0)::float as total
      FROM "Invoice"
      WHERE "type" = 'sale' AND "createdAt" >= ${sixMonthsAgo}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM')
      ORDER BY month
    `,

    // Resolve top product names
    topProductIds.length > 0
      ? db.product.findMany({
          where: { id: { in: topProductIds } },
          select: { id: true, name: true },
        })
      : Promise.resolve([]),

    // Resolve product → category names
    categoryProductIds.length > 0
      ? db.product.findMany({
          where: { id: { in: categoryProductIds } },
          select: { id: true, category: { select: { name: true } } },
        })
      : Promise.resolve([]),
  ]) as [
    Array<{ month: string; total: number }>,
    Array<{ id: string; name: string }>,
    Array<{ id: string; category: { name: string } | null }>,
  ]

  // ── Top Products formatting ──────────────────────────────────────
  const topProducts = topProductGroups.map((group) => {
    const product = topProductsData.find((p) => p.id === group.productId)
    return {
      name: product?.name ?? 'Unknown',
      quantity: group._sum.quantity ?? 0,
    }
  })

  // ── Recent Sales formatting ──────────────────────────────────────
  const recentSalesData = recentSales.map((inv) => ({
    id: inv.id,
    invoiceNo: inv.invoiceNo,
    customerName: inv.customer?.name ?? 'Walk-in',
    total: inv.totalAmount,
    createdAt: inv.createdAt,
  }))

  // ── Monthly Sales ────────────────────────────────────────────────
  // Initialize all 6 months with 0
  const monthMap = new Map<string, number>()
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    monthMap.set(key, 0)
  }

  // Fill in aggregated totals from SQL
  for (const row of monthlyRaw) {
    if (monthMap.has(row.month)) {
      monthMap.set(row.month, (monthMap.get(row.month) ?? 0) + Number(row.total))
    }
  }

  const monthlySales = Array.from(monthMap.entries()).map(([key, total]) => {
    const [year, month] = key.split('-')
    const date = new Date(Number(year), Number(month) - 1, 1)
    const label = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    return { month: label, total }
  })

  // ── Sales by Category (resolve category names from product IDs) ───
  const productCategoryMap = new Map(
    categoryProducts.map((p) => [p.id, p.category?.name ?? 'أخرى'] as const),
  )
  const categorySalesMap = new Map<string, number>()

  for (const group of salesByCategoryGroups) {
    const catName = productCategoryMap.get(group.productId) ?? 'أخرى'
    const total = group._sum.total ?? 0
    categorySalesMap.set(catName, (categorySalesMap.get(catName) ?? 0) + total)
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
}, 'فشل في تحميل بيانات لوحة التحكم'), { requireAdmin: true })
