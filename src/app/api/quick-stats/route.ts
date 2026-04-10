import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ─── GET: Aggregated quick-stats for the floating panel ─────────────
export async function GET() {
  try {
    const startOfDay = new Date(new Date().setHours(0, 0, 0, 0))

    // Run all independent queries in parallel
    const [
      salesAgg,
      todayItems,
      invoiceCount,
      lowStockCount,
      customerCount,
      expensesAgg,
      topProductGroups,
      recentLogs,
      activeTargets,
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

      // 6. Today's expenses
      db.expense.aggregate({
        where: { date: { gte: startOfDay } },
        _sum: { amount: true },
      }),

      // 7. Top products by quantity sold today
      db.invoiceItem.groupBy({
        by: ['productId'],
        where: { invoice: { type: 'sale', createdAt: { gte: startOfDay } } },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 5,
      }),

      // 8. Recent activity (last 10 audit log entries)
      db.auditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),

      // 9. Active sales target (monthly)
      db.salesTarget.findFirst({
        where: {
          isActive: true,
          type: 'monthly',
          OR: [{ endDate: null }, { endDate: { gt: new Date() } }],
        },
        orderBy: { createdAt: 'desc' },
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

    const totalExpensesToday = expensesAgg._sum.amount ?? 0

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
      const now = new Date()
      const rangeStart = new Date(now.getFullYear(), now.getMonth(), 1)
      const rangeEnd = new Date(now)

      const monthSales = await db.invoice.aggregate({
        _sum: { totalAmount: true },
        where: {
          type: 'sale',
          createdAt: { gte: rangeStart, lte: rangeEnd },
        },
      })

      const current = monthSales._sum.totalAmount ?? 0
      salesTargetProgress =
        activeTargets.targetAmount > 0
          ? Math.min(Math.round((current / activeTargets.targetAmount) * 1000) / 10, 100)
          : 0
    }

    return NextResponse.json({
      success: true,
      data: {
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
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load quick stats'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
