import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, updateCustomerSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFound } from "@/lib/api-response";
import { tryCatch, getRequiredParam } from "@/lib/api-error-handler";

/**
 * PUT /api/customers/[id] — Update a customer
 */
export const PUT = withAuth(tryCatch(async (request, context) => {
  const id = getRequiredParam(context.params, 'id');

  const body = await request.json();
  const validation = validateBody(updateCustomerSchema, body);
  if (!validation.success) return errorResponse(validation.error, 422);

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing) return notFound("العميل غير موجود");

  const updated = await db.customer.update({
    where: { id },
    data: validation.data,
  });

  const user = getRequestUser(request);
  logAction({
    action: "update",
    entity: "Customer",
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: { name: updated.name },
  });

  return successResponse(updated);
}, 'فشل في تحديث بيانات العميل'));

/**
 * DELETE /api/customers/[id] — Delete a customer
 */
export const DELETE = withAuth(tryCatch(async (request, context) => {
  const id = getRequiredParam(context.params, 'id');

  const existing = await db.customer.findUnique({ where: { id } });
  if (!existing) return notFound("العميل غير موجود");

  // Check for invoices before soft-deleting
  const invoiceCount = await db.invoice.count({
    where: { customerId: id },
  });
  if (invoiceCount > 0) {
    return errorResponse('لا يمكن حذف عميل لديه فواتير — يمكنك تعطيله بدلاً من ذلك', 400);
  }

  await db.customer.update({
    where: { id },
    data: { deletedAt: new Date(), isActive: false },
  });

  const user = getRequestUser(request);
  logAction({
    action: "delete",
    entity: "Customer",
    entityId: id,
    userId: user?.userId,
    userName: user?.username,
    details: { name: existing.name },
  });

  return successResponse({ deleted: true });
}, 'فشل في حذف العميل'), { requireManager: true });
