import { db } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
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

export const GET = withAuth(tryCatch(async () => {
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
      costPrice: product.costPrice,
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
      reorderCost,
      totalSold: product.totalSold,
      daysRemaining: null as number | null,
    };
  });

  // Estimate days remaining for each alert product based on last 30 days sales
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get sales data for the last 30 days
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

  // Separate counts by severity
  const outOfStockCount = alerts.filter((a) => a.severity === "out").length;
  const criticalCount = alerts.filter((a) => a.severity === "critical").length;
  const lowStockCount = alerts.filter((a) => a.severity === "low").length;

  // Summary statistics
  const totalReorderCost = alerts.reduce((sum, a) => sum + a.reorderCost, 0);
  const avgDeficit = alerts.length > 0
    ? Math.round(alerts.reduce((sum, a) => sum + a.deficit, 0) / alerts.length)
    : 0;

  return successResponse({
    alerts,
    summary: {
      total: alerts.length,
      outOfStock: outOfStockCount,
      critical: criticalCount,
      lowStock: lowStockCount,
      totalReorderCost,
      avgDeficit,
    },
  });
}, 'فشل في جلب تنبيهات المخزون'));
