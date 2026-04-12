import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logAction } from "@/lib/audit-logger"
import { verifyPassword, hashPassword, generateToken } from "@/lib/auth"
import { setAuthCookie } from "@/lib/auth-middleware"
import { checkRateLimit, LOGIN_RATE_LIMIT, LOGIN_RATE_LIMIT_SLOW } from "@/lib/rate-limit"
import { tryCatch } from "@/lib/api-error-handler"
import { errorResponse } from "@/lib/api-response"
import { z } from "zod"

// ── Validation Schema ──────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1).max(50),
  password: z.string().min(1).max(100),
})

// ── Rate Limit Key ─────────────────────────────────────────────────

function getClientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() || 'unknown'
  return `login:${ip}`
}

/**
 * POST /api/auth
 * Login endpoint — public (no withAuth).
 *
 * Security features:
 * - Zod schema validation for input sanitization
 * - Rate limiting: 5 attempts/min, 15 attempts/5min per IP
 * - Auto-hash plaintext passwords (migration)
 * - Token in httpOnly cookie only (not in response body)
 */
export const POST = tryCatch(async (request) => {
  // 1. Rate limiting check
  const clientKey = getClientKey(request)

  // Fast window: 5 per minute
  const fastCheck = checkRateLimit(clientKey, LOGIN_RATE_LIMIT)
  if (!fastCheck.success) {
    const retryAfterSec = Math.ceil((fastCheck.resetAt - Date.now()) / 1000)
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'محاولات تسجيل دخول كثيرة — يرجى الانتظار قليلاً',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec),
        },
      }
    )
  }

  // Slow window: 15 per 5 minutes
  const slowCheck = checkRateLimit(clientKey, LOGIN_RATE_LIMIT_SLOW)
  if (!slowCheck.success) {
    const retryAfterSec = Math.ceil((slowCheck.resetAt - Date.now()) / 1000)
    return new NextResponse(
      JSON.stringify({
        success: false,
        error: 'محاولات تسجيل دخول كثيرة — يرجى الانتظار عدة دقائق',
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(retryAfterSec),
        },
      }
    )
  }

  // 2. Validate input with Zod
  const body = await request.json()
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
  }

  const { username, password } = parsed.data

  // 3. Find user
  const user = await db.user.findUnique({ where: { username } })

  if (!user) {
    // Don't reveal whether the user exists
    return errorResponse("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
  }

  // 4. Verify password (auto-hash plaintext if found)
  let passwordValid: boolean

  if (user.password.startsWith("$2")) {
    // Already hashed — verify with bcrypt
    passwordValid = await verifyPassword(password, user.password)
  } else {
    // Plaintext password detected — verify and auto-hash
    passwordValid = user.password === password

    if (passwordValid) {
      // Auto-hash the plaintext password for security
      await db.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(password) },
      })
    }
  }

  if (!passwordValid) {
    return errorResponse("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
  }

  if (!user.isActive) {
    return errorResponse("هذا الحساب معطل", 403)
  }

  // 5. Generate JWT token
  const token = await generateToken({
    userId: user.id,
    username: user.username,
    role: user.role as "admin" | "cashier",
  })

  // 6. Build success response — token in httpOnly cookie ONLY
  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    },
    // Note: token is NOT included in the response body for security.
    // It's stored exclusively in the httpOnly cookie.
  })

  setAuthCookie(response, token)

  // 7. Log the login action
  logAction({
    action: "login",
    entity: "User",
    entityId: user.id,
    userName: user.name,
    details: { username: user.username },
  })

  return response
}, "حدث خطأ في تسجيل الدخول")
