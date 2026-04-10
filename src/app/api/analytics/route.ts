import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const range = searchParams.get('range') || '30'

    // Calculate date range
    const now = new Date()
    let startDate = new Date()
    let days = 30

    switch (range) {
      case '7':
        days = 7
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7)
        break
      case '30':
        days = 30
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
        break
      case '90':
        days = 90
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30)
        days = 30
    }

    // Fetch all sale invoices within the date range with items
    const invoices = await db.invoice.findMany({
      where: {
        type: 'sale',
        createdAt: { gte: startDate },
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

    // ─── 1. Sales Trend (daily) ─────────────────────────────────────
    const dailyMap = new Map<string, { total: number; profit: number; count: number }>()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      dailyMap.set(key, { total: 0, profit: 0, count: 0 })
    }

    for (const inv of invoices) {
      const key = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, '0')}-${String(inv.createdAt.getDate()).padStart(2, '0')}`
      const entry = dailyMap.get(key)
      if (entry) {
        entry.total += inv.totalAmount
        entry.count += 1
        // Calculate profit per invoice
        for (const item of inv.items) {
          entry.profit += (item.price - item.product.costPrice) * item.quantity
        }
      }
    }

    const salesTrend = Array.from(dailyMap.entries()).map(([date, data]) => ({
      date,
      total: Math.round(data.total * 100) / 100,
      profit: Math.round(data.profit * 100) / 100,
      count: data.count,
    }))

    // ─── 2. Profit Margins (daily) ─────────────────────────────────
    const profitMargins = salesTrend.map((d) => ({
      date: d.date,
      margin: d.total > 0 ? Math.round((d.profit / d.total) * 10000) / 100 : 0,
    }))

    // ─── 3. Top Products by Revenue ────────────────────────────────
    const productMap = new Map<string, { name: string; quantity: number; revenue: number; profit: number }>()

    for (const inv of invoices) {
      for (const item of inv.items) {
        const existing = productMap.get(item.productId)
        const itemRevenue = item.price * item.quantity
        const itemProfit = (item.price - item.product.costPrice) * item.quantity
        if (existing) {
          existing.quantity += item.quantity
          existing.revenue += itemRevenue
          existing.profit += itemProfit
        } else {
          productMap.set(item.productId, {
            name: item.product.name,
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

    // ─── 4. Category Performance ──────────────────────────────────
    const categoryMap = new Map<string, { name: string; sales: number; profit: number; count: number }>()

    for (const inv of invoices) {
      for (const item of inv.items) {
        const catName = item.product.category?.name ?? 'أخرى'
        const existing = categoryMap.get(catName)
        const itemRevenue = item.price * item.quantity
        const itemProfit = (item.price - item.product.costPrice) * item.quantity
        if (existing) {
          existing.sales += itemRevenue
          existing.profit += itemProfit
          existing.count += item.quantity
        } else {
          categoryMap.set(catName, { name: catName, sales: itemRevenue, profit: itemProfit, count: item.quantity })
        }
      }
    }

    const categoryPerformance = Array.from(categoryMap.values())
      .map((c) => ({
        ...c,
        sales: Math.round(c.sales * 100) / 100,
        profit: Math.round(c.profit * 100) / 100,
        margin: c.sales > 0 ? Math.round((c.profit / c.sales) * 10000) / 100 : 0,
      }))
      .sort((a, b) => b.sales - a.sales)

    // ─── 5. Customer Ranking ──────────────────────────────────────
    const customerMap = new Map<string, { name: string; total: number; invoiceCount: number; debt: number }>()

    // Get all customer debts
    const allCustomers = await db.customer.findMany({
      select: { id: true, name: true, debt: true },
    })
    for (const cust of allCustomers) {
      customerMap.set(cust.id, { name: cust.name, total: 0, invoiceCount: 0, debt: cust.debt })
    }

    for (const inv of invoices) {
      if (inv.customerId) {
        const existing = customerMap.get(inv.customerId)
        if (existing) {
          existing.total += inv.totalAmount
          existing.invoiceCount += 1
        } else if (inv.customer) {
          customerMap.set(inv.customerId, {
            name: inv.customer.name,
            total: inv.totalAmount,
            invoiceCount: 1,
            debt: 0,
          })
        }
      }
    }

    // Add walk-in as well
    const walkInTotal = invoices
      .filter((inv) => !inv.customerId)
      .reduce((sum, inv) => sum + inv.totalAmount, 0)

    const customerRanking = Array.from(customerMap.values())
      .map((c) => ({
        ...c,
        total: Math.round(c.total * 100) / 100,
        debt: Math.round(c.debt * 100) / 100,
      }))
      .filter((c) => c.total > 0)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // ─── 6. Hourly Sales ──────────────────────────────────────────
    const hourlyMap = new Map<number, { totalSales: number; totalCount: number; days: Set<string> }>()
    for (let h = 0; h < 24; h++) {
      hourlyMap.set(h, { totalSales: 0, totalCount: 0, days: new Set() })
    }

    const totalDays = new Set<string>()
    for (const inv of invoices) {
      const hour = inv.createdAt.getHours()
      const dayKey = `${inv.createdAt.getFullYear()}-${String(inv.createdAt.getMonth() + 1).padStart(2, '0')}-${String(inv.createdAt.getDate()).padStart(2, '0')}`
      const entry = hourlyMap.get(hour)
      if (entry) {
        entry.totalSales += inv.totalAmount
        entry.totalCount += 1
        entry.days.add(dayKey)
      }
      totalDays.add(dayKey)
    }

    const numDays = totalDays.size || 1
    const hourlySales = Array.from(hourlyMap.entries()).map(([hour, data]) => ({
      hour,
      avgSales: Math.round((data.totalSales / numDays) * 100) / 100,
      avgCount: Math.round((data.totalCount / numDays) * 100) / 100,
    }))

    // ─── 7. Payment Methods ──────────────────────────────────────
    let cashCount = 0
    let cashTotal = 0
    let creditCount = 0
    let creditTotal = 0

    for (const inv of invoices) {
      if (inv.paidAmount >= inv.totalAmount) {
        cashCount += 1
        cashTotal += inv.totalAmount
      } else {
        creditCount += 1
        creditTotal += inv.totalAmount
      }
    }

    const paymentMethods = {
      cash: {
        count: cashCount,
        total: Math.round(cashTotal * 100) / 100,
      },
      credit: {
        count: creditCount,
        total: Math.round(creditTotal * 100) / 100,
      },
    }

    // ─── 8. Slow Moving Products ─────────────────────────────────
    // Find all products and their last sale date
    const allProducts = await db.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        quantity: true,
        invoiceItems: {
          include: { invoice: { select: { createdAt: true, type: true } } },
        },
      },
    })

    const slowMovingProducts = allProducts
      .map((p) => {
        const saleItems = p.invoiceItems.filter((item) => item.invoice.type === 'sale')
        const totalSold = saleItems.reduce((sum, item) => sum + item.quantity, 0)
        let daysSinceLastSale = 999

        if (saleItems.length > 0) {
          const lastSale = saleItems.reduce((latest, item) => {
            return item.invoice.createdAt > latest ? item.invoice.createdAt : latest
          }, saleItems[0].invoice.createdAt)
          daysSinceLastSale = Math.floor(
            (now.getTime() - lastSale.getTime()) / (1000 * 60 * 60 * 24)
          )
        }

        return {
          name: p.name,
          quantity: p.quantity,
          sold: totalSold,
          daysSinceLastSale,
        }
      })
      .filter((p) => p.daysSinceLastSale >= 7 && p.quantity > 0)
      .sort((a, b) => b.daysSinceLastSale - a.daysSinceLastSale)
      .slice(0, 10)

    // ─── 9. Inventory Turnover ───────────────────────────────────
    const allProductsFull = await db.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, quantity: true, costPrice: true, price: true, category: { select: { name: true } } },
    })

    const totalInventoryValue = allProductsFull.reduce((sum, p) => sum + p.quantity * p.costPrice, 0)
    const avgInventoryValue = numDays > 0 ? totalInventoryValue : totalInventoryValue

    // Total cost of goods sold
    let totalCOGS = 0
    for (const inv of invoices) {
      for (const item of inv.items) {
        totalCOGS += item.product.costPrice * item.quantity
      }
    }

    const inventoryTurnover = avgInventoryValue > 0 ? Math.round((totalCOGS / avgInventoryValue) * 100) / 100 : 0
    const daysToSellInventory = inventoryTurnover > 0 ? Math.round((numDays / inventoryTurnover) * 10) / 10 : 0

    const inventoryTurnoverByCategory = new Map<string, { name: string; turnover: number; value: number; cogs: number }>()
    for (const inv of invoices) {
      for (const item of inv.items) {
        const catName = item.product.category?.name ?? 'أخرى'
        const existing = inventoryTurnoverByCategory.get(catName)
        const itemCOGS = item.product.costPrice * item.quantity
        if (existing) {
          existing.cogs += itemCOGS
        } else {
          inventoryTurnoverByCategory.set(catName, { name: catName, turnover: 0, value: 0, cogs: itemCOGS })
        }
      }
    }

    // Calculate inventory value per category
    for (const p of allProductsFull) {
      const catName = p.category?.name ?? 'أخرى'
      const existing = inventoryTurnoverByCategory.get(catName)
      if (existing) {
        existing.value += p.quantity * p.costPrice
      } else {
        inventoryTurnoverByCategory.set(catName, { name: catName, turnover: 0, value: p.quantity * p.costPrice, cogs: 0 })
      }
    }

    const inventoryTurnoverData = Array.from(inventoryTurnoverByCategory.values())
      .map((c) => ({
        ...c,
        turnover: c.value > 0 ? Math.round((c.cogs / c.value) * 100) / 100 : 0,
        value: Math.round(c.value * 100) / 100,
        cogs: Math.round(c.cogs * 100) / 100,
      }))
      .sort((a, b) => b.turnover - a.turnover)

    return NextResponse.json({
      success: true,
      data: {
        salesTrend,
        topProducts,
        categoryPerformance,
        customerRanking,
        hourlySales,
        paymentMethods,
        slowMovingProducts,
        profitMargins,
        inventoryTurnover: {
          overall: inventoryTurnover,
          daysToSellInventory,
          totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
          totalCOGS: Math.round(totalCOGS * 100) / 100,
          byCategory: inventoryTurnoverData,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load analytics data'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
