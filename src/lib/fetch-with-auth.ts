/**
 * fetchWithAuth — Sultan Beverages ERP
 *
 * Client-side fetch wrapper that automatically adds the JWT token
 * from the Zustand store to request headers.
 *
 * Use this in any client component that makes direct fetch() calls
 * instead of the useApi() hook.
 *
 * Usage:
 *   import { fetchWithAuth } from '@/lib/fetch-with-auth'
 *   const res = await fetchWithAuth('/api/stock-alerts')
 *   const res = await fetchWithAuth('/api/products', { method: 'POST', body: '...' })
 */

import { useAppStore } from '@/store/app-store'

/**
 * Wrapper around fetch() that adds Authorization header from the Zustand store.
 * Always includes credentials (cookies) for httpOnly token support.
 */
export async function fetchWithAuth(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const token = useAppStore.getState().token

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
    'Content-Type': 'application/json',
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })
}
