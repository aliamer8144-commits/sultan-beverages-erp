import { db } from "@/lib/db";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { successResponse } from "@/lib/api-response";
import { tryCatch } from "@/lib/api-error-handler";

interface RawAlertRow {
  id: string;
  name: string;
  quantity: number;
  minQuantity: number;
  price: number;
  costPrice: number;
  barcode: string | null;
  image: string | null;
  categoryName: string | null;
  categoryId: string | null;
  categoryIcon: string | null;
  totalSold: number;
}

interface RawAlertCountRow {
  total: bigint;
  outOfStock: bigint;
  critical: bigint;
  lowStock: bigint;
  totalDeficit: bigint;
  totalReorderCost: bigint;
}

export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
  const offset = (page - 1) * limit;
  const user = getRequestUser(request);
  const isAdmin = user?.role === 'admin';

  // Get total counts and severity breakdown (single aggregate query)
  const [countResult] = await db.$queryRaw<RawAlertCountRow[]>`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN p."quantity" = 0 THEN 1 ELSE 0 END) as "outOfStock",
      SUM(CASE WHEN p."quantity" > 0 AND p."quantity" <= p."minQuantity" * 0.25 THEN 1 ELSE 0 END) as critical,
      SUM(CASE WHEN p."quantity" > p."minQuantity" * 0.25 THEN 1 ELSE 0 END) as "lowStock",
      SUM(CASE WHEN p."minQuantity" > 0 THEN p."minQuantity" - p."quantity" ELSE 0 END) as "totalDeficit",
      SUM(CASE WHEN p."minQuantity" > 0 THEN (p."minQuantity" * 2 - p."quantity") * p."costPrice" ELSE 0 END) as "totalReorderCost"
    FROM "Product" p
    WHERE p."isActive" = true AND p."quantity" <= p."minQuantity"
  `;

  const totalAlerts = Number(countResult.total);
  const outOfStockCount = Number(countResult.outOfStock);
  const criticalCount = Number(countResult.critical);
  const lowStockCount = Number(countResult.lowStock);
  const totalDeficit = Number(countResult.totalDeficit);
  const totalReorderCostAll = Number(countResult.totalReorderCost);
  const totalPages = Math.ceil(totalAlerts / limit);

  // Fetch only the current page of low-stock products (SQL-level pagination)
  const rawAlerts = await db.$queryRaw<RawAlertRow[]>`
    SELECT
      p.id,
      p.name,
      p."quantity",
      p."minQuantity",
      p.price,
      p."costPrice",
      p.barcode,
      p.image,
      c.name as "categoryName",
      c.id as "categoryId",
      c.icon as "categoryIcon",
      (SELECT COUNT(*) FROM "InvoiceItem" ii WHERE ii."productId" = p.id)::int as "totalSold"
    FROM "Product" p
    LEFT JOIN "Category" c ON p."categoryId" = c.id
    WHERE p."isActive" = true AND p."quantity" <= p."minQuantity"
    ORDER BY p."quantity" ASC
    LIMIT ${limit} OFFSET ${offset}
  `;

  // Build alert objects with computed severity, deficit, etc.
  const alerts = rawAlerts.map((product) => {
    let severity: "out" | "critical" | "low" = "low";
    if (product.quantity === 0) {
      severity = "out";
    } else if (product.minQuantity > 0 && product.quantity <= product.minQuantity * 0.25) {
      severity = "critical";
    }

    const suggestedOrder = Math.max(product.minQuantity * 2 - product.quantity, 0);
    const reorderCost = suggestedOrder * product.costPrice;

    return {
      id: product.id,
      name: product.name,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      price: product.price,
      ...(isAdmin ? { costPrice: product.costPrice } : {}),
      barcode: product.barcode,
      image: product.image,
      categoryName: product.categoryName || "بدون تصنيف",
      categoryId: product.categoryId || null,
      status: product.quantity === 0 ? ("out" as const) : ("low" as const),
      severity,
      deficit: product.minQuantity - product.quantity,
      stockPercentage: product.minQuantity > 0
        ? Math.round((product.quantity / product.minQuantity) * 100)
        : 0,
      suggestedOrder,
      ...(isAdmin ? { reorderCost } : {}),
      totalSold: product.totalSold,
      daysRemaining: null as number | null,
    };
  });

  // Estimate days remaining for each alert product based on last 30 days sales
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get sales data for the last 30 days (only for current page items)
  const recentSalesData = await db.invoiceItem.groupBy({
    by: ["productId"],
    where: {
      invoice: {
        type: "sale",
        createdAt: { gte: thirtyDaysAgo },
      },
      productId: { in: alerts.map((a) => a.id) },
    },
    _sum: { quantity: true },
  });

  // Build a map of productId -> total sold in last 30 days
  const salesMap = new Map<string, number>();
  for (const item of recentSalesData) {
    salesMap.set(item.productId, item._sum.quantity ?? 0);
  }

  // Calculate days remaining
  for (const alert of alerts) {
    const soldLast30Days = salesMap.get(alert.id) ?? 0;
    if (soldLast30Days > 0 && alert.quantity > 0) {
      const dailyRate = soldLast30Days / 30;
      alert.daysRemaining = Math.round(alert.quantity / dailyRate);
    } else {
      alert.daysRemaining = null; // No sales data or out of stock
    }
  }

  // Average deficit across all alerts
  const avgDeficit = totalAlerts > 0
    ? Math.round(totalDeficit / totalAlerts)
    : 0;

  return successResponse({
    alerts,
    pagination: {
      total: totalAlerts,
      page,
      limit,
      totalPages,
    },
    summary: {
      total: totalAlerts,
      outOfStock: outOfStockCount,
      critical: criticalCount,
      lowStock: lowStockCount,
      ...(isAdmin ? { totalReorderCost: Math.round(totalReorderCostAll * 100) / 100 } : {}),
      avgDeficit,
    },
  });
}, 'فشل في جلب تنبيهات المخزون'));
