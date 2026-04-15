/**
 * Image utility functions for product image handling.
 * Provides compression helpers.
 */

/**
 * Compress an image file and return a base64 data URL.
 * Uses canvas to resize and compress the image.
 * Preserves PNG transparency and properly revokes object URLs.
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

    const objectUrl = URL.createObjectURL(file)
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
          URL.revokeObjectURL(objectUrl)
          reject(new Error('فشل في إنشاء سياق الرسم'))
          return
        }

        // Use high-quality image smoothing
        ctx.imageSmoothingEnabled = true
        ctx.imageSmoothingQuality = 'high'
        ctx.drawImage(img, 0, 0, width, height)

        // Check if the image has actual pixel transparency (any non-255 alpha values)
        const imageData = ctx.getImageData(0, 0, width, height)
        const hasTransparency = imageData.data.some((val, idx) => idx % 4 === 3 && val < 255)

        const dataUrl = hasTransparency
          ? canvas.toDataURL('image/png')
          : canvas.toDataURL('image/jpeg', quality)

        resolve(dataUrl)
      } catch (error) {
        reject(error)
      } finally {
        URL.revokeObjectURL(objectUrl)
      }
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('فشل في تحميل الصورة'))
    }
    img.src = objectUrl
  })
}
