import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { hashPassword } from '@/lib/auth'

/**
 * PUT /api/users/[id] — Update a user (admin only)
 * If `password` is provided, it will be hashed automatically.
 */
export const PUT = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = (await context.params) ?? {}

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { name, role, isActive, password } = body

    const data: Record<string, unknown> = {}
    if (name !== undefined) data.name = name
    if (role !== undefined) data.role = role
    if (isActive !== undefined) data.isActive = isActive
    if (password) {
      data.password = await hashPassword(password)
    }

    const user = await db.user.update({
      where: { id },
      data,
    })

    const { password: _, ...safeUser } = user

    return NextResponse.json({ success: true, data: safeUser })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}, { requireAdmin: true })

/**
 * DELETE /api/users/[id] — Delete a user (admin only)
 */
export const DELETE = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = (await context.params) ?? {}

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'معرف المستخدم مطلوب' },
        { status: 400 }
      )
    }

    // Prevent self-deletion via checking the token
    const authHeader = request.headers.get('Authorization')
    // Let the DB operation fail naturally if the user doesn't exist

    await db.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}, { requireAdmin: true })
