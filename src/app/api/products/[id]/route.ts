import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, updateProductSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFound } from "@/lib/api-response";
import { tryCatch, getRequiredParam } from "@/lib/api-error-handler";
import { uploadProductImage, deleteProductImage } from "@/lib/storage";

/**
 * PUT /api/products/[id] — Update a single product
 */
export const PUT = withAuth(tryCatch(async (request, context) => {
  const id = getRequiredParam(context.params, 'id');

  const body = await request.json();
  const validation = validateBody(updateProductSchema, body);
  if (!validation.success) return errorResponse(validation.error, 422);

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return notFound("المنتج غير موجود");

  const updateData: Record<string, unknown> = { ...validation.data };

  // Handle image upload/replacement
  if ('image' in updateData && updateData.image !== undefined) {
    const newImage = updateData.image as string | null;

    if (newImage && newImage.startsWith('data:image/')) {
      // New base64 image — upload to Supabase Storage
      const uploadedUrl = await uploadProductImage(newImage, id);
      if (!uploadedUrl) {
        return errorResponse('فشل في رفع الصورة', 500);
      }
      updateData.image = uploadedUrl;

      // Delete old image from storage if it was a Supabase URL
      if (existing.image && existing.image.startsWith('http')) {
        await deleteProductImage(existing.image);
      }
    } else if (newImage === null || newImage === '') {
      // Image removed — delete from storage
      updateData.image = null;
      if (existing.image && existing.image.startsWith('http')) {
        await deleteProductImage(existing.image);
      }
    }
    // If newImage is already a URL, keep it as-is (no upload needed)
  }

  const user = getRequestUser(request);
  const updated = await db.product.update({
    where: { id },
    data: updateData,
    include: { category: true, _count: { select: { variants: true } } },
  });

  logAction({
    action: "update",
    entity: "Product",
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: { name: updated.name, price: updated.price },
  });

  // Strip costPrice for non-admin users
  const isAdmin = user?.role === 'admin';
  const safeProduct = isAdmin
    ? updated
    : (() => { const { costPrice: _c, ...rest } = updated; return rest as typeof updated; })();

  return successResponse(safeProduct);
}, 'فشل في تحديث المنتج'));

/**
 * DELETE /api/products/[id] — Delete a single product
 */
export const DELETE = withAuth(tryCatch(async (request, context) => {
  const id = getRequiredParam(context.params, 'id');

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return notFound("المنتج غير موجود");

  // Delete product image from Storage before deleting the record
  if (existing.image && existing.image.startsWith('http')) {
    await deleteProductImage(existing.image);
  }

  await db.product.delete({ where: { id } });

  const user = getRequestUser(request);
  logAction({
    action: "delete",
    entity: "Product",
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: { name: existing.name },
  });

  return successResponse({ deleted: true });
}, 'فشل في حذف المنتج'));
