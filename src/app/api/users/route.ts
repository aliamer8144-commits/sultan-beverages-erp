import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { withAuth } from '@/lib/auth-middleware'
import { hashPassword } from '@/lib/auth'

/**
 * GET /api/users — List all users (admin only)
 */
export const GET = withAuth(async () => {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const safeUsers = users.map(({ password: _, ...user }) => user)

    return NextResponse.json({ success: true, data: safeUsers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}, { requireAdmin: true })

/**
 * POST /api/users — Create a new user (admin only)
 * Password is automatically hashed.
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const { username, password, name, role } = await request.json()

    if (!username || !password || !name || !role) {
      return NextResponse.json(
        { success: false, error: 'جميع الحقول مطلوبة' },
        { status: 400 }
      )
    }

    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'اسم المستخدم موجود بالفعل' },
        { status: 409 }
      )
    }

    const hashedPassword = await hashPassword(password)

    const user = await db.user.create({
      data: { username, password: hashedPassword, name, role },
    })

    const { password: _, ...safeUser } = user

    return NextResponse.json({ success: true, data: safeUser }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}, { requireAdmin: true })
