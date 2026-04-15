/**
 * API Response Types — Sultan Beverages ERP
 *
 * Unified shapes for all API route responses.
 * Use these types in every API route for consistency.
 */

// ── Success ─────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success: true
  data: T
}

// ── Error ───────────────────────────────────────────────────────────

export interface ApiErrorResponse {
  success: false
  error: string
}

// ── Paginated ───────────────────────────────────────────────────────

export interface PaginatedResponse<T = unknown> {
  success: true
  data: T[]
  total: number
  page: number
  totalPages: number
}

// ── Union helpers ───────────────────────────────────────────────────

export type ApiResult<T = unknown> = ApiResponse<T> | ApiErrorResponse
export type PaginatedResult<T = unknown> = PaginatedResponse<T> | ApiErrorResponse

// ── Type guards ─────────────────────────────────────────────────────

export function isApiSuccess<T>(res: ApiResult<T>): res is ApiResponse<T> {
  return res.success === true
}

export function isApiError(res: ApiResult<unknown>): res is ApiErrorResponse {
  return res.success === false
}

// ── Common query params ─────────────────────────────────────────────

export interface PaginationQuery {
  page?: string
  limit?: string
  search?: string
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface DateRangeQuery {
  from?: string
  to?: string
}

const VALID_SORT_FIELDS = ['name', 'price', 'quantity', 'createdAt', 'updatedAt', 'totalAmount', 'date']

export function parsePaginationQuery(searchParams: URLSearchParams) {
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 20))
  const search = searchParams.get('search') || ''
  const rawSortBy = searchParams.get('sortBy') || 'createdAt'
  const sortBy = VALID_SORT_FIELDS.includes(rawSortBy) ? rawSortBy : 'createdAt'
  const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc'
  return { page, limit, search, sortBy, sortOrder }
}
