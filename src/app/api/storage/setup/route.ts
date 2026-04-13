import { supabaseAdmin, PRODUCT_IMAGES_BUCKET, isStorageConfigured } from '@/lib/supabase'
import { successResponse, errorResponse } from '@/lib/api-response'
import { withAuth } from '@/lib/auth-middleware'
import { tryCatch } from '@/lib/api-error-handler'

/**
 * POST /api/storage/setup — Create the product-images storage bucket
 *
 * One-time setup endpoint. Creates a public storage bucket for product images
 * if it doesn't already exist. Returns bucket info on success.
 */
export const POST = withAuth(tryCatch(async () => {
  if (!isStorageConfigured() || !supabaseAdmin) {
    return errorResponse('Supabase Storage غير مضبوط — يرجى إضافة NEXT_PUBLIC_SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY في إعدادات البيئة', 503)
  }

  // Try to create the bucket (will fail silently if it already exists)
  const { data, error } = await supabaseAdmin.storage.createBucket(
    PRODUCT_IMAGES_BUCKET,
    {
      public: true,
      fileSizeLimit: 5 * 1024 * 1024, // 5MB per file
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    }
  )

  if (error) {
    // If bucket already exists, that's fine
    if (error.message.includes('already exists') || error.message.includes('already been created')) {
      const { data: existing } = await supabaseAdmin.storage.getBucket(PRODUCT_IMAGES_BUCKET)
      return successResponse({
        message: 'حاوية التخزين موجودة بالفعل',
        bucket: existing,
      })
    }
    console.error('[Storage Setup] Failed to create bucket:', error)
    return errorResponse(`فشل في إنشاء حاوية التخزين: ${error.message}`, 500)
  }

  return successResponse({
    message: 'تم إنشاء حاوية التخزين بنجاح',
    bucket: data,
  })
}, 'فشل في إعداد التخزين'))

/**
 * GET /api/storage/status — Check storage configuration status
 */
export const GET = withAuth(tryCatch(async () => {
  const configured = isStorageConfigured()

  let bucketInfo = null as unknown
  if (configured && supabaseAdmin) {
    try {
      const { data } = await supabaseAdmin.storage.getBucket(PRODUCT_IMAGES_BUCKET)
      bucketInfo = data
    } catch {
      // Bucket doesn't exist yet
    }
  }

  return successResponse({
    configured,
    bucketExists: !!bucketInfo,
    bucket: bucketInfo,
  })
}, 'فشل في التحقق من حالة التخزين'))
