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
  PaginatedResponse,
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

export function unauthorized(message = 'غير مصرح') {
  return errorResponse(message, 401)
}

export function forbidden(message = 'ليس لديك صلاحية') {
  return errorResponse(message, 403)
}

export function serverError(message = 'حدث خطأ في الخادم') {
  return errorResponse(message, 500)
}

export function validationError(message: string) {
  return errorResponse(message, 422)
}

// ── Paginated ───────────────────────────────────────────────────────

export function paginatedResponse<T>(
  data: T[],
  total: number,
  page: number,
  totalPages: number,
  status = 200,
) {
  return NextResponse.json<PaginatedResponse<T>>(
    {
      success: true as const,
      data,
      total,
      page,
      totalPages,
    },
    { status },
  )
}

// ── Safe JSON parse ─────────────────────────────────────────────────

export async function parseBody<T>(request: Request): Promise<T> {
  return request.json() as Promise<T>
}
