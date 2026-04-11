import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, updateSupplierSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFound } from "@/lib/api-response";

/**
 * PUT /api/suppliers/[id] — Update a supplier
 */
export const PUT = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = (await context.params) ?? {};
    if (!id) return errorResponse("معرف المورد مطلوب");

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في تحديث بيانات المورد";
    return errorResponse(message, 500);
  }
});

/**
 * DELETE /api/suppliers/[id] — Delete a supplier
 */
export const DELETE = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = (await context.params) ?? {};
    if (!id) return errorResponse("معرف المورد مطلوب");

    const existing = await db.supplier.findUnique({ where: { id } });
    if (!existing) return notFound("المورد غير موجود");

    await db.supplier.delete({ where: { id } });

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
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في حذف المورد";
    return errorResponse(message, 500);
  }
});
