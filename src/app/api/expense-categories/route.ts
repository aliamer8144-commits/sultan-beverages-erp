import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse, serverError } from '@/lib/api-response'
import { validateBody } from '@/lib/validations'
import { createExpenseCategorySchema, updateExpenseCategorySchema } from '@/lib/validations'
import { logAction } from '@/lib/audit-logger'

const DEFAULT_CATEGORIES = [
  { name: 'إيجار', icon: 'Home', color: '#3b82f6', monthlyBudget: 500000 },
  { name: 'رواتب', icon: 'Users', color: '#22c55e', monthlyBudget: 2000000 },
  { name: 'كهرباء وماء', icon: 'Zap', color: '#f59e0b', monthlyBudget: 200000 },
  { name: 'صيانة', icon: 'Wrench', color: '#8b5cf6', monthlyBudget: 300000 },
  { name: 'نقل ونقل', icon: 'Truck', color: '#f97316', monthlyBudget: 150000 },
  { name: 'مستلزمات', icon: 'Package', color: '#14b8a6', monthlyBudget: 400000 },
  { name: 'متنوع', icon: 'MoreHorizontal', color: '#6b7280', monthlyBudget: 100000 },
]

export const GET = withAuth(async () => {
  try {
    const categories = await db.expenseCategory.findMany({
      include: { _count: { select: { expenses: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return successResponse(categories)
  } catch {
    return serverError('فشل في تحميل فئات المصروفات')
  }
})

export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const user = getRequestUser(request)
    const userId = user?.userId || ''
    const userName = user?.username

    const validation = validateBody(createExpenseCategorySchema, body)
    if (!validation.success) {
      return errorResponse(validation.error)
    }

    const { name, description, icon, color, monthlyBudget, isActive } = validation.data

    const category = await db.expenseCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        icon: icon || 'Receipt',
        color: color || '#6366f1',
        monthlyBudget: monthlyBudget ? Number(monthlyBudget) : null,
        isActive: isActive !== undefined ? isActive : true,
      },
      include: { _count: { select: { expenses: true } } },
    })

    await logAction({
      action: 'create',
      entity: 'ExpenseCategory',
      entityId: category.id,
      userId,
      userName,
      details: { name: category.name, icon: category.icon, color: category.color },
    })

    return successResponse(category, 201)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return errorResponse('هذه الفئة موجودة بالفعل', 409)
    }
    if (error instanceof Error) {
      return errorResponse(error.message)
    }
    return serverError('فشل في إنشاء فئة المصروفات')
  }
})

export const PUT = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const user = getRequestUser(request)
    const userId = user?.userId || ''
    const userName = user?.username

    const validation = validateBody(updateExpenseCategorySchema, body)
    if (!validation.success) {
      return errorResponse(validation.error)
    }

    const { id, name, description, icon, color, monthlyBudget, isActive } = validation.data

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name.trim()
    if (description !== undefined) data.description = description?.trim() || null
    if (icon !== undefined) data.icon = icon
    if (color !== undefined) data.color = color
    if (monthlyBudget !== undefined) data.monthlyBudget = monthlyBudget ? Number(monthlyBudget) : null
    if (isActive !== undefined) data.isActive = isActive

    const category = await db.expenseCategory.update({
      where: { id },
      data,
      include: { _count: { select: { expenses: true } } },
    })

    await logAction({
      action: 'update',
      entity: 'ExpenseCategory',
      entityId: id,
      userId,
      userName,
      details: data,
    })

    return successResponse(category)
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return errorResponse('هذه الفئة موجودة بالفعل', 409)
    }
    if (error instanceof Error) {
      return errorResponse(error.message)
    }
    return serverError('فشل في تحديث فئة المصروفات')
  }
})

export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const user = getRequestUser(request)
    const userId = user?.userId || ''
    const userName = user?.username

    const body = await request.json()
    const { id } = body

    if (!id) {
      return errorResponse('معرف الفئة مطلوب')
    }

    const expenseCount = await db.expense.count({ where: { categoryId: id } })
    if (expenseCount > 0) {
      return errorResponse(`لا يمكن حذف هذه الفئة لأنها مرتبطة بـ ${expenseCount} مصروف`)
    }

    await db.expenseCategory.delete({ where: { id } })

    await logAction({
      action: 'delete',
      entity: 'ExpenseCategory',
      entityId: id,
      userId,
      userName,
    })

    return successResponse({ message: 'تم حذف الفئة بنجاح' })
  } catch (error) {
    if (error instanceof Error) {
      return errorResponse(error.message)
    }
    return serverError('فشل في حذف فئة المصروفات')
  }
})
