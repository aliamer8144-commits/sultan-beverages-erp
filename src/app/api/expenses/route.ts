import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── GET: List expenses with filters + summary stats ─────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
    const category = searchParams.get('category') || ''
    const dateFrom = searchParams.get('dateFrom') || ''
    const dateTo = searchParams.get('dateTo') || ''
    const search = searchParams.get('search') || ''

    // Build where clause
    const where: Record<string, unknown> = {}
    if (category) where.category = category
    if (dateFrom || dateTo) {
      where.date = {} as Record<string, unknown>
      if (dateFrom) (where.date as Record<string, unknown>).gte = new Date(dateFrom)
      if (dateTo) (where.date as Record<string, unknown>).lte = new Date(dateTo + 'T23:59:59.999')
    }
    if (search) {
      where.description = { contains: search }
    }

    // Fetch paginated expenses
    const [expenses, total] = await Promise.all([
      db.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.expense.count({ where }),
    ])

    // ── Summary Stats ──────────────────────────────────────────────
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999)

    // Week stats
    const dayOfWeek = now.getDay()
    const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
    const startOfWeek = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0)
    const endOfWeek = new Date(now.getFullYear(), now.getMonth(), diff + 6, 23, 59, 59, 999)

    const [totalExpensesResult, todayExpensesResult, thisWeekExpensesResult, thisMonthExpensesResult, categoryBreakdown] = await Promise.all([
      // Total all-time expenses
      db.expense.aggregate({ _sum: { amount: true } }),
      // Today expenses
      db.expense.aggregate({
        where: { date: { gte: startOfDay, lte: endOfDay } },
        _sum: { amount: true },
      }),
      // This week expenses
      db.expense.aggregate({
        where: { date: { gte: startOfWeek, lte: endOfWeek } },
        _sum: { amount: true },
      }),
      // This month expenses
      db.expense.aggregate({
        where: { date: { gte: startOfMonth, lte: endOfMonth } },
        _sum: { amount: true },
      }),
      // By category
      db.expense.groupBy({
        by: ['category'],
        _sum: { amount: true },
        _count: { id: true },
        orderBy: { _sum: { amount: 'desc' } },
      }),
    ])

    // Monthly trend (last 6 months)
    const monthlyTrend: { month: string; total: number }[] = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const mStart = new Date(d.getFullYear(), d.getMonth(), 1)
      const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999)
      const monthName = d.toLocaleDateString('ar-SA', { month: 'short' })

      const result = await db.expense.aggregate({
        where: { date: { gte: mStart, lte: mEnd } },
        _sum: { amount: true },
      })

      monthlyTrend.push({
        month: monthName,
        total: Math.round((result._sum.amount ?? 0) * 100) / 100,
      })
    }

    // ── Daily Trend (last 30 days) ────────────────────────────────
    const dailyTrend: { date: string; total: number }[] = []
    for (let i = 29; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dayStart = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 0, 0, 0, 0)
      const dayEnd = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)
      const dayLabel = d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })

      const result = await db.expense.aggregate({
        where: { date: { gte: dayStart, lte: dayEnd } },
        _sum: { amount: true },
      })

      dailyTrend.push({
        date: dayLabel,
        total: Math.round((result._sum.amount ?? 0) * 100) / 100,
      })
    }

    // ── Recurring Expenses Summary ─────────────────────────────────
    const recurringExpenses = await db.expense.findMany({
      where: { recurring: true },
      orderBy: { date: 'desc' },
      distinct: ['category'],
    })

    const recurringSummary = recurringExpenses.map((e) => {
      let nextDue: Date
      switch (e.recurringPeriod) {
        case 'daily':
          nextDue = new Date()
          nextDue.setDate(nextDue.getDate() + 1)
          break
        case 'weekly':
          nextDue = new Date()
          nextDue.setDate(nextDue.getDate() + 7)
          break
        case 'monthly':
          nextDue = new Date()
          nextDue.setMonth(nextDue.getMonth() + 1)
          break
        default:
          nextDue = new Date(e.date)
      }

      return {
        id: e.id,
        category: e.category,
        amount: Math.round(e.amount * 100) / 100,
        description: e.description,
        recurringPeriod: e.recurringPeriod,
        nextDueDate: nextDue.toISOString(),
      }
    })

    const totalExpenses = Math.round((totalExpensesResult._sum.amount ?? 0) * 100) / 100
    const todayExpenses = Math.round((todayExpensesResult._sum.amount ?? 0) * 100) / 100
    const thisWeekExpenses = Math.round((thisWeekExpensesResult._sum.amount ?? 0) * 100) / 100
    const thisMonthExpenses = Math.round((thisMonthExpensesResult._sum.amount ?? 0) * 100) / 100
    const topCategory = categoryBreakdown.length > 0 ? categoryBreakdown[0].category : null

    const totalByCategory = categoryBreakdown.map((c) => ({
      category: c.category,
      total: Math.round((c._sum.amount ?? 0) * 100) / 100,
      count: c._count.id,
    }))

    // Average daily expense (last 30 days total / 30)
    const last30Total = dailyTrend.reduce((sum, d) => sum + d.total, 0)
    const averageDailyExpense = Math.round((last30Total / 30) * 100) / 100

    return NextResponse.json({
      success: true,
      data: {
        expenses: expenses.map((e) => ({
          ...e,
          amount: Math.round(e.amount * 100) / 100,
        })),
        total,
        totalPages: Math.ceil(total / limit),
        page,
        summary: {
          totalExpenses,
          todayExpenses,
          thisWeekExpenses,
          thisMonthExpenses,
          topCategory,
          totalByCategory,
          monthlyTrend,
          dailyTrend,
          recurringSummary,
          averageDailyExpense,
        },
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load expenses'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ── POST: Create new expense ────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { category, amount, description, date, recurring, recurringPeriod, userId, userName } = body

    if (!category || !amount || !description || !userId) {
      return NextResponse.json(
        { success: false, error: 'الرجاء تعبئة جميع الحقول المطلوبة' },
        { status: 400 }
      )
    }

    if (amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'المبلغ يجب أن يكون أكبر من صفر' },
        { status: 400 }
      )
    }

    const expense = await db.expense.create({
      data: {
        category,
        amount: Math.round(amount * 100) / 100,
        description,
        date: date ? new Date(date) : new Date(),
        recurring: recurring || false,
        recurringPeriod: recurring ? recurringPeriod : null,
        userId,
        userName: userName || null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...expense,
        amount: Math.round(expense.amount * 100) / 100,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ── PATCH: Toggle recurring status ──────────────────────────────────
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, recurring, recurringPeriod } = body

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف المصروف مطلوب' },
        { status: 400 }
      )
    }

    const expense = await db.expense.update({
      where: { id },
      data: {
        recurring: recurring ?? false,
        recurringPeriod: recurring ? recurringPeriod : null,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        ...expense,
        amount: Math.round(expense.amount * 100) / 100,
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ── DELETE: Delete expense by id ────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف المصروف مطلوب' },
        { status: 400 }
      )
    }

    await db.expense.delete({ where: { id } })

    return NextResponse.json({ success: true, message: 'تم حذف المصروف بنجاح' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete expense'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
