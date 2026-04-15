/**
 * fetchWithAuth — Sultan Beverages ERP
 *
 * Client-side fetch wrapper that automatically sends httpOnly
 * cookies for authentication. No token in headers — the JWT
 * is stored exclusively in an httpOnly cookie set by the server.
 *
 * Use this in any client component that makes direct fetch() calls
 * instead of the useApi() hook.
 *
 * Usage:
 *   import { fetchWithAuth } from '@/lib/fetch-with-auth'
 *   const res = await fetchWithAuth('/api/stock-alerts')
 *   const res = await fetchWithAuth('/api/products', { method: 'POST', body: '...' })
 */

/**
 * Wrapper around fetch() that sends httpOnly cookies automatically.
 * Only sets Content-Type for JSON requests (not FormData).
 */
export async function fetchWithAuth(
  url: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  }

  // Only set Content-Type for JSON requests, not FormData
  if (init.body && !(init.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  return fetch(url, {
    ...init,
    headers,
    credentials: 'include',
  })
}
