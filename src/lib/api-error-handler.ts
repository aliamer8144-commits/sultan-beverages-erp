/**
 * API Error Handler — Sultan Beverages ERP
 *
 * Unified try/catch wrapper and request validation helpers
 * for all API routes. Eliminates boilerplate error handling.
 *
 * Usage:
 *   export const GET = withAuth(tryCatch(async (req) => {
 *     // Only business logic here — errors handled automatically
 *     return successResponse(data)
 *   }))
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { serverError, errorResponse } from './api-response'
import { validateBody, SchemaResult } from './validations'

// ── Types ──────────────────────────────────────────────────────────

/** Standard Next.js route handler signature (App Router) */
type RouteHandler = (
  request: NextRequest,
  context: { params?: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse

/** Context passed to the wrapped handler — params are resolved */
type ResolvedContext = { params?: Record<string, string> }

/** Handler function with already-resolved params */
type HandlerFunction = (
  request: NextRequest,
  context: ResolvedContext
) => Promise<NextResponse> | NextResponse

// ── tryCatch ───────────────────────────────────────────────────────

/**
 * Wraps an API route handler with unified try/catch error handling.
 *
 * - Catches all errors and returns a standardized server error response
 * - Logs errors via console.error for debugging
 * - Resolves `context.params` promise automatically (Next.js 15+)
 * - Preserves the original return type
 *
 * @param handler - The route handler function containing business logic
 * @param fallbackMessage - Optional Arabic error message shown to users on unexpected errors
 *
 * @example
 * ```ts
 * export const GET = withAuth(tryCatch(async (req) => {
 *   const customers = await db.customer.findMany()
 *   return successResponse(customers)
 * }, 'فشل في تحميل العملاء'))
 * ```
 */
export function tryCatch(
  handler: HandlerFunction,
  fallbackMessage = 'حدث خطأ في الخادم'
): RouteHandler {
  return async (request, context) => {
    try {
      // Resolve Next.js 15+ params promise
      const resolvedParams = context.params ? await context.params : undefined
      return await handler(request, { params: resolvedParams })
    } catch (error) {
      const message = error instanceof Error ? error.message : fallbackMessage
      console.error(`[API Error] ${request.method} ${request.nextUrl.pathname}:`, message)

      // Handle specific Prisma errors
      if (isPrismaError(error)) {
        return handlePrismaError(error, fallbackMessage)
      }

      return serverError(message)
    }
  }
}

// ── validateRequest ────────────────────────────────────────────────

/**
 * Parses and validates a JSON request body against a Zod schema.
 * Returns the validated data or throws an error that tryCatch will catch.
 *
 * @example
 * ```ts
 * export const POST = withAuth(tryCatch(async (req) => {
 *   const body = await validateRequest(req, createProductSchema)
 *   const product = await db.product.create({ data: body })
 *   return successResponse(product, 201)
 * }))
 * ```
 */
export async function validateRequest<T>(
  request: NextRequest,
  schema: z.ZodSchema<T>
): Promise<T> {
  const body = await request.json()
  const result = validateBody(schema, body)

  if (!result.success) {
    // throw with a structured shape so tryCatch returns 422
    const error = new Error(result.error)
    ;(error as ValidationError).statusCode = 422
    throw error
  }

  return result.data
}

// ── withValidation ─────────────────────────────────────────────────

/**
 * Combines tryCatch + validateRequest into a single wrapper
 * for POST/PUT/PATCH routes that need body validation.
 *
 * @example
 * ```ts
 * export const POST = withAuth(withValidation(createCustomerSchema, async (req, body) => {
 *   const customer = await db.customer.create({ data: body })
 *   return successResponse(customer, 201)
 * }, 'فشل في إنشاء العميل'))
 * ```
 */
export function withValidation<T>(
  schema: z.ZodSchema<T>,
  handler: (request: NextRequest, body: T, context: ResolvedContext) => Promise<NextResponse> | NextResponse,
  fallbackMessage = 'حدث خطأ في الخادم'
): RouteHandler {
  return tryCatch(async (request, context) => {
    const body = await validateRequest(request, schema)
    return handler(request, body, context)
  }, fallbackMessage)
}

// ── Prisma Error Detection ─────────────────────────────────────────

interface PrismaError extends Error {
  code: string
  meta?: Record<string, unknown>
}

/** Check if an error is a Prisma client error */
function isPrismaError(error: unknown): error is PrismaError {
  if (error instanceof Error && 'code' in error) {
    return typeof (error as PrismaError).code === 'string'
  }
  return false
}

/** Map common Prisma error codes to user-friendly Arabic messages */
function handlePrismaError(error: PrismaError, fallback: string): NextResponse {
  switch (error.code) {
    case 'P2002':
      // Unique constraint violation
      const target = Array.isArray(error.meta?.target)
        ? (error.meta.target as string[]).join(', ')
        : ''
      return errorResponse(`القيمة "${target}" موجودة بالفعل`, 409)

    case 'P2025':
      // Record not found
      return errorResponse(fallback.includes('غير موجود') ? fallback : 'غير موجود', 404)

    case 'P2003':
      // Foreign key constraint
      return errorResponse('لا يمكن تنفيذ العملية بسبب ارتباط ببيانات أخرى', 400)

    case 'P2014':
      // Relation violation
      return errorResponse('علاقة غير صالحة بين البيانات', 400)

    case 'P1000':
    case 'P1001':
    case 'P1002':
    case 'P1008':
    case 'P1009':
      // Authentication / connection errors
      console.error('[DB Connection Error]:', error.message)
      return errorResponse('خطأ في الاتصال بقاعدة البيانات', 503)

    default:
      return serverError(fallback)
  }
}

// ── Route Param Helpers ────────────────────────────────────────────

/**
 * Extract a required route param from the resolved context.
 * Returns the param value or throws an error (caught by tryCatch → 400).
 *
 * @example
 * ```ts
 * export const PUT = withAuth(tryCatch(async (req, { params }) => {
 *   const id = getRequiredParam(params, 'id')
 *   // id is now typed as string (not string | undefined)
 * }))
 * ```
 */
export function getRequiredParam(
  params: Record<string, string> | undefined,
  name: string
): string {
  const value = params?.[name]
  if (!value) {
    const error = new Error(`معرف "${name}" مطلوب`)
    ;(error as ValidationError).statusCode = 400
    throw error
  }
  return value
}

// ── Internal Types ─────────────────────────────────────────────────

interface ValidationError extends Error {
  statusCode: number
}
