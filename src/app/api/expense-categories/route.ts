import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

const DEFAULT_CATEGORIES = [
  { name: 'إيجار', icon: 'Home', color: '#3b82f6', monthlyBudget: 500000 },
  { name: 'رواتب', icon: 'Users', color: '#22c55e', monthlyBudget: 2000000 },
  { name: 'كهرباء وماء', icon: 'Zap', color: '#f59e0b', monthlyBudget: 200000 },
  { name: 'صيانة', icon: 'Wrench', color: '#8b5cf6', monthlyBudget: 300000 },
  { name: 'نقل ونقل', icon: 'Truck', color: '#f97316', monthlyBudget: 150000 },
  { name: 'مستلزمات', icon: 'Package', color: '#14b8a6', monthlyBudget: 400000 },
  { name: 'متنوع', icon: 'MoreHorizontal', color: '#6b7280', monthlyBudget: 100000 },
]

export async function GET() {
  try {
    const categories = await db.expenseCategory.findMany({
      include: { _count: { select: { expenses: true } } },
      orderBy: { createdAt: 'asc' },
    })

    return NextResponse.json({ success: true, data: categories })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load expense categories'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, description, icon, color, monthlyBudget, isActive } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'يرجى إدخال اسم الفئة' }, { status: 400 })
    }

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

    return NextResponse.json({ success: true, data: category }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create expense category'
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ success: false, error: 'هذه الفئة موجودة بالفعل' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, description, icon, color, monthlyBudget, isActive } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الفئة مطلوب' }, { status: 400 })
    }

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

    return NextResponse.json({ success: true, data: category })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update expense category'
    if (message.includes('Unique constraint')) {
      return NextResponse.json({ success: false, error: 'هذه الفئة موجودة بالفعل' }, { status: 409 })
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ success: false, error: 'معرف الفئة مطلوب' }, { status: 400 })
    }

    const expenseCount = await db.expense.count({ where: { categoryId: id } })
    if (expenseCount > 0) {
      return NextResponse.json(
        { success: false, error: `لا يمكن حذف هذه الفئة لأنها مرتبطة بـ ${expenseCount} مصروف` },
        { status: 400 }
      )
    }

    await db.expenseCategory.delete({ where: { id } })
    return NextResponse.json({ success: true, message: 'تم حذف الفئة بنجاح' })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete expense category'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
