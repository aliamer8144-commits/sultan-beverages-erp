import { db } from "@/lib/db"
import { tryCatch } from "@/lib/api-error-handler"
import { errorResponse, successResponse } from "@/lib/api-response"
import { withAuth, getRequestUser } from "@/lib/auth-middleware"

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Used by the frontend to verify session validity on page load.
 *
 * Protected with withAuth (auth token already validated) but we still
 * query the DB for the latest user state (e.g. isActive may have changed).
 */
export const GET = withAuth(
  tryCatch(async (request) => {
    const authUser = getRequestUser(request)

    if (!authUser) {
      return errorResponse("غير مصرح", 401)
    }

    const dbUser = await db.user.findUnique({
      where: { id: authUser.userId },
      select: { id: true, username: true, name: true, role: true, isActive: true },
    })

    if (!dbUser || !dbUser.isActive) {
      return errorResponse("الحساب غير موجود أو معطل", 401)
    }

    return successResponse(dbUser)
  }, "فشل في تحميل بيانات المستخدم")
)
