import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { successResponse } from '@/lib/api-response'
import { tryCatch } from '@/lib/api-error-handler'

export const revalidate = 30 // Cache for 30 seconds

// ─── GET: Aggregated quick-stats for the floating panel ─────────────
export const GET = withAuth(tryCatch(async () => {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

  // Previous period for trends
  const prevDayStart = new Date(startOfDay.getTime() - 86400000)
  const prevDayEnd = new Date(prevDayStart.getTime() + 86400000 - 1)
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999)

  // Run all independent queries in parallel
  const [
    salesAgg,
    todayItems,
    invoiceCount,
    lowStockCount,
    customerCount,
    supplierCount,
    productCount,
    expensesAgg,
    todayExpensesAgg,
    monthlySalesAgg,
    monthlyExpensesAgg,
    totalDebtAgg,
    topProductGroups,
    recentLogs,
    activeTargets,
    topCustomerRow,
    itemsSoldTodayAgg,
    // Previous period data for trends
    prevDaySalesAgg,
    prevDayInvoiceCount,
    prevDayItemsAgg,
    prevMonthSalesAgg,
    prevDayExpensesAgg,
  ] = await Promise.all([
    // 1. Today's total sales (sale invoices)
    db.invoice.aggregate({
      where: { type: 'sale', createdAt: { gte: startOfDay } },
      _sum: { totalAmount: true },
    }),

    // 2. Today's invoice items (to compute profit + top products)
    db.invoiceItem.findMany({
      where: { invoice: { type: 'sale', createdAt: { gte: startOfDay } } },
      include: { product: { select: { costPrice: true, name: true } } },
    }),

    // 3. Today's invoice count
    db.invoice.count({
      where: { type: 'sale', createdAt: { gte: startOfDay } },
    }),

    // 4. Low-stock products count
    db.product.count({
      where: { quantity: { lte: db.product.fields.minQuantity }, isActive: true },
    }),

    // 5. Total customers
    db.customer.count({ where: { isActive: true } }),

    // 6. Total suppliers
    db.supplier.count({ where: { isActive: true } }),

    // 7. Total products
    db.product.count({ where: { isActive: true } }),

    // 8. Current month expenses
    db.expense.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),

    // 9. Today's expenses
    db.expense.aggregate({
      where: { date: { gte: startOfDay } },
      _sum: { amount: true },
    }),

    // 10. Monthly sales total
    db.invoice.aggregate({
      where: { type: 'sale', createdAt: { gte: monthStart, lte: monthEnd } },
      _sum: { totalAmount: true },
    }),

    // 11. Monthly expenses
    db.expense.aggregate({
      where: { date: { gte: monthStart, lte: monthEnd } },
      _sum: { amount: true },
    }),

    // 12. Total customer debt
    db.customer.aggregate({
      where: { isActive: true },
      _sum: { debt: true },
    }),

    // 13. Top products by quantity sold today
    db.invoiceItem.groupBy({
      by: ['productId'],
      where: { invoice: { type: 'sale', createdAt: { gte: startOfDay } } },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    }),

    // 14. Recent activity (last 10 audit log entries)
    db.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // 15. Active sales target (monthly)
    db.salesTarget.findFirst({
      where: {
        isActive: true,
        type: 'monthly',
        OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
      },
      orderBy: { createdAt: 'desc' },
    }),

    // 16. Top customer today — single query with JOIN (no N+1)
    db.$queryRaw<Array<{ customerName: string | null }>>`
      SELECT c."name" as "customerName"
      FROM "Invoice" i
      LEFT JOIN "Customer" c ON i."customerId" = c.id
      WHERE i."type" = 'sale' AND i."createdAt" >= ${startOfDay} AND i."customerId" IS NOT NULL
      GROUP BY i."customerId", c."name"
      ORDER BY SUM(i."totalAmount") DESC
      LIMIT 1
    `,

    // 17. Total items sold today
    db.invoiceItem.aggregate({
      where: { invoice: { type: 'sale', createdAt: { gte: startOfDay } } },
      _sum: { quantity: true },
    }),

    // 18. Previous day sales
    db.invoice.aggregate({
      where: { type: 'sale', createdAt: { gte: prevDayStart, lte: prevDayEnd } },
      _sum: { totalAmount: true },
    }),

    // 19. Previous day invoice count
    db.invoice.count({
      where: { type: 'sale', createdAt: { gte: prevDayStart, lte: prevDayEnd } },
    }),

    // 20. Previous day invoice items (for profit comparison)
    db.invoiceItem.findMany({
      where: { invoice: { type: 'sale', createdAt: { gte: prevDayStart, lte: prevDayEnd } } },
      include: { product: { select: { costPrice: true } } },
    }),

    // 21. Previous month sales
    db.invoice.aggregate({
      where: { type: 'sale', createdAt: { gte: prevMonthStart, lte: prevMonthEnd } },
      _sum: { totalAmount: true },
    }),

    // 22. Previous day expenses
    db.expense.aggregate({
      where: { date: { gte: prevDayStart, lte: prevDayEnd } },
      _sum: { amount: true },
    }),
  ])

  // ── Derived values ─────────────────────────────────────────────
  const totalSalesToday = salesAgg._sum.totalAmount ?? 0

  const totalProfitToday = todayItems.reduce(
    (sum, item) => sum + (item.price - item.product.costPrice) * item.quantity,
    0,
  )

  const profitMargin =
    totalSalesToday > 0 ? Math.round((totalProfitToday / totalSalesToday) * 1000) / 10 : 0

  const invoicesCountToday = invoiceCount
  const lowStockProducts = lowStockCount
  const totalCustomers = customerCount
  const totalSuppliers = supplierCount
  const totalProducts = productCount
  const totalExpensesToday = todayExpensesAgg._sum.amount ?? 0
  const monthlySales = monthlySalesAgg._sum.totalAmount ?? 0
  const totalExpenses = expensesAgg._sum.amount ?? 0
  const totalDebt = totalDebtAgg._sum.debt ?? 0

  // ── Trend calculations ───────────────────────────────────────
  const prevDaySales = prevDaySalesAgg._sum.totalAmount ?? 0
  const prevDayInvoices = prevDayInvoiceCount
  const prevMonthSales = prevMonthSalesAgg._sum.totalAmount ?? 0
  const prevDayExpenses = prevDayExpensesAgg._sum.amount ?? 0

  // Previous day profit
  const prevDayProfit = prevDayItemsAgg.reduce(
    (sum, item) => sum + (item.price - item.product.costPrice) * item.quantity,
    0,
  )

  // Helper: calculate trend percentage
  function calcTrend(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0
    return Math.round(((current - previous) / previous) * 1000) / 10
  }

  // Top 3 products (resolve names from the items already fetched)
  const productIdToName = new Map<string, string>()
  for (const item of todayItems) {
    if (!productIdToName.has(item.productId)) {
      productIdToName.set(item.productId, item.product.name)
    }
  }

  const topProducts = topProductGroups.map((g) => ({
    name: productIdToName.get(g.productId) ?? '—',
    quantity: g._sum.quantity ?? 0,
  }))

  // Recent activity
  const recentActivity = recentLogs.map((log) => {
    let details: Record<string, unknown> | null = null
    try {
      details = log.details ? JSON.parse(log.details) : null
    } catch {
      details = null
    }
    return {
      id: log.id,
      action: log.action,
      entity: log.entity,
      details,
      userName: log.userName,
      createdAt: log.createdAt.toISOString(),
    }
  })

  // Sales target progress
  let salesTargetProgress: number | null = null
  if (activeTargets) {
    const current = monthlySales
    salesTargetProgress =
      activeTargets.targetAmount > 0
        ? Math.min(Math.round((current / activeTargets.targetAmount) * 1000) / 10, 100)
        : 0
  }

  // ── Additional stats ────────────────────────────────────────
  const itemsSoldToday = itemsSoldTodayAgg._sum.quantity ?? 0
  const averageSaleToday = invoicesCountToday > 0 ? Math.round((totalSalesToday / invoicesCountToday) * 100) / 100 : 0

  // Top customer name (resolved from the JOIN query — no N+1)
  const topCustomerTodayName = topCustomerRow.length > 0 ? topCustomerRow[0].customerName : null

  return successResponse({
    // Existing fields (backward compatible)
    totalSalesToday,
    totalProfitToday,
    profitMargin,
    invoicesCountToday,
    lowStockProducts,
    totalCustomers,
    totalExpensesToday,
    topProducts,
    recentActivity,
    salesTargetProgress,

    // Additional fields
    totalProducts,
    totalSuppliers,
    totalDebt,
    monthlySales,
    totalExpenses,

    // Extra stats
    topCustomerTodayName,
    itemsSoldToday,
    averageSaleToday,

    // ── Trend data (NEW) ────────────────────────────────────
    trends: {
      salesToday: {
        value: totalSalesToday,
        previous: prevDaySales,
        change: calcTrend(totalSalesToday, prevDaySales),
        period: 'يوم أمس',
      },
      profitToday: {
        value: totalProfitToday,
        previous: prevDayProfit,
        change: calcTrend(totalProfitToday, prevDayProfit),
        period: 'يوم أمس',
      },
      invoicesToday: {
        value: invoicesCountToday,
        previous: prevDayInvoices,
        change: calcTrend(invoicesCountToday, prevDayInvoices),
        period: 'يوم أمس',
      },
      monthlySales: {
        value: monthlySales,
        previous: prevMonthSales,
        change: calcTrend(monthlySales, prevMonthSales),
        period: 'الشهر الماضي',
      },
      expensesToday: {
        value: totalExpensesToday,
        previous: prevDayExpenses,
        change: calcTrend(totalExpensesToday, prevDayExpenses),
        period: 'يوم أمس',
      },
    },
  })
}, 'فشل في تحميل الإحصائيات السريعة'), { requireAdmin: true })
