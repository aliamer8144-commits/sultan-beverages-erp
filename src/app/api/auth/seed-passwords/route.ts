import { db } from "@/lib/db"
import { hashPassword } from "@/lib/auth"
import { tryCatch } from "@/lib/api-error-handler"
import { successResponse } from "@/lib/api-response"
import { withAuth } from "@/lib/auth-middleware"

/**
 * POST /api/auth/seed-passwords
 *
 * One-time migration endpoint: hashes all plaintext passwords in the DB.
 * Run once after deploying the auth system, then delete this file.
 *
 * Protected with admin-only auth so it can't be called by non-admin users.
 */
export const POST = withAuth(
  tryCatch(async () => {
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
