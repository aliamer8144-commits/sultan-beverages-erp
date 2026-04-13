/**
 * Supabase Server Client — Sultan Beverages ERP
 *
 * Server-side Supabase client with service role permissions.
 * Used for Storage operations (upload, delete product images).
 * MUST only be used in server-side code (API routes, server actions).
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate that required env vars are set
if (!supabaseUrl) {
  console.warn(
    '[Supabase] NEXT_PUBLIC_SUPABASE_URL is not set. Image upload to Storage will be disabled.'
  )
}

if (!supabaseServiceKey) {
  console.warn(
    '[Supabase] SUPABASE_SERVICE_ROLE_KEY is not set. Image upload to Storage will be disabled.'
  )
}

/**
 * Server-side Supabase client with admin/service role permissions.
 * Has full access to all Storage buckets and operations.
 */
export const supabaseAdmin =
  supabaseUrl && supabaseServiceKey
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
  return supabaseUrl || ''
}

/** Storage bucket name for product images */
export const PRODUCT_IMAGES_BUCKET = 'product-images'
