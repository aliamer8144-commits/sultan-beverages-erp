import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, updateProductSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFound } from "@/lib/api-response";
import { tryCatch } from "@/lib/api-error-handler";

/**
 * PUT /api/products/[id] — Update a single product
 */
export const PUT = withAuth(tryCatch(async (request, context) => {
  const { id } = context.params ?? {};
  if (!id) return errorResponse("معرف المنتج مطلوب");

  const body = await request.json();
  const validation = validateBody(updateProductSchema, body);
  if (!validation.success) return errorResponse(validation.error, 422);

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return notFound("المنتج غير موجود");

  const user = getRequestUser(request);
  const updated = await db.product.update({
    where: { id },
    data: validation.data,
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

  return successResponse(updated);
}, 'فشل في تحديث المنتج'));

/**
 * DELETE /api/products/[id] — Delete a single product
 */
export const DELETE = withAuth(tryCatch(async (request, context) => {
  const { id } = context.params ?? {};
  if (!id) return errorResponse("معرف المنتج مطلوب");

  const existing = await db.product.findUnique({ where: { id } });
  if (!existing) return notFound("المنتج غير موجود");

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
