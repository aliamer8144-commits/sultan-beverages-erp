import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { withAuth, getRequestUser } from '@/lib/auth-middleware'
import { successResponse, errorResponse, serverError, notFound } from '@/lib/api-response'
import { logAction } from '@/lib/audit-logger'
import { validateBody, createProductVariantSchema, updateProductVariantSchema } from '@/lib/validations'

// GET: List variants for a product (?productId=X)
export const GET = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const productId = searchParams.get('productId')

    if (!productId) {
      return errorResponse('يرجى تحديد المنتج')
    }

    const variants = await db.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: 'asc' },
    })

    return successResponse(variants)
  } catch (error) {
    console.error('Error fetching variants:', error)
    return serverError('فشل في جلب المتغيرات')
  }
})

// POST: Create variant
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json()
    const validation = validateBody(createProductVariantSchema, body)
    if (!validation.success) return errorResponse(validation.error)

    const { productId, name, sku, barcode, costPrice, sellPrice, stock } = validation.data
    const user = getRequestUser(request)

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: productId } })
    if (!product) return notFound('المنتج غير موجود')

    // Check for duplicate SKU
    if (sku?.trim()) {
      const existingSku = await db.productVariant.findUnique({
        where: { sku: sku.trim() },
      })
      if (existingSku) {
        return errorResponse('رمز SKU موجود مسبقاً')
      }
    }

    const variant = await db.productVariant.create({
      data: {
        productId,
        name: name.trim(),
        sku: sku?.trim() || null,
        barcode: barcode?.trim() || null,
        costPrice: Number(costPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        stock: Number(stock) || 0,
      },
    })

    logAction({
      action: 'create',
      entity: 'ProductVariant',
      entityId: variant.id,
      userId: user?.userId,
      userName: user?.username,
      details: { productId, name: name.trim(), sellPrice, stock },
    })

    return successResponse(variant, 201)
  } catch (error) {
    console.error('Error creating variant:', error)
    return serverError('فشل في إنشاء المتغير')
  }
})

// PUT: Update variant (?id=X)
export const PUT = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('يرجى تحديد المتغير')

    const body = await request.json()
    const validation = validateBody(updateProductVariantSchema, body)
    if (!validation.success) return errorResponse(validation.error)

    const { name, sku, barcode, costPrice, sellPrice, stock, isActive } = validation.data
    const user = getRequestUser(request)

    // Check for duplicate SKU (exclude current variant)
    if (sku?.trim()) {
      const existingSku = await db.productVariant.findUnique({
        where: { sku: sku.trim() },
      })
      if (existingSku && existingSku.id !== id) {
        return errorResponse('رمز SKU موجود مسبقاً')
      }
    }

    const updated = await db.productVariant.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(sku !== undefined ? { sku: sku?.trim() || null } : {}),
        ...(barcode !== undefined ? { barcode: barcode?.trim() || null } : {}),
        ...(costPrice !== undefined ? { costPrice: Number(costPrice) || 0 } : {}),
        ...(sellPrice !== undefined ? { sellPrice: Number(sellPrice) || 0 } : {}),
        ...(stock !== undefined ? { stock: Number(stock) || 0 } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    })

    logAction({
      action: 'update',
      entity: 'ProductVariant',
      entityId: id,
      userId: user?.userId,
      userName: user?.username,
      details: { name, sellPrice, stock, isActive },
    })

    return successResponse(updated)
  } catch (error) {
    console.error('Error updating variant:', error)
    return serverError('فشل في تحديث المتغير')
  }
})

// DELETE: Delete variant (?id=X)
export const DELETE = withAuth(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) return errorResponse('يرجى تحديد المتغير')

    await db.productVariant.delete({
      where: { id },
    })

    const user = getRequestUser(request)
    logAction({
      action: 'delete',
      entity: 'ProductVariant',
      entityId: id,
      userId: user?.userId,
      userName: user?.username,
      details: { reason: 'تم حذف المتغير' },
    })

    return successResponse({ message: 'تم حذف المتغير بنجاح' })
  } catch (error) {
    console.error('Error deleting variant:', error)
    return serverError('فشل في حذف المتغير')
  }
})
