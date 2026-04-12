import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse } from '@/lib/api-response'
import { validateBody } from '@/lib/validations'
import { createExpenseSchema, updateExpenseSchema } from '@/lib/validations'
import { logAction } from '@/lib/audit-logger'
import { tryCatch } from '@/lib/api-error-handler'

// ── GET: List expenses with filters + summary stats ─────────────────
export const GET = withAuth(tryCatch(async (request) => {
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

  // Monthly trend (last 6 months) + Daily trend (last 30 days) + Recurring
  const monthlyStart = new Date()
  monthlyStart.setMonth(monthlyStart.getMonth() - 5)
  monthlyStart.setDate(1)
  monthlyStart.setHours(0, 0, 0, 0)

  const dailyStart = new Date()
  dailyStart.setDate(dailyStart.getDate() - 29)
  dailyStart.setHours(0, 0, 0, 0)

  const [monthlyRaw, dailyRaw, recurringExpenses] = await Promise.all([
    db.expense.groupBy({
      by: ['date'],
      where: { date: { gte: monthlyStart } },
      _sum: { amount: true },
    }),
    db.expense.groupBy({
      by: ['date'],
      where: { date: { gte: dailyStart } },
      _sum: { amount: true },
    }),
    db.expense.findMany({
      where: { recurring: true },
      orderBy: { date: 'desc' },
      distinct: ['category'],
    }),
  ])

  // Build monthly trend from groupBy result
  const monthlyMap = new Map<string, number>()
  for (const row of monthlyRaw) {
    const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}`
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + (row._sum.amount ?? 0))
  }

  const monthlyTrend: { month: string; total: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date()
    d.setMonth(d.getMonth() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    const monthName = d.toLocaleDateString('ar-SA', { month: 'short' })
    monthlyTrend.push({
      month: monthName,
      total: Math.round((monthlyMap.get(key) ?? 0) * 100) / 100,
    })
  }

  // Build daily trend from groupBy result
  const dailyMap = new Map<string, number>()
  for (const row of dailyRaw) {
    const key = `${row.date.getFullYear()}-${String(row.date.getMonth() + 1).padStart(2, '0')}-${String(row.date.getDate()).padStart(2, '0')}`
    dailyMap.set(key, (dailyMap.get(key) ?? 0) + (row._sum.amount ?? 0))
  }

  const dailyTrend: { date: string; total: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    const dayLabel = d.toLocaleDateString('ar-SA', { month: 'short', day: 'numeric' })
    dailyTrend.push({
      date: dayLabel,
      total: Math.round((dailyMap.get(key) ?? 0) * 100) / 100,
    })
  }

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

  return successResponse({
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
  })
}, 'فشل في تحميل المصروفات'))

// ── POST: Create new expense ────────────────────────────────────────
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const user = getRequestUser(request)
  const userId = user?.userId || ''
  const userName = user?.username

  const validation = validateBody(createExpenseSchema, body)
  if (!validation.success) {
    return errorResponse(validation.error)
  }

  const { category, amount, description, date, recurring, recurringPeriod } = validation.data

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

  await logAction({
    action: 'create',
    entity: 'Expense',
    entityId: expense.id,
    userId,
    userName,
    details: { category, amount: expense.amount, description, recurring },
  })

  return successResponse({
    ...expense,
    amount: Math.round(expense.amount * 100) / 100,
  }, 201)
}, 'فشل في إنشاء المصروف'))

// ── PATCH: Toggle recurring status ──────────────────────────────────
export const PATCH = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const user = getRequestUser(request)
  const userId = user?.userId || ''
  const userName = user?.username

  const validation = validateBody(updateExpenseSchema, body)
  if (!validation.success) {
    return errorResponse(validation.error)
  }

  const { id, recurring, recurringPeriod } = validation.data

  const expense = await db.expense.update({
    where: { id },
    data: {
      recurring: recurring ?? false,
      recurringPeriod: recurring ? recurringPeriod : null,
    },
  })

  await logAction({
    action: 'update',
    entity: 'Expense',
    entityId: id,
    userId,
    userName,
    details: { recurring, recurringPeriod },
  })

  return successResponse({
    ...expense,
    amount: Math.round(expense.amount * 100) / 100,
  })
}, 'فشل في تحديث المصروف'))

// ── DELETE: Delete expense by id ────────────────────────────────────
export const DELETE = withAuth(tryCatch(async (request) => {
  const user = getRequestUser(request)
  const userId = user?.userId || ''
  const userName = user?.username

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')

  if (!id) {
    return errorResponse('معرف المصروف مطلوب')
  }

  await db.expense.delete({ where: { id } })

  await logAction({
    action: 'delete',
    entity: 'Expense',
    entityId: id,
    userId,
    userName,
  })

  return successResponse({ message: 'تم حذف المصروف بنجاح' })
}, 'فشل في حذف المصروف'))
