import { withAuth } from '@/lib/auth-middleware'
import { tryCatch, validateRequest } from '@/lib/api-error-handler'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { createUserSchema } from '@/lib/validations'

/**
 * GET /api/users — List all users (admin only)
 */
export const GET = withAuth(tryCatch(async () => {
  const users = await db.user.findMany({
    orderBy: { createdAt: 'desc' },
  })

  const safeUsers = users.map(({ password: _, ...user }) => user)
  return successResponse(safeUsers)
}, 'فشل في تحميل المستخدمين'), { requireAdmin: true })

/**
 * POST /api/users — Create a new user (admin only)
 * Password is automatically hashed.
 */
export const POST = withAuth(tryCatch(async (request) => {
  const body = await validateRequest(request, createUserSchema)
  const { username, password, name } = body

  const existing = await db.user.findUnique({ where: { username } })
  if (existing) {
    return errorResponse('اسم المستخدم موجود بالفعل', 409)
  }

  const hashedPassword = await hashPassword(password)

  const user = await db.user.create({
    data: { username, password: hashedPassword, name },
  })

  const { password: _, ...safeUser } = user
  return successResponse(safeUser, 201)
}, 'فشل في إنشاء المستخدم'), { requireAdmin: true })
