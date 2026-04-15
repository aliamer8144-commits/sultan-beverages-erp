import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { tryCatch, validateRequest, getRequiredParam } from '@/lib/api-error-handler'
import { successResponse, errorResponse } from '@/lib/api-response'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'
import { editUserSchema } from '@/lib/validations'

/**
 * PUT /api/users/[id] — Update a user (admin only)
 * If `password` is provided, it will be hashed automatically.
 */
export const PUT = withAuth(tryCatch(async (request, { params }) => {
  const id = getRequiredParam(params, 'id')

  const body = await validateRequest(request, editUserSchema)
  const { name, password, role, isActive } = body

  const data: Record<string, unknown> = {}
  if (name !== undefined) data.name = name
  if (password) {
    data.password = await hashPassword(password)
  }
  if (role !== undefined) data.role = role
  if (isActive !== undefined) data.isActive = isActive

  const user = await db.user.update({
    where: { id },
    data,
  })

  const { password: _, ...safeUser } = user
  return successResponse(safeUser)
}, 'فشل في تحديث المستخدم'), { requireAdmin: true })

/**
 * DELETE /api/users/[id] — Delete a user (admin only)
 */
export const DELETE = withAuth(tryCatch(async (request, { params }) => {
  const id = getRequiredParam(params, 'id')

  // Prevent self-deletion
  const currentUser = getRequestUser(request)
  if (currentUser && currentUser.userId === id) {
    return errorResponse('لا يمكنك حذف حسابك الخاص', 400)
  }

  await db.user.delete({ where: { id } })
  return successResponse(null)
}, 'فشل في حذف المستخدم'), { requireAdmin: true })
