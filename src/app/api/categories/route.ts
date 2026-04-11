import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, createCategorySchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";

/**
 * GET /api/categories — List all categories with product count
 */
export const GET = withAuth(async () => {
  try {
    const categories = await db.category.findMany({
      include: { _count: { select: { products: true } } },
      orderBy: { createdAt: "desc" },
    });
    return successResponse(categories);
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في تحميل الفئات";
    return errorResponse(message, 500);
  }
});

/**
 * POST /api/categories — Create a new category
 */
export const POST = withAuth(async (request: NextRequest) => {
  try {
    const body = await request.json();
    const user = getRequestUser(request);
    const validation = validateBody(createCategorySchema, body);
    if (!validation.success) return errorResponse(validation.error, 422);

    const { name } = validation.data;
    const icon = body.icon || "CupSoda";

    const existing = await db.category.findUnique({ where: { name } });
    if (existing) return errorResponse("اسم الفئة موجود بالفعل", 409);

    const category = await db.category.create({
      data: { name, icon },
    });

    logAction({
      action: "create",
      entity: "Category",
      entityId: category.id,
      userId: user?.userId,
      userName: user?.username,
      details: { name, icon },
    });

    return successResponse(category, 201);
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في إنشاء الفئة";
    return errorResponse(message, 500);
  }
});
