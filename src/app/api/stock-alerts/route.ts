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

export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));
  const user = getRequestUser(request);
  const isAdmin = user?.role === 'admin';

  // Fetch only products where quantity <= minQuantity (filter at DB level)
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
  const paginatedAlerts = alerts.slice((page - 1) * limit, page * limit);
  const recentSalesData = await db.invoiceItem.groupBy({
    by: ["productId"],
    where: {
      invoice: {
        type: "sale",
        createdAt: { gte: thirtyDaysAgo },
      },
      productId: { in: paginatedAlerts.map((a) => a.id) },
    },
    _sum: { quantity: true },
  });

  // Build a map of productId -> total sold in last 30 days
  const salesMap = new Map<string, number>();
  for (const item of recentSalesData) {
    salesMap.set(item.productId, item._sum.quantity ?? 0);
  }

  // Calculate days remaining (only for paginated items)
  for (const alert of paginatedAlerts) {
    const soldLast30Days = salesMap.get(alert.id) ?? 0;
    if (soldLast30Days > 0 && alert.quantity > 0) {
      const dailyRate = soldLast30Days / 30;
      alert.daysRemaining = Math.round(alert.quantity / dailyRate);
    } else {
      alert.daysRemaining = null; // No sales data or out of stock
    }
  }

  // Separate counts by severity (from all alerts, not just paginated)
  const outOfStockCount = alerts.filter((a) => a.severity === "out").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const lowStockCount = alerts.filter((a) => a.severity === "low").length;
  const totalAlerts = alerts.length;
  const totalPages = Math.ceil(totalAlerts / limit);

  // Summary statistics (admin only for cost)
  const totalReorderCost = isAdmin ? alerts.reduce((sum, a) => sum + (a.reorderCost ?? 0), 0) : 0;
  const avgDeficit = totalAlerts > 0
    ? Math.round(alerts.reduce((sum, a) => sum + a.deficit, 0) / totalAlerts)
    : 0;

  return successResponse({
    alerts: paginatedAlerts,
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
      ...(isAdmin ? { totalReorderCost } : {}),
      avgDeficit,
    },
  });
}, 'فشل في جلب تنبيهات المخزون'));
