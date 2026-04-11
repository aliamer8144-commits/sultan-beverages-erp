import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { withAuth } from "@/lib/auth-middleware";
import { serverError } from "@/lib/api-response";

export const GET = withAuth(async () => {
  try {
    // Fetch all active products ordered by stock level
    const products = await db.product.findMany({
      where: {
        isActive: true,
      },
      select: {
        id: true,
        name: true,
        quantity: true,
        minQuantity: true,
        price: true,
        costPrice: true,
        barcode: true,
        image: true,
        category: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            invoiceItems: true,
          },
        },
      },
      orderBy: {
        quantity: "asc",
      },
    });

    // Filter: products where quantity <= minQuantity (low stock or out of stock)
    // Include products that are near the threshold (within 50% buffer)
    const alerts = products
      .filter((product) => product.quantity <= product.minQuantity)
      .map((product) => {
        // Calculate severity: out (0), critical (< 25% of min), low (< 100% of min)
        let severity: "out" | "critical" | "low" = "low";
        if (product.quantity === 0) {
          severity = "out";
        } else if (product.quantity <= product.minQuantity * 0.25) {
          severity = "critical";
        }

        // Calculate reorder suggestion (restock to 2x minQuantity)
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
          categoryName: product.category?.name || "بدون تصنيف",
          categoryId: product.category?.id || null,
          status: product.quantity === 0 ? ("out" as const) : ("low" as const),
          severity,
          deficit: product.minQuantity - product.quantity,
          stockPercentage: product.minQuantity > 0
            ? Math.round((product.quantity / product.minQuantity) * 100)
            : 0,
          suggestedOrder,
          reorderCost,
          totalSold: product._count.invoiceItems,
          // Days of stock remaining (rough estimate based on recent sales)
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

    return NextResponse.json({
      success: true,
      data: alerts,
      summary: {
        total: alerts.length,
        outOfStock: outOfStockCount,
        critical: criticalCount,
        lowStock: lowStockCount,
        totalReorderCost,
        avgDeficit,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في جلب تنبيهات المخزون";
    return serverError(message);
  }
});
