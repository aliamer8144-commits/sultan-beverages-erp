import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, updateCustomerSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFound } from "@/lib/api-response";

/**
 * PUT /api/customers/[id] — Update a customer
 */
export const PUT = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = (await context.params) ?? {};
    if (!id) return errorResponse("معرف العميل مطلوب");

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في تحديث بيانات العميل";
    return errorResponse(message, 500);
  }
});

/**
 * DELETE /api/customers/[id] — Delete a customer
 */
export const DELETE = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = (await context.params) ?? {};
    if (!id) return errorResponse("معرف العميل مطلوب");

    const existing = await db.customer.findUnique({ where: { id } });
    if (!existing) return notFound("العميل غير موجود");

    await db.customer.delete({ where: { id } });

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في حذف العميل";
    return errorResponse(message, 500);
  }
});
