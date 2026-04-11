/**
 * API Response Helpers — Sultan Beverages ERP
 *
 * Consistent response builders for all API routes.
 * Every route should use these instead of raw NextResponse.json().
 */

import { NextResponse } from 'next/server'
import type {
  ApiResponse,
  ApiErrorResponse,
} from '@/types/api'

// ── Success ─────────────────────────────────────────────────────────

export function successResponse<T>(data: T, status = 200) {
  return NextResponse.json<ApiResponse<T>>(
    { success: true as const, data },
    { status },
  )
}

// ── Error ───────────────────────────────────────────────────────────

export function errorResponse(message: string, status = 400) {
  return NextResponse.json<ApiErrorResponse>(
    { success: false as const, error: message },
    { status },
  )
}

// ── Common error shortcuts ──────────────────────────────────────────

export function notFound(message = 'غير موجود') {
  return errorResponse(message, 404)
}

export function serverError(message = 'حدث خطأ في الخادم') {
  return errorResponse(message, 500)
}
