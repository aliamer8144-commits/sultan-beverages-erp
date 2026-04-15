/**
 * Authentication Library — Sultan Beverages ERP
 *
 * Centralized auth utilities: password hashing (bcryptjs),
 * JWT token generation/verification (jose), and request helpers.
 *
 * ⚠️ Server-side only — never import this file in client components.
 */

import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { NextRequest } from 'next/server'
import type { UserRole } from '@/types'

// ── Configuration ───────────────────────────────────────────────────

/** JWT secret — uses NEXTAUTH_SECRET or falls back to a generated env value */
function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || ''
  if (!secret) {
    throw new Error(
      'JWT_SECRET environment variable is required. ' +
      'Add it to your .env file: JWT_SECRET=your-random-secret-here'
    )
  }
  if (secret.length < 32) {
    throw new Error(
      'JWT_SECRET must be at least 32 characters long for security. ' +
      'Current length: ' + secret.length
    )
  }
  return new TextEncoder().encode(secret)
}

/** JWT token expiry */
export const TOKEN_EXPIRY = '24h'

/** Cookie / header name for the auth token */
export const AUTH_COOKIE_NAME = 'sultan-erp-token'
export const AUTH_HEADER_NAME = 'Authorization'

// ── Password Hashing ───────────────────────────────────────────────

/** Hash a plain-text password using bcrypt */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

/** Verify a plain-text password against a bcrypt hash */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// ── JWT Token ───────────────────────────────────────────────────────

export interface TokenPayload {
  userId: string
  username: string
  role: UserRole
}

/** Generate a signed JWT for the given user */
export async function generateToken(payload: TokenPayload): Promise<string> {
  return new SignJWT(payload as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_EXPIRY)
    .sign(getSecret())
}

/** Verify a JWT and return its payload, or null if invalid */
export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret())
    return {
      userId: payload.userId as string,
      username: payload.username as string,
      role: payload.role as UserRole,
    }
  } catch {
    return null
  }
}

// ── Request Helpers ────────────────────────────────────────────────

/** Extract the auth token from a request (cookie → Authorization header) */
export function extractToken(request: NextRequest): string | null {
  // 1. Check cookie first
  const cookieToken = request.cookies.get(AUTH_COOKIE_NAME)?.value
  if (cookieToken) return cookieToken

  // 2. Check Authorization header: "Bearer <token>"
  const authHeader = request.headers.get(AUTH_HEADER_NAME)
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7)
  }

  return null
}

/** Get the authenticated user from a request, or null if not authenticated */
export async function getAuthUser(request: NextRequest): Promise<TokenPayload | null> {
  const token = extractToken(request)
  if (!token) return null
  return verifyToken(token)
}
