import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
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

    // Fetch all sale invoices within the date range with items
    const invoices = await db.invoice.findMany({
      where: {
        type: 'sale',
        createdAt: { gte: startDate, lte: endDate },
      },
      include: {
        items: {
          include: {
            product: {
              include: { category: { select: { name: true } } },
            },
          },
        },
        customer: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'asc' },
    })

    // Fetch expenses within the date range
    const expenses = await db.expense.findMany({
      where: {
        date: { gte: startDate, lte: endDate },
      },
    })

    // ─── KPI: Total Sales, Profit, Expenses, Net Profit ───────────
    let totalSales = 0
    let totalProfit = 0
    let totalExpenses = 0

    for (const inv of invoices) {
      totalSales += inv.totalAmount
      for (const item of inv.items) {
        totalProfit += (item.price - item.product.costPrice) * item.quantity
      }
    }

    for (const exp of expenses) {
      totalExpenses += exp.amount
    }

    const netProfit = totalProfit - totalExpenses

    // ─── 1. Sales by Day ──────────────────────────────────────────
    const dailyMap = new Map<string, number>()
    const dayIter = new Date(startDate)
    while (dayIter <= endDate) {
      const key = `${dayIter.getFullYear()}-${String(dayIter.getMonth() + 1).padStart(2, '0')}-${String(dayIter.getDate()).padStart(2, '0')}`
      dailyMap.set(key, 0)
      dayIter.setDate(dayIter.getDate() + 1)
    }

    for (const inv of invoices) {
      const key = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, '0')}-${String(inv.createdAt.getDate()).padStart(2, '0')}`
      const entry = dailyMap.get(key)
      if (entry !== undefined) {
        dailyMap.set(key, entry + inv.totalAmount)
      }
    }

    const salesByDay = Array.from(dailyMap.entries()).map(([date, amount]) => ({
      date,
      amount: Math.round(amount * 100) / 100,
    }))

    // ─── 2. Sales by Category ─────────────────────────────────────
    const categoryMap = new Map<string, { category: string; amount: number; count: number }>()

    for (const inv of invoices) {
      for (const item of inv.items) {
        const catName = item.product.category?.name ?? 'أخرى'
        const existing = categoryMap.get(catName)
        const itemRevenue = item.price * item.quantity
        if (existing) {
          existing.amount += itemRevenue
          existing.count += item.quantity
        } else {
          categoryMap.set(catName, { category: catName, amount: itemRevenue, count: item.quantity })
        }
      }
    }

    const salesByCategory = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        amount: Math.round(c.amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount)

    // ─── 3. Top Products (top 10 by revenue) ─────────────────────
    const productMap = new Map<string, { name: string; category: string; quantity: number; revenue: number; profit: number }>()

    for (const inv of invoices) {
      for (const item of inv.items) {
        const existing = productMap.get(item.productId)
        const itemRevenue = item.price * item.quantity
        const itemProfit = (item.price - item.product.costPrice) * item.quantity
        const catName = item.product.category?.name ?? 'أخرى'
        if (existing) {
          existing.quantity += item.quantity
          existing.revenue += itemRevenue
          existing.profit += itemProfit
        } else {
          productMap.set(item.productId, {
            name: item.product.name,
            category: catName,
            quantity: item.quantity,
            revenue: itemRevenue,
            profit: itemProfit,
          })
        }
      }
    }

    const topProducts = Array.from(productMap.values())
      .map((p) => ({
        ...p,
        revenue: Math.round(p.revenue * 100) / 100,
        profit: Math.round(p.profit * 100) / 100,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10)

    // ─── 4. Top Customers (top 10 by spending) ──────────────────
    const customerMap = new Map<string, { name: string; totalSpent: number; invoiceCount: number }>()

    for (const inv of invoices) {
      if (inv.customerId && inv.customer) {
        const existing = customerMap.get(inv.customerId)
        if (existing) {
          existing.totalSpent += inv.totalAmount
          existing.invoiceCount += 1
        } else {
          customerMap.set(inv.customerId, {
            name: inv.customer.name,
            totalSpent: inv.totalAmount,
            invoiceCount: 1,
          })
        }
      }
    }

    const topCustomers = Array.from(customerMap.values())
      .map((c) => ({
        ...c,
        totalSpent: Math.round(c.totalSpent * 100) / 100,
      }))
      .sort((a, b) => b.totalSpent - a.totalSpent)
      .slice(0, 10)

    // ─── 5. Expense Breakdown by Category ────────────────────────
    const expenseCatMap = new Map<string, number>()

    for (const exp of expenses) {
      const existing = expenseCatMap.get(exp.category)
      if (existing !== undefined) {
        expenseCatMap.set(exp.category, existing + exp.amount)
      } else {
        expenseCatMap.set(exp.category, exp.amount)
      }
    }

    const expenseBreakdown = Array.from(expenseCatMap.entries())
      .map(([category, amount]) => ({
        category,
        amount: Math.round(amount * 100) / 100,
      }))
      .sort((a, b) => b.amount - a.amount)

    // ─── Derived KPIs ────────────────────────────────────────────
    const invoicesCount = invoices.length
    const averageInvoice = invoicesCount > 0 ? Math.round((totalSales / invoicesCount) * 100) / 100 : 0
    const netProfitPercent = totalSales > 0 ? Math.round((netProfit / totalSales) * 10000) / 100 : 0

    return NextResponse.json({
      success: true,
      data: {
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
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics data'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
