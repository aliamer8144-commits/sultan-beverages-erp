import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { successResponse } from '@/lib/api-response'
import { tryCatch } from '@/lib/api-error-handler'

export const revalidate = 30 // Cache for 30 seconds

export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url)
  const startDateParam = searchParams.get('startDate')
  const endDateParam = searchParams.get('endDate')
  const range = searchParams.get('range') || '30'

  const now = new Date()
  let startDate: Date
  let endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

  // If custom dates provided, use them
  if (startDateParam && endDateParam) {
    startDate = new Date(startDateParam)
    startDate.setHours(0, 0, 0, 0)
    endDate = new Date(endDateParam)
    endDate.setHours(23, 59, 59, 999)
  } else {
    // Preset range logic
    startDate = new Date()
    switch (range) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case '3months':
        startDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate())
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      case '7':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case '30':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
        break
      case '90':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
    }
  }

  // ── Parallel batch: all independent SQL aggregations ─────────────
  const [
    salesKpi,
    profitKpi,
    expenseAgg,
    salesByDayRaw,
    salesByCategoryRaw,
    topProductsRaw,
    topCustomersRaw,
    expenseBreakdownRaw,
  ] = await Promise.all([
    // KPI: Total Sales + Invoice Count
    db.$queryRaw<Array<{ totalSales: number; invoicesCount: number }>>`
      SELECT COALESCE(SUM("totalAmount"), 0)::float as "totalSales", COUNT(id)::int as "invoicesCount"
      FROM "Invoice"
      WHERE "type" = 'sale' AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
    `,

    // KPI: Total Profit (sum of (item.price - product.costPrice) * item.quantity)
    db.$queryRaw<Array<{ totalProfit: number }>>`
      SELECT COALESCE(SUM((ii.price - p."costPrice") * ii.quantity), 0)::float as "totalProfit"
      FROM "InvoiceItem" ii
      JOIN "Invoice" i ON i.id = ii."invoiceId"
      JOIN "Product" p ON p.id = ii."productId"
      WHERE i."type" = 'sale' AND i."createdAt" >= ${startDate} AND i."createdAt" <= ${endDate}
    `,

    // KPI: Total Expenses
    db.expense.aggregate({
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),

    // Sales by Day — SQL aggregation
    db.$queryRaw<Array<{ date: string; amount: number }>>`
      SELECT TO_CHAR("createdAt", 'YYYY-MM-DD') as date, COALESCE(SUM("totalAmount"), 0)::float as amount
      FROM "Invoice"
      WHERE "type" = 'sale' AND "createdAt" >= ${startDate} AND "createdAt" <= ${endDate}
      GROUP BY TO_CHAR("createdAt", 'YYYY-MM-DD')
      ORDER BY date
    `,

    // Sales by Category — SQL aggregation with product+category join
    db.$queryRaw<Array<{ category: string; amount: number; count: number }>>`
      SELECT
        COALESCE(c.name, 'أخرى') as category,
        COALESCE(SUM(ii.price * ii.quantity), 0)::float as amount,
        COALESCE(SUM(ii.quantity), 0)::int as count
      FROM "InvoiceItem" ii
      JOIN "Invoice" i ON i.id = ii."invoiceId"
      JOIN "Product" p ON p.id = ii."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE i."type" = 'sale' AND i."createdAt" >= ${startDate} AND i."createdAt" <= ${endDate}
      GROUP BY c.name
      ORDER BY amount DESC
    `,

    // Top Products (top 10 by revenue)
    db.$queryRaw<Array<{ name: string; category: string; quantity: number; revenue: number; profit: number }>>`
      SELECT
        p.name,
        COALESCE(c.name, 'أخرى') as category,
        COALESCE(SUM(ii.quantity), 0)::int as quantity,
        COALESCE(SUM(ii.price * ii.quantity), 0)::float as revenue,
        COALESCE(SUM((ii.price - p."costPrice") * ii.quantity), 0)::float as profit
      FROM "InvoiceItem" ii
      JOIN "Invoice" i ON i.id = ii."invoiceId"
      JOIN "Product" p ON p.id = ii."productId"
      LEFT JOIN "Category" c ON c.id = p."categoryId"
      WHERE i."type" = 'sale' AND i."createdAt" >= ${startDate} AND i."createdAt" <= ${endDate}
      GROUP BY p.id, p.name, c.name, p."costPrice"
      ORDER BY revenue DESC
      LIMIT 10
    `,

    // Top Customers (top 10 by spending)
    db.$queryRaw<Array<{ name: string; totalSpent: number; invoiceCount: number }>>`
      SELECT
        cu.name,
        COALESCE(SUM(i."totalAmount"), 0)::float as "totalSpent",
        COUNT(i.id)::int as "invoiceCount"
      FROM "Invoice" i
      JOIN "Customer" cu ON cu.id = i."customerId"
      WHERE i."type" = 'sale' AND i."createdAt" >= ${startDate} AND i."createdAt" <= ${endDate} AND i."customerId" IS NOT NULL
      GROUP BY cu.id, cu.name
      ORDER BY "totalSpent" DESC
      LIMIT 10
    `,

    // Expense Breakdown by Category
    db.expense.groupBy({
      by: ['category'],
      where: { date: { gte: startDate, lte: endDate } },
      _sum: { amount: true },
    }),
  ])

  // ─── Compute KPIs ───────────────────────────────────────────────
  const totalSales = Number(salesKpi[0]?.totalSales ?? 0)
  const totalProfit = Number(profitKpi[0]?.totalProfit ?? 0)
  const totalExpenses = expenseAgg._sum.amount ?? 0
  const netProfit = totalProfit - totalExpenses
  const invoicesCount = salesKpi[0]?.invoicesCount ?? 0
  const averageInvoice = invoicesCount > 0 ? Math.round((totalSales / invoicesCount) * 100) / 100 : 0
  const netProfitPercent = totalSales > 0 ? Math.round((netProfit / totalSales) * 10000) / 100 : 0

  // ─── 1. Sales by Day (fill missing dates with 0) ────────────────
  const dayMap = new Map<string, number>()
  const dayIter = new Date(startDate)
  while (dayIter <= endDate) {
    const key = `${dayIter.getFullYear()}-${String(dayIter.getMonth() + 1).padStart(2, '0')}-${String(dayIter.getDate()).padStart(2, '0')}`
    dayMap.set(key, 0)
    dayIter.setDate(dayIter.getDate() + 1)
  }

  for (const row of salesByDayRaw) {
    const entry = dayMap.get(row.date)
    if (entry !== undefined) {
      dayMap.set(row.date, entry + Number(row.amount))
    }
  }

  const salesByDay = Array.from(dayMap.entries()).map(([date, amount]) => ({
    date,
    amount: Math.round(amount * 100) / 100,
  }))

  // ─── 2. Sales by Category ───────────────────────────────────────
  const salesByCategory = salesByCategoryRaw.map((c) => ({
    category: c.category,
    amount: Math.round(Number(c.amount) * 100) / 100,
    count: c.count,
  }))

  // ─── 3. Top Products ────────────────────────────────────────────
  const topProducts = topProductsRaw.map((p) => ({
    name: p.name,
    category: p.category,
    quantity: p.quantity,
    revenue: Math.round(Number(p.revenue) * 100) / 100,
    profit: Math.round(Number(p.profit) * 100) / 100,
  }))

  // ─── 4. Top Customers ───────────────────────────────────────────
  const topCustomers = topCustomersRaw.map((c) => ({
    name: c.name,
    totalSpent: Math.round(Number(c.totalSpent) * 100) / 100,
    invoiceCount: c.invoiceCount,
  }))

  // ─── 5. Expense Breakdown ───────────────────────────────────────
  const expenseBreakdown = expenseBreakdownRaw
    .map(({ category, _sum }) => ({
      category,
      amount: Math.round((_sum.amount ?? 0) * 100) / 100,
    }))
    .sort((a, b) => b.amount - a.amount)

  return successResponse({
    totalSales: Math.round(totalSales * 100) / 100,
    totalProfit: Math.round(totalProfit * 100) / 100,
    totalExpenses: Math.round(totalExpenses * 100) / 100,
    netProfit: Math.round(netProfit * 100) / 100,
    invoicesCount,
    averageInvoice,
    netProfitPercent,
    salesByDay,
    salesByCategory,
    topProducts,
    topCustomers,
    expenseBreakdown,
  })
}, 'فشل في تحميل بيانات التحليلات'), { requireAdmin: true })
