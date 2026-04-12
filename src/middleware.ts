import { NextRequest, NextResponse } from 'next/server'
import { jwtVerify } from 'jose'

/**
 * Next.js Middleware — Sultan Beverages ERP
 *
 * Provides blanket JWT authentication for all API routes.
 * Public routes (login, static assets) are excluded.
 *
 * The middleware runs on the Edge runtime and uses jose for
 * lightweight JWT verification — no bcrypt/DB needed here.
 */

// ── JWT Secret ──────────────────────────────────────────────────────

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || ''
  if (!secret) {
    throw new Error(
      'JWT_SECRET is not configured. Add it to your .env file.'
    )
  }
  return new TextEncoder().encode(secret)
}

// ── Public Routes ───────────────────────────────────────────────────

/** Routes that don't require authentication */
const PUBLIC_PATHS = [
  '/api/auth',           // Login endpoint (POST only)
  '/_next',              // Next.js static assets
  '/favicon.ico',        // Favicon
  '/robots.txt',         // SEO
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

// ── Security Headers ────────────────────────────────────────────────

function getSecurityHeaders(): HeadersInit {
  return {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    // XSS protection (legacy browsers)
    'X-XSS-Protection': '1; mode=block',
    // Referrer policy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    // Content-Security-Policy: restrict resource loading
    'Content-Security-Policy': [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // unsafe-eval needed for Next.js dev
      "style-src 'self' 'unsafe-inline'",                  // unsafe-inline needed for Tailwind
      "img-src 'self' data: blob:",                        // data: for base64 product images
      "font-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
    ].join('; '),
  }
}

// ── Middleware ──────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Apply security headers to all responses
  const securityHeaders = getSecurityHeaders()

  // Allow public routes (but still apply security headers)
  if (isPublicPath(pathname)) {
    return NextResponse.next({ headers: securityHeaders })
  }

  // Only protect /api/* routes
  if (pathname.startsWith('/api/')) {
    // Get secret — will throw if not configured, caught below
    let secret: Uint8Array
    try {
      secret = getSecret()
    } catch {
      // CRITICAL: If JWT_SECRET is missing, reject all API requests
      // This prevents accidental deployment without authentication
      return NextResponse.json(
        { success: false, error: 'خطأ في إعدادات الخادم — يرجى التواصل مع المدير' },
        { status: 500, headers: securityHeaders }
      )
    }

    // Extract token from cookie or Authorization header
    const cookieToken = request.cookies.get('sultan-erp-token')?.value
    const authHeader = request.headers.get('Authorization')
    const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح — يرجى تسجيل الدخول' },
        { status: 401, headers: securityHeaders }
      )
    }

    // Verify JWT
    try {
      await jwtVerify(token, secret)
      return NextResponse.next({ headers: securityHeaders })
    } catch {
      return NextResponse.json(
        { success: false, error: 'صلاحية الدخول منتهية — يرجى تسجيل الدخول مجدداً' },
        { status: 401, headers: securityHeaders }
      )
    }
  }

  // Non-API routes: allow through (SPA routing) with security headers
  return NextResponse.next({ headers: securityHeaders })
}

// ── Config ──────────────────────────────────────────────────────────

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)',
  ],
}
