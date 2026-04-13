import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import {
  validateBody,
  createProductSchema,
  bulkImportSchema,
  batchUpdateSchema,
  deleteProductsSchema,
} from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { tryCatch } from "@/lib/api-error-handler";

/** Fields to exclude for non-admin users */
function sanitizeProduct(product: Record<string, unknown>, isAdmin: boolean) {
  if (isAdmin) return product;
  const { costPrice: _cost, ...rest } = product;
  return rest;
}

/**
 * GET /api/products — List products with filters
 */
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const categoryId = searchParams.get("categoryId") || "";
  const lowStock = searchParams.get("lowStock") === "true";
  const barcode = searchParams.get("barcode") || "";
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));

  const where: Record<string, unknown> = {};

  if (search) where.name = { contains: search };
  if (categoryId) where.categoryId = categoryId;
  if (lowStock) {
    where.quantity = { lte: 5 };
    where.isActive = true;
  }
  if (barcode) where.barcode = barcode;

  const whereClause = Object.keys(where).length > 0 ? where : undefined;

  const user = getRequestUser(request);
  const isAdmin = user?.role === 'admin';

  const [products, total] = await Promise.all([
    db.product.findMany({
      where: whereClause,
      include: {
        category: { select: { id: true, name: true, icon: true } },
        _count: { select: { variants: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.product.count({ where: whereClause }),
  ]);

  const safeProducts = products.map((p) => sanitizeProduct({ ...p }, isAdmin));

  return successResponse({ products: safeProducts, total, page, totalPages: Math.ceil(total / limit) });
}, 'فشل في تحميل المنتجات'));

/**
 * POST /api/products — Create single product OR bulk import
 */
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json();
  const user = getRequestUser(request);

  // ── Bulk import ──
  const bulkCheck = validateBody(bulkImportSchema, body);
  if (bulkCheck.success) {
    const { products } = bulkCheck.data;
    let created = 0;
    let skipped = 0;

    const existingProducts = await db.product.findMany({ select: { name: true } });
    const existingNames = new Set(existingProducts.map((p) => p.name.toLowerCase()));

    const validProducts = products
      .map((item) => ({
        ...item,
        name: item.name.trim(),
      }))
      .filter(
        (item) => item.name && !existingNames.has(item.name.toLowerCase())
      );

    if (validProducts.length > 0) {
      await db.product.createMany({
        data: validProducts.map((item) => ({
          name: item.name,
          categoryId: item.categoryId || '',
          price: item.price,
          costPrice: item.costPrice || 0,
          quantity: item.quantity || 0,
          minQuantity: 5,
          barcode: item.barcode?.trim() || null,
        })),
        skipDuplicates: true,
      });
      created = validProducts.length;
    }
    skipped = products.length - created;

    logAction({
      action: "bulk_import",
      entity: "Product",
      userId: user?.userId,
      userName: user?.username,
      details: { created, skipped, total: products.length },
    });

    return successResponse({ created, skipped }, 201);
  }

  // ── Single product creation ──
  const validation = validateBody(createProductSchema, body);
  if (!validation.success) return errorResponse(validation.error, 422);

  const { name, categoryId, price, costPrice, quantity, minQuantity, barcode, image } = validation.data;

  const product = await db.product.create({
    data: {
      name,
      categoryId: categoryId || '',
      price,
      costPrice,
      quantity: quantity ?? 0,
      minQuantity: minQuantity ?? 5,
      barcode,
      image,
    },
  });

  logAction({
    action: "create",
    entity: "Product",
    entityId: product.id,
    userId: user?.userId,
    userName: user?.username,
    details: { name, price, costPrice, quantity: quantity ?? 0 },
  });

  return successResponse(product, 201);
}, 'فشل في إنشاء المنتج'));

/**
 * PATCH /api/products — Batch update (price change, category change, status)
 */
export const PATCH = withAuth(tryCatch(async (request) => {
  const body = await request.json();
  const user = getRequestUser(request);
  const validation = validateBody(batchUpdateSchema, body);
  if (!validation.success) return errorResponse(validation.error, 422);

  const { ids, price, categoryId, isActive, priceChangeType, priceChangeValue } = validation.data;

  // Build update data dynamically
  const updateData: Record<string, unknown> = {};

  if (priceChangeType && priceChangeValue !== undefined) {
    if (priceChangeType === "fixed") {
      updateData.price = Number(priceChangeValue);
    } else if (priceChangeType === "percentage") {
      const currentProducts = await db.product.findMany({
        where: { id: { in: ids } },
        select: { id: true, price: true },
      });

      const priceUpdates = currentProducts.map((p) => {
        const newPrice = Math.max(0, Number((p.price * (1 + Number(priceChangeValue) / 100)).toFixed(2)));
        return db.product.update({ where: { id: p.id }, data: { price: newPrice } });
      });

      await Promise.all(priceUpdates);

      logAction({
        action: "batch_update",
        entity: "Product",
        userId: user?.userId,
        userName: user?.username,
        details: { ids, count: ids.length, priceChangeType, priceChangeValue },
      });

      return successResponse({ count: ids.length });
    }
  } else if (price !== undefined) {
    updateData.price = Number(price);
  }

  if (categoryId) updateData.categoryId = categoryId;
  if (isActive !== undefined) updateData.isActive = isActive;

  let count = 0;
  if (Object.keys(updateData).length > 0) {
    const result = await db.product.updateMany({
      where: { id: { in: ids } },
      data: updateData,
    });
    count = result.count;
  } else {
    return errorResponse("لا توجد تغييرات للتطبيق");
  }

  logAction({
    action: "batch_update",
    entity: "Product",
    userId: user?.userId,
    userName: user?.username,
    details: { ids, count, priceChangeType: priceChangeType || null, newCategoryId: categoryId || null, newIsActive: isActive ?? null },
  });

  return successResponse({ count });
}, 'فشل في تحديث المنتجات'));

/**
 * DELETE /api/products — Bulk delete (single ID or array of IDs)
 */
export const DELETE = withAuth(tryCatch(async (request) => {
  const body = await request.json();
  const user = getRequestUser(request);
  const validation = validateBody(deleteProductsSchema, body);
  if (!validation.success) return errorResponse(validation.error);

  const { id, ids } = validation.data;

  if (ids && ids.length > 0) {
    const result = await db.product.deleteMany({ where: { id: { in: ids } } });

    logAction({
      action: "bulk_delete",
      entity: "Product",
      userId: user?.userId,
      userName: user?.username,
      details: { reason: `حذف ${result.count} منتج دفعة واحدة`, ids },
    });

    return successResponse({ count: result.count });
  }

  if (id) {
    const existing = await db.product.findUnique({ where: { id } });
    await db.product.delete({ where: { id } });

    logAction({
      action: "delete",
      entity: "Product",
      entityId: id,
      userId: user?.userId,
      userName: user?.username,
      details: { name: existing?.name },
    });

    return successResponse({ deleted: true });
  }

  return errorResponse("يرجى تحديد منتج واحد على الأقل");
}, 'فشل في حذف المنتج(ات)'));
