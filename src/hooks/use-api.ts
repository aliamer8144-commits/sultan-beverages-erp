/**
 * useApi — Sultan Beverages ERP
 *
 * Centralized API client hook. Handles auth headers, error responses,
 * toast notifications, and loading state.
 *
 * Usage:
 *   const { get, post, put, del, loading } = useApi()
 *   const data = await get('/api/products', { page: 1 })
 *   const created = await post('/api/products', { name: '...' })
 */

'use client'

import { useState, useCallback } from 'react'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import type { ApiResponse, ApiErrorResponse } from '@/types/api'

// ── Config ──────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: RequestInit = {
  headers: { 'Content-Type': 'application/json' },
}

// ── Types ───────────────────────────────────────────────────────────

interface UseApiOptions {
  /** Show error toast automatically (default: true) */
  showErrorToast?: boolean
  /** Show success toast for mutations (default: false) */
  showSuccessToast?: boolean
  /** Custom success message */
  successMessage?: string
  /** Custom error message (overrides server message) */
  errorMessage?: string
}

interface UseApiReturn {
  loading: boolean
  /** GET request — returns typed data or null */
  get: <T = unknown>(
    url: string,
    params?: Record<string, string | number | undefined>,
    options?: UseApiOptions,
  ) => Promise<T | null>
  /** POST request — returns typed data or null */
  post: <T = unknown>(
    url: string,
    body?: unknown,
    options?: UseApiOptions,
  ) => Promise<T | null>
  /** PUT request — returns typed data or null */
  put: <T = unknown>(
    url: string,
    body?: unknown,
    options?: UseApiOptions,
  ) => Promise<T | null>
  /** PATCH request — returns typed data or null */
  patch: <T = unknown>(
    url: string,
    body?: unknown,
    options?: UseApiOptions,
  ) => Promise<T | null>
  /** DELETE request — returns true on success */
  del: (
    url: string,
    options?: UseApiOptions,
  ) => Promise<boolean>
  /** Generic request — for full control */
  request: <T = unknown>(
    url: string,
    init: RequestInit,
    options?: UseApiOptions,
  ) => Promise<T | null>
}

// ── Hook ────────────────────────────────────────────────────────────

export function useApi(): UseApiReturn {
  const [loading, setLoading] = useState(false)
  const token = useAppStore((s) => s.token)

  const handleResponse = useCallback(
    async <T>(response: Response, options?: UseApiOptions): Promise<T | null> => {
      const showError = options?.showErrorToast !== false
      const showSuccess = options?.showSuccessToast === true
      const errMessage = options?.errorMessage
      const successMessage = options?.successMessage

      if (!response.ok) {
        let message = errMessage || 'حدث خطأ في الخادم'
        try {
          const body = (await response.json()) as ApiErrorResponse
          if (body.error) message = body.error
        } catch {
          // Use default message
        }
        if (showError) {
          toast.error(message)
        }
        return null
      }

      // Handle 204 No Content
      if (response.status === 204) {
        if (showSuccess) toast.success(successMessage || 'تم بنجاح')
        return null as T
      }

      try {
        const body = (await response.json()) as ApiResponse<T>
        if (showSuccess) {
          toast.success(successMessage || 'تم بنجاح')
        }
        return body.data
      } catch {
        if (showSuccess) toast.success(successMessage || 'تم بنجاح')
        return null
      }
    },
    [],
  )

  const request = useCallback(
    async <T = unknown>(
      url: string,
      init: RequestInit,
      options?: UseApiOptions,
    ): Promise<T | null> => {
      setLoading(true)
      try {
        const headers: Record<string, string> = {
          ...(init.headers as Record<string, string>),
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(url, {
          ...init,
          headers,
        })

        return handleResponse<T>(response, options)
      } catch {
        if (options?.showErrorToast !== false) {
          toast.error(options?.errorMessage || 'فشل الاتصال بالخادم')
        }
        return null
      } finally {
        setLoading(false)
      }
    },
    [token, handleResponse],
  )

  const get = useCallback(
    async <T = unknown>(
      url: string,
      params?: Record<string, string | number | undefined>,
      options?: UseApiOptions,
    ): Promise<T | null> => {
      let fullUrl = url
      if (params) {
        const searchParams = new URLSearchParams()
        for (const [key, value] of Object.entries(params)) {
          if (value !== undefined && value !== '') {
            searchParams.set(key, String(value))
          }
        }
        const qs = searchParams.toString()
        if (qs) fullUrl += `?${qs}`
      }
      return request<T>(fullUrl, { method: 'GET', ...DEFAULT_OPTIONS }, { showErrorToast: true, ...options })
    },
    [request],
  )

  const post = useCallback(
    async <T = unknown>(url: string, body?: unknown, options?: UseApiOptions): Promise<T | null> => {
      return request<T>(
        url,
        { method: 'POST', ...DEFAULT_OPTIONS, body: body ? JSON.stringify(body) : undefined },
        options,
      )
    },
    [request],
  )

  const put = useCallback(
    async <T = unknown>(url: string, body?: unknown, options?: UseApiOptions): Promise<T | null> => {
      return request<T>(
        url,
        { method: 'PUT', ...DEFAULT_OPTIONS, body: body ? JSON.stringify(body) : undefined },
        options,
      )
    },
    [request],
  )

  const patch = useCallback(
    async <T = unknown>(url: string, body?: unknown, options?: UseApiOptions): Promise<T | null> => {
      return request<T>(
        url,
        { method: 'PATCH', ...DEFAULT_OPTIONS, body: body ? JSON.stringify(body) : undefined },
        options,
      )
    },
    [request],
  )

  const del = useCallback(
    async (url: string, options?: UseApiOptions): Promise<boolean> => {
      const result = await request<unknown>(
        url,
        { method: 'DELETE', ...DEFAULT_OPTIONS },
        { showSuccessToast: true, successMessage: 'تم الحذف بنجاح', ...options },
      )
      return result !== null || true // Return true even for 204
    },
    [request],
  )

  return { loading, get, post, put, patch, del, request }
}

// ── Convenience: non-hook API client (for use outside components) ────

export function apiClient() {
  const stored = localStorage.getItem('sultan-erp-store')
  let token: string | null = null
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      token = parsed?.state?.token || null
    } catch {
      // ignore
    }
  }

  return {
    async get<T = unknown>(url: string, params?: Record<string, string | number | undefined>): Promise<T | null> {
      let fullUrl = url
      if (params) {
        const sp = new URLSearchParams()
        for (const [k, v] of Object.entries(params)) {
          if (v !== undefined && v !== '') sp.set(k, String(v))
        }
        if (sp.toString()) fullUrl += `?${sp.toString()}`
      }
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`
      try {
        const res = await fetch(fullUrl, { headers })
        if (!res.ok) return null
        const body = await res.json()
        return (body as ApiResponse<T>).data
      } catch {
        return null
      }
    },
  }
}
