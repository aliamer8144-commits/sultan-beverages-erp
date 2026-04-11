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
  if (!secret) return new Uint8Array(0) // Allow boot without secret for setup
  return new TextEncoder().encode(secret)
}

// ── Public Routes ───────────────────────────────────────────────────

/** Routes that don't require authentication */
const PUBLIC_PATHS = [
  '/api/auth',           // Login endpoint (POST)
  '/_next',              // Next.js static assets
  '/favicon.ico',        // Favicon
  '/robots.txt',         // SEO
]

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname.startsWith(p))
}

// ── Middleware ──────────────────────────────────────────────────────

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (isPublicPath(pathname)) {
    return NextResponse.next()
  }

  // Only protect /api/* routes
  if (pathname.startsWith('/api/')) {
    const secret = getSecret()

    // If no secret configured, allow through (development setup)
    if (secret.length === 0) {
      return NextResponse.next()
    }

    // Extract token from cookie or Authorization header
    const cookieToken = request.cookies.get('sultan-erp-token')?.value
    const authHeader = request.headers.get('Authorization')
    const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null)

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'غير مصرح — يرجى تسجيل الدخول' },
        { status: 401 }
      )
    }

    // Verify JWT
    try {
      await jwtVerify(token, secret)
      return NextResponse.next()
    } catch {
      return NextResponse.json(
        { success: false, error: 'صلاحية الدخول منتهية — يرجى تسجيل الدخول مجدداً' },
        { status: 401 }
      )
    }
  }

  // Non-API routes: allow through (SPA routing)
  return NextResponse.next()
}

// ── Config ──────────────────────────────────────────────────────────

export const config = {
  matcher: [
    // Match all paths except static files and images
    '/((?!.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?|ttf|otf)$).*)',
  ],
}
