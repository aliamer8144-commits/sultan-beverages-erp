/**
 * useApi — Sultan Beverages ERP
 *
 * Centralized API client hook. Handles auth via httpOnly cookies,
 * error responses, toast notifications, and loading state.
 *
 * Usage:
 *   const { get, post, put, del, loading } = useApi()
 *   const data = await get('/api/products', { page: 1 })
 *   const created = await post('/api/products', { name: '...' })
 */

'use client'

import { useState, useCallback, useRef } from 'react'
import { useAppStore } from '@/store/app-store'
import { toast } from 'sonner'
import type { ApiResponse, ApiErrorResponse } from '@/types/api'

// ── Config ──────────────────────────────────────────────────────────

const DEFAULT_OPTIONS: RequestInit = {
  credentials: 'include',
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
  const loadingCountRef = useRef(0)
  const [loading, setLoading] = useState(false)

  const startLoading = useCallback(() => {
    loadingCountRef.current++
    if (loadingCountRef.current === 1) setLoading(true)
  }, [])

  const stopLoading = useCallback(() => {
    loadingCountRef.current = Math.max(0, loadingCountRef.current - 1)
    if (loadingCountRef.current === 0) setLoading(false)
  }, [])

  const handleResponse = useCallback(
    async <T>(response: Response, options?: UseApiOptions): Promise<T | null> => {
      const showError = options?.showErrorToast !== false
      const showSuccess = options?.showSuccessToast === true
      const errMessage = options?.errorMessage
      const successMessage = options?.successMessage

      if (!response.ok) {
        // Handle auth errors — only redirect if actually on the app (not login page)
        if (response.status === 401 || response.status === 403) {
          try {
            const body = (await response.json()) as ApiErrorResponse
            if (showError) {
              toast.error(body.error || 'انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجدداً')
            }
          } catch {
            if (showError) {
              toast.error('انتهت صلاحية الجلسة — يرجى تسجيل الدخول مجدداً')
            }
          }
          // Clear stored auth state and redirect to login
          useAppStore.getState().logout()
          if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
            // Small delay so the user sees the toast before redirect
            setTimeout(() => {
              window.location.href = '/'
            }, 500)
          }
          return null
        }

        // Handle rate limiting
        if (response.status === 429) {
          if (showError) {
            toast.warning('محاولات كثيرة — يرجى الانتظار قليلاً')
          }
          return null
        }

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
      startLoading()
      try {
        const headers: Record<string, string> = {
          ...(init.headers as Record<string, string>),
        }

        const response = await fetch(url, {
          ...init,
          headers,
          credentials: 'include',
        })

        return handleResponse<T>(response, options)
      } catch {
        if (options?.showErrorToast !== false) {
          toast.error(options?.errorMessage || 'فشل الاتصال بالخادم')
        }
        return null
      } finally {
        stopLoading()
      }
    },
    [handleResponse, startLoading, stopLoading],
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
      const isFormData = body instanceof FormData
      const headers: Record<string, string> = {}
      if (body && !isFormData) {
        headers['Content-Type'] = 'application/json'
      }
      return request<T>(
        url,
        { method: 'POST', ...DEFAULT_OPTIONS, headers, body: body ? (isFormData ? body : JSON.stringify(body)) : undefined },
        options,
      )
    },
    [request],
  )

  const put = useCallback(
    async <T = unknown>(url: string, body?: unknown, options?: UseApiOptions): Promise<T | null> => {
      const isFormData = body instanceof FormData
      const headers: Record<string, string> = {}
      if (body && !isFormData) {
        headers['Content-Type'] = 'application/json'
      }
      return request<T>(
        url,
        { method: 'PUT', ...DEFAULT_OPTIONS, headers, body: body ? (isFormData ? body : JSON.stringify(body)) : undefined },
        options,
      )
    },
    [request],
  )

  const patch = useCallback(
    async <T = unknown>(url: string, body?: unknown, options?: UseApiOptions): Promise<T | null> => {
      const isFormData = body instanceof FormData
      const headers: Record<string, string> = {}
      if (body && !isFormData) {
        headers['Content-Type'] = 'application/json'
      }
      return request<T>(
        url,
        { method: 'PATCH', ...DEFAULT_OPTIONS, headers, body: body ? (isFormData ? body : JSON.stringify(body)) : undefined },
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
      return result !== null
    },
    [request],
  )

  return { loading, get, post, put, patch, del, request }
}
