import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, updateSupplierSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFound } from "@/lib/api-response";
import { tryCatch, getRequiredParam } from "@/lib/api-error-handler";

/**
 * PUT /api/suppliers/[id] — Update a supplier
 */
export const PUT = withAuth(tryCatch(async (request, context) => {
  const id = getRequiredParam(context.params, 'id');

  const body = await request.json();
  const validation = validateBody(updateSupplierSchema, body);
  if (!validation.success) return errorResponse(validation.error, 422);

  const existing = await db.supplier.findUnique({ where: { id } });
  if (!existing) return notFound("المورد غير موجود");

  const updated = await db.supplier.update({
    where: { id },
    data: validation.data,
  });

  const user = getRequestUser(request);
  logAction({
    action: "update",
    entity: "Supplier",
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: { name: updated.name },
  });

  return successResponse(updated);
}, 'فشل في تحديث بيانات المورد'));

/**
 * DELETE /api/suppliers/[id] — Delete a supplier
 */
export const DELETE = withAuth(tryCatch(async (request, context) => {
  const id = getRequiredParam(context.params, 'id');

  const existing = await db.supplier.findUnique({ where: { id } });
  if (!existing) return notFound("المورد غير موجود");

  // Check for invoices before soft-deleting
  const invoiceCount = await db.invoice.count({
    where: { supplierId: id },
  });
  if (invoiceCount > 0) {
    return errorResponse('لا يمكن حذف مورد لديه فواتير — يمكنك تعطيله بدلاً من ذلك', 400);
  }

  await db.supplier.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  const user = getRequestUser(request);
  logAction({
    action: "delete",
    entity: "Supplier",
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: { name: existing.name },
  });

  return successResponse({ deleted: true });
}, 'فشل في حذف المورد'), { requireManager: true });
