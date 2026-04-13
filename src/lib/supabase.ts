/**
 * Supabase Server Client — Sultan Beverages ERP
 *
 * Server-side Supabase client with service role permissions.
 * Used for Storage operations (upload, delete product images).
 * MUST only be used in server-side code (API routes, server actions).
 *
 * IMPORTANT: Storage is completely optional. If env vars are missing
 * or invalid, all storage operations are silently skipped.
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || ''

/** Check if the key looks like a real service role key (not a placeholder) */
function isValidServiceKey(key: string): boolean {
  return (
    key.length > 20 &&
    !key.includes('YOUR_') &&
    !key.includes('your_') &&
    !key.includes('placeholder') &&
    !key.includes('xxx')
  )
}

/** Check if the URL looks like a real Supabase URL */
function isValidSupabaseUrl(url: string): boolean {
  return (
    url.includes('supabase.co') &&
    url.startsWith('https://')
  )
}

const validUrl = isValidSupabaseUrl(supabaseUrl)
const validKey = isValidServiceKey(supabaseServiceKey)

if (!validUrl || !validKey) {
  console.warn(
    '[Supabase] Storage not configured — product images will be stored in database as base64.'
  )
}

/**
 * Server-side Supabase client with admin/service role permissions.
 * Only created if both URL and key are valid (not placeholders).
 */
export const supabaseAdmin =
  validUrl && validKey
    ? createClient(supabaseUrl, supabaseServiceKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      })
    : null

/** Check if Supabase Storage is properly configured */
export function isStorageConfigured(): boolean {
  return supabaseAdmin !== null
}

/** Get the public Supabase URL (for constructing image URLs on client) */
export function getSupabasePublicUrl(): string {
  return validUrl ? supabaseUrl : ''
}

/** Storage bucket name for product images */
export const PRODUCT_IMAGES_BUCKET = 'product-images'
