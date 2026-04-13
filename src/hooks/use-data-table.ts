/**
 * useDataTable — Sultan Beverages ERP
 *
 * Manages pagination, search, loading state, and data fetching
 * for table-based screens. Reduces boilerplate significantly.
 *
 * Usage:
 *   const { data, loading, page, totalPages, total, search, setSearch, setPage, refetch } =
 *     useDataTable<ReturnType>('/api/products', { defaultLimit: 20 })
 */

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useApi } from './use-api'

// ── Types ───────────────────────────────────────────────────────────

interface DataTableOptions<T> {
  /** API endpoint URL */
  url: string
  /** Default page size (default: 20) */
  defaultLimit?: number
  /** Default search value */
  defaultSearch?: string
  /** Additional static query params */
  extraParams?: Record<string, string | number | undefined>
  /** Dependent filters that trigger refetch (e.g., statusFilter, categoryId) */
  filters?: Record<string, string | number | undefined>
  /** Transform response data */
  transform?: (data: T[]) => T[]
  /** Disable auto-fetch on mount */
  disabled?: boolean
  /** Parse response — return { items, total, totalPages } */
  parseResponse?: (body: unknown) => { items: T[]; total: number; totalPages: number }
}

interface DataTableReturn<T> {
  data: T[]
  loading: boolean
  page: number
  totalPages: number
  total: number
  search: string
  setSearch: (search: string) => void
  setPage: (page: number) => void
  refetch: () => void
  /** Set the entire data array manually (e.g., for computed data) */
  setData: (data: T[]) => void
  /** Go to first page (useful after filter change) */
  goToFirstPage: () => void
}

// ── Default response parser ─────────────────────────────────────────

function defaultParseResponse<T>(body: unknown): { items: T[]; total: number; totalPages: number } {
  const data = body as Record<string, unknown>
  // Support both { data: [...], total, totalPages } and { data: { expenses: [...], ... } }
  const items = (Array.isArray(data.data) ? data.data : []) as T[]
  return {
    items,
    total: (data.total as number) ?? items.length,
    totalPages: (data.totalPages as number) ?? 1,
  }
}

// ── Hook ────────────────────────────────────────────────────────────

export function useDataTable<T = unknown>(
  options: DataTableOptions<T>,
): DataTableReturn<T> {
  const {
    url,
    defaultLimit = 20,
    defaultSearch = '',
    extraParams = {},
    filters = {},
    transform,
    disabled = false,
    parseResponse = defaultParseResponse<T>,
  } = options

  const { get } = useApi()

  const [data, setData] = useState<T[]>([])
  const [loading, setLoading] = useState(false)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(0)
  const [total, setTotal] = useState(0)
  const [search, setSearchRaw] = useState(defaultSearch)

  // Debounce search
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)
  const searchRef = useRef(search)
  searchRef.current = search

  const setSearch = useCallback((value: string) => {
    setSearchRaw(value)
    setPage(1) // Reset to first page on search change
  }, [])

  const goToFirstPage = useCallback(() => {
    setPage(1)
  }, [])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params: Record<string, string | number | undefined> = {
        ...extraParams,
        ...filters,
        page,
        limit: defaultLimit,
      }
      if (searchRef.current.trim()) {
        params.search = searchRef.current.trim()
      }

      const result = await get<unknown>(url, params, { showErrorToast: false })
      if (result) {
        const parsed = parseResponse(result)
        setData(transform ? transform(parsed.items) : parsed.items)
        setTotal(parsed.total)
        setTotalPages(parsed.totalPages)
      } else {
        setData([])
        setTotal(0)
        setTotalPages(0)
      }
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }, [url, page, defaultLimit, extraParams, filters, search, get, parseResponse, transform])

  // Fetch on mount and when dependencies change
  useEffect(() => {
    if (!disabled) {
      // Small debounce for search
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(() => {
        fetchData()
      }, 300)
    }
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [fetchData, disabled])

  return {
    data,
    loading,
    page,
    totalPages,
    total,
    search,
    setSearch,
    setPage,
    refetch: fetchData,
    setData,
    goToFirstPage,
  }
}
