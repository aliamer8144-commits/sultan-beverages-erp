import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, updateCategorySchema } from "@/lib/validations";
import { successResponse, errorResponse, notFound } from "@/lib/api-response";
import { tryCatch } from "@/lib/api-error-handler";

/**
 * PUT /api/categories/[id] — Update a category
 */
export const PUT = withAuth(tryCatch(async (request, context) => {
  const { id } = context.params ?? {};
  if (!id) return errorResponse("معرف الفئة مطلوب");

  const body = await request.json();
  const validation = validateBody(updateCategorySchema, body);
  if (!validation.success) return errorResponse(validation.error, 422);

  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) return notFound("الفئة غير موجودة");

  const updated = await db.category.update({
    where: { id },
    data: validation.data,
    include: { _count: { select: { products: true } } },
  });

  const user = getRequestUser(request);
  logAction({
    action: "update",
    entity: "Category",
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: { name: updated.name },
  });

  return successResponse(updated);
}, 'فشل في تحديث الفئة'));

/**
 * DELETE /api/categories/[id] — Delete a category
 */
export const DELETE = withAuth(tryCatch(async (request, context) => {
  const { id } = context.params ?? {};
  if (!id) return errorResponse("معرف الفئة مطلوب");

  const existing = await db.category.findUnique({ where: { id } });
  if (!existing) return notFound("الفئة غير موجودة");

  await db.category.delete({ where: { id } });

  const user = getRequestUser(request);
  logAction({
    action: "delete",
    entity: "Category",
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: { name: existing.name },
  });

  return successResponse({ deleted: true });
}, 'فشل في حذف الفئة'));
