import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import { tryCatch } from "@/lib/api-error-handler"
import { successResponse, errorResponse } from "@/lib/api-response"
import { withAuth } from "@/lib/auth-middleware"

/**
 * POST /api/auth/seed-passwords
 *
 * Development-only endpoint: hashes all plaintext passwords in the DB.
 * DISABLED in production — returns 403.
 *
 * Note: The login endpoint now auto-hashes plaintext passwords on first use,
 * so this endpoint is only needed for bulk migration during development.
 */
export const POST = withAuth(
  tryCatch(async () => {
    // Block in production
    if (process.env.NODE_ENV === 'production') {
      return errorResponse('هذا Endpoint معطل في بيئة الإنتاج', 403)
    }

    const users = await db.user.findMany({
      select: { id: true, username: true, password: true },
    })

    const results: Array<{ username: string; hashed: boolean }> = []

    for (const user of users) {
      if (user.password.startsWith("$2")) {
        results.push({ username: user.username, hashed: false })
        continue
      }

      await db.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(user.password) },
      })
      results.push({ username: user.username, hashed: true })
    }

    return successResponse({
      message: "تمت عملية تهيئة كلمات المرور",
      processed: results.length,
      hashed: results.filter((r) => r.hashed).length,
      alreadyHashed: results.filter((r) => !r.hashed).length,
      details: results,
    })
  }, "فشل في تهيئة كلمات المرور"),
  { requireAdmin: true }
)
