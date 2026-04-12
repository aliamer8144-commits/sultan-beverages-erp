import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logAction } from "@/lib/audit-logger"
import { verifyPassword, generateToken } from "@/lib/auth"
import { setAuthCookie } from "@/lib/auth-middleware"
import { tryCatch } from "@/lib/api-error-handler"
import { errorResponse } from "@/lib/api-response"

/**
 * POST /api/auth
 * Login endpoint — public (no withAuth).
 *
 * Uses tryCatch for unified error handling and errorResponse for validation
 * errors. The success response keeps the legacy shape
 * { success, user, token } for frontend backward compatibility.
 */
export const POST = tryCatch(async (request) => {
  const body = await request.json()
  const { username, password } = body

  if (!username || !password) {
    return errorResponse("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
  }

  const user = await db.user.findUnique({ where: { username } })

  if (!user) {
    return errorResponse("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
  }

  // Check if password is plaintext (migration phase) or hashed
  const isHashed = user.password.startsWith("$2")
  const passwordValid = isHashed
    ? await verifyPassword(password, user.password)
    : user.password === password

  if (!passwordValid) {
    return errorResponse("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
  }

  if (!user.isActive) {
    return errorResponse("هذا الحساب معطل", 403)
  }

  // Generate JWT token
  const token = await generateToken({
    userId: user.id,
    username: user.username,
    role: user.role as "admin" | "cashier",
  })

  // Build success response — legacy shape for frontend backward compatibility
  // (successResponse wraps under `data`, but the frontend reads `data.user`
  //  and `data.token` directly from the top-level JSON body)
  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    },
    token,
  })

  setAuthCookie(response, token)

  // Log the login action
  logAction({
    action: "login",
    entity: "User",
    entityId: user.id,
    userName: user.name,
    details: { username: user.username },
  })

  return response
}, "حدث خطأ في تسجيل الدخول")
