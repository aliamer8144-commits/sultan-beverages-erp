/**
 * API Auth Middleware — Sultan Beverages ERP
 *
 * Lightweight wrappers to protect API route handlers with
 * JWT authentication. Use in any API route:
 *
 *   export const GET = withAuth(async (req) => { ... })
 *   export const POST = withAuth(async (req) => { ... }, { requireAdmin: true })
 *
 * ⚠️ Server-side only — never import this file in client components.
 */

import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser, AUTH_COOKIE_NAME } from './auth'

// ── Type Augmentation ──────────────────────────────────────────────

/** Auth user info attached to NextRequest after withAuth */
export interface AuthUserInfo {
  userId: string
  username: string
  role: string
}

/** Extend NextRequest with auth user property via declaration merging */
declare module 'next/server' {
  interface NextRequest {
    __authUser?: AuthUserInfo
  }
}

// ── Response Helpers ────────────────────────────────────────────────

function unauthorizedResponse(message = 'غير مصرح بهذا الطلب') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 401 }
  )
}

function forbiddenResponse(message = 'ليس لديك صلاحية لهذا الإجراء') {
  return NextResponse.json(
    { success: false, error: message },
    { status: 403 }
  )
}

// ── withAuth Wrapper ───────────────────────────────────────────────

interface WithAuthOptions {
  /** If true, only users with role 'admin' can access */
  requireAdmin?: boolean
  /** Custom 401 message */
  unauthorizedMessage?: string
  /** Custom 403 message */
  forbiddenMessage?: string
}

type AuthenticatedHandler = (
  request: NextRequest,
  context: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse

/**
 * Wrap an API route handler with authentication.
 * Extracts & verifies the JWT token, then calls the handler
 * with the authenticated user attached to the request.
 */
export function withAuth(
  handler: AuthenticatedHandler,
  options: WithAuthOptions = {}
): AuthenticatedHandler {
  return async (request, context) => {
    const user = await getAuthUser(request)

    if (!user) {
      return unauthorizedResponse(options.unauthorizedMessage)
    }

    if (options.requireAdmin && user.role !== 'admin') {
      return forbiddenResponse(options.forbiddenMessage)
    }

    // Attach user info to the request for downstream use
    request.__authUser = user

    return handler(request, context)
  }
}

// ── Convenience Extractors ─────────────────────────────────────────

/**
 * Get the authenticated user from a request that has already passed
 * through `withAuth`. Returns null if no user is attached.
 */
export function getRequestUser(request: NextRequest): AuthUserInfo | undefined {
  return request.__authUser
}

/**
 * Set the auth token as an HTTP-only cookie on a response.
 * Used after successful login.
 */
export function setAuthCookie(
  response: NextResponse,
  token: string,
  maxAge = 7 * 24 * 60 * 60 // 7 days in seconds
) {
  response.cookies.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge,
  })
}

/**
 * Clear the auth cookie (used on logout).
 */
export function clearAuthCookie(response: NextResponse) {
  response.cookies.set(AUTH_COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  })
}
