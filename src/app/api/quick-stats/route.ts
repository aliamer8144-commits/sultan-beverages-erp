import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── GET: Aggregated quick-stats for the floating panel ─────────────
export async function GET() {
  try {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0))
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

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
      topCustomerToday,
      itemsSoldTodayAgg,
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

      // 9. Today's expenses (kept for backward compatibility)
      db.expense.aggregate({
        where: { date: { gte: startOfDay } },
        _sum: { amount: true },
      }),

      // 10. Monthly sales total
      db.invoice.aggregate({
        where: { type: 'sale', createdAt: { gte: monthStart, lte: monthEnd } },
        _sum: { totalAmount: true },
      }),

      // 11. Monthly expenses (redundant with 8 but explicit for clarity)
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

      // 16. Top customer today (by total sales)
      db.invoice.groupBy({
        by: ['customerId'],
        where: { type: 'sale', createdAt: { gte: startOfDay }, customerId: { not: null } },
        _sum: { totalAmount: true },
        orderBy: { _sum: { totalAmount: 'desc' } },
        take: 1,
      }),

      // 17. Total items sold today
      db.invoiceItem.aggregate({
        where: { invoice: { type: 'sale', createdAt: { gte: startOfDay } } },
        _sum: { quantity: true },
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

    // ── New stats ────────────────────────────────────────────────
    const itemsSoldToday = itemsSoldTodayAgg._sum.quantity ?? 0

    const averageSaleToday = invoicesCountToday > 0 ? Math.round((totalSalesToday / invoicesCountToday) * 100) / 100 : 0

    // Resolve top customer name
    let topCustomerTodayName: string | null = null
    if (topCustomerToday.length > 0 && topCustomerToday[0].customerId) {
      const topCustomer = await db.customer.findUnique({
        where: { id: topCustomerToday[0].customerId },
        select: { name: true },
      })
      topCustomerTodayName = topCustomer?.name ?? null
    }

    return NextResponse.json({
      success: true,
      data: {
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

        // New fields
        totalProducts,
        totalSuppliers,
        totalDebt,
        monthlySales,
        totalExpenses,

        // Task 12-b stats
        topCustomerTodayName,
        itemsSoldToday,
        averageSaleToday,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load quick stats'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
