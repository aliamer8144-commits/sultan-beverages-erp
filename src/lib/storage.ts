/**
 * Image Storage Utilities — Sultan Beverages ERP
 *
 * Handles uploading, deleting, and managing product images
 * in Supabase Storage. Falls back gracefully if storage
 * is not configured.
 */

import { supabaseAdmin, isStorageConfigured, PRODUCT_IMAGES_BUCKET, getSupabasePublicUrl } from './supabase'
import { nanoid } from './utils'

/**
 * Upload a base64 image to Supabase Storage.
 *
 * @param base64DataUrl - Base64 data URL (e.g., "data:image/jpeg;base64,/9j/4AAQ...")
 * @param productId - Product ID to use as folder name
 * @returns Public URL of the uploaded image, or null if upload fails
 */
export async function uploadProductImage(
  base64DataUrl: string,
  productId: string
): Promise<string | null> {
  if (!isStorageConfigured() || !supabaseAdmin) {
    console.warn('[Storage] Supabase Storage not configured — skipping image upload')
    // Fall back to storing base64 directly in DB (backward compatibility)
    return base64DataUrl
  }

  try {
    // Parse the base64 data URL
    const matches = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/)
    if (!matches) {
      console.error('[Storage] Invalid base64 data URL format')
      return base64DataUrl // Fall back
    }

    const mimeType = matches[1] // e.g., "image/jpeg"
    const base64Data = matches[2] // The raw base64 string
    const buffer = Buffer.from(base64Data, 'base64')

    // Determine file extension from MIME type
    const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1]

    // Generate a unique file path: product-images/{productId}/{uniqueId}.{ext}
    const filePath = `${productId}/${nanoid()}.${ext}`

    // Ensure the bucket exists (create if not)
    const { error: bucketError } = await supabaseAdmin.storage.createBucket(
      PRODUCT_IMAGES_BUCKET,
      { public: true }
    )
    // Ignore error if bucket already exists
    if (bucketError && !bucketError.message.includes('already exists')) {
      console.error('[Storage] Failed to create bucket:', bucketError.message)
    }

    // Upload the file
    const { error: uploadError } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .upload(filePath, buffer, {
        contentType: mimeType,
        cacheControl: '31536000', // 1 year cache
        upsert: false,
      })

    if (uploadError) {
      console.error('[Storage] Upload failed:', uploadError.message)
      return base64DataUrl // Fall back
    }

    // Get the public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .getPublicUrl(filePath)

    console.log(`[Storage] Image uploaded: ${urlData.publicUrl}`)
    return urlData.publicUrl
  } catch (error) {
    console.error('[Storage] Upload error:', error)
    return base64DataUrl // Fall back to base64
  }
}

/**
 * Delete an image from Supabase Storage.
 * Handles both Supabase Storage URLs and base64 data URLs.
 *
 * @param imageUrl - The stored image URL or base64 data URL
 */
export async function deleteProductImage(imageUrl: string | null | undefined): Promise<void> {
  if (!imageUrl || !isStorageConfigured() || !supabaseAdmin) return

  // Only delete if it's a Supabase Storage URL
  if (!isSupabaseStorageUrl(imageUrl)) return

  try {
    const filePath = extractStoragePath(imageUrl)
    if (!filePath) return

    const { error } = await supabaseAdmin.storage
      .from(PRODUCT_IMAGES_BUCKET)
      .remove([filePath])

    if (error) {
      console.error('[Storage] Delete failed:', error.message)
    } else {
      console.log(`[Storage] Image deleted: ${filePath}`)
    }
  } catch (error) {
    console.error('[Storage] Delete error:', error)
  }
}

/**
 * Check if a URL is a Supabase Storage URL.
 */
export function isSupabaseStorageUrl(url: string): boolean {
  const publicUrl = getSupabasePublicUrl()
  if (!publicUrl) return false
  return url.startsWith(`${publicUrl}/storage/v1/object/public/`)
}

/**
 * Extract the storage file path from a Supabase Storage public URL.
 *
 * Example:
 *   Input:  https://xxx.supabase.co/storage/v1/object/public/product-images/abc123/file.jpg
 *   Output: abc123/file.jpg
 */
function extractStoragePath(url: string): string | null {
  const publicUrl = getSupabasePublicUrl()
  if (!publicUrl) return null

  const prefix = `${publicUrl}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/`
  if (!url.startsWith(prefix)) return null

  return url.slice(prefix.length)
}
