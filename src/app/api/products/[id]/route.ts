import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, updateProductSchema } from "@/lib/validations";
import { successResponse, errorResponse, notFound } from "@/lib/api-response";

/**
 * PUT /api/products/[id] — Update a single product
 */
export const PUT = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = (await context.params) ?? {};
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في تحديث المنتج";
    return errorResponse(message, 500);
  }
});

/**
 * DELETE /api/products/[id] — Delete a single product
 */
export const DELETE = withAuth(async (request: NextRequest, context) => {
  try {
    const { id } = (await context.params) ?? {};
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
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في حذف المنتج";
    return errorResponse(message, 500);
  }
});
