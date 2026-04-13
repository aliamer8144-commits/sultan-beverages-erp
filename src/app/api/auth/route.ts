import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logAction } from "@/lib/audit-logger"
import { verifyPassword, hashPassword, generateToken } from "@/lib/auth"
import { setAuthCookie } from "@/lib/auth-middleware"
import { checkRateLimitOnly, recordFailedAttempt, LOGIN_RATE_LIMIT, LOGIN_RATE_LIMIT_SLOW } from "@/lib/rate-limit"
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
 * - Rate limiting: 20 failed attempts/min, 60 failed attempts/5min per IP
 * - Only FAILED login attempts are counted — successful logins ALWAYS work
 * - Auto-hash plaintext passwords (migration)
 * - Token in httpOnly cookie only (not in response body)
 */
export const POST = tryCatch(async (request) => {
  const clientKey = getClientKey(request)

  // 1. Validate input with Zod
  const body = await request.json()
  const parsed = loginSchema.safeParse(body)

  if (!parsed.success) {
    return errorResponse("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
  }

  const { username, password } = parsed.data

  // 2. Find user
  const user = await db.user.findUnique({ where: { username } })

  if (!user) {
    // Don't reveal whether the user exists
    recordFailedAttempt(clientKey)
    return errorResponse("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
  }

  // 3. Verify password (auto-hash plaintext if found)
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
    // Check rate limit and record failed attempt
    recordFailedAttempt(clientKey)
    const fastCheck = checkRateLimitOnly(clientKey, LOGIN_RATE_LIMIT)
    if (!fastCheck.success) {
      const retryAfterSec = Math.ceil((fastCheck.resetAt - Date.now()) / 1000)
      return new NextResponse(
        JSON.stringify({ success: false, error: 'محاولات تسجيل دخول كثيرة — يرجى الانتظار قليلاً' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSec) } }
      )
    }
    const slowCheck = checkRateLimitOnly(clientKey, LOGIN_RATE_LIMIT_SLOW)
    if (!slowCheck.success) {
      const retryAfterSec = Math.ceil((slowCheck.resetAt - Date.now()) / 1000)
      return new NextResponse(
        JSON.stringify({ success: false, error: 'محاولات تسجيل دخول كثيرة — يرجى الانتظار عدة دقائق' }),
        { status: 429, headers: { 'Content-Type': 'application/json', 'Retry-After': String(retryAfterSec) } }
      )
    }
    return errorResponse("اسم المستخدم أو كلمة المرور غير صحيحة", 401)
  }

  if (!user.isActive) {
    return errorResponse("هذا الحساب معطل", 403)
  }

  // 4. Generate JWT token — successful login ALWAYS proceeds (not rate limited)
  const token = await generateToken({
    userId: user.id,
    username: user.username,
    role: user.role as "admin" | "cashier",
  })

  // 5. Build success response — token in httpOnly cookie ONLY
  const response = NextResponse.json({
    success: true,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      isActive: user.isActive,
    },
  })

  setAuthCookie(response, token)

  // 6. Log the login action
  logAction({
    action: "login",
    entity: "User",
    entityId: user.id,
    userName: user.name,
    details: { username: user.username },
  })

  return response
}, "حدث خطأ في تسجيل الدخول")
