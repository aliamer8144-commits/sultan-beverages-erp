/**
 * Image utility functions for product image handling.
 * Provides compression and placeholder helpers.
 */

/**
 * Compress an image file and return a base64 data URL.
 * Uses canvas to resize and compress the image.
 *
 * @param file - The image File object to compress
 * @param maxWidth - Maximum width in pixels (default 400)
 * @param quality - JPEG quality 0-1 (default 0.75)
 * @returns Promise resolving to base64 data URL string
 */
export function compressImage(
  file: File,
  maxWidth: number = 400,
  quality: number = 0.75
): Promise<string> {
  return new Promise((resolve, reject) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      reject(new Error('يرجى اختيار ملف صورة فقط'))
      return
    }

    // If the file is very small, return as-is (no need to compress)
    if (file.size < 50 * 1024) {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(file)
      return
    }

    const img = new Image()
    img.onload = () => {
      try {
        // Calculate new dimensions maintaining aspect ratio
        let { width, height } = img
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width)
          width = maxWidth
        }

        // Use canvas to resize and compress
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height

        const ctx = canvas.getContext('2d')
        if (!ctx) {
          reject(new Error('فشل في إنشاء سياق الرسم'))
          return
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to data URL with compression
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        resolve(dataUrl)
      } catch (error) {
        reject(error)
      }
    }
    img.onerror = () => reject(new Error('فشل في تحميل الصورة'))
    img.src = URL.createObjectURL(file)
  })
}

/**
 * Returns an empty string for fallback when no image is available.
 * The UI components handle the empty state by showing placeholder icons.
 *
 * @returns Empty string
 */
export function getDefaultPlaceholder(): string {
  return ''
}

/**
 * Get the estimated file size in KB from a base64 data URL.
 *
 * @param base64 - The base64 data URL string
 * @returns Estimated size in KB
 */
export function getBase64Size(base64: string): number {
  if (!base64) return 0
  // Base64 encoding: 4 chars = 3 bytes, minus data URL prefix
  const base64Length = base64.split(',')[1]?.length || 0
  return Math.round((base64Length * 3) / 4 / 1024)
}
