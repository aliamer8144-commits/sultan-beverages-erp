import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    // Fetch all active products and filter where quantity <= minQuantity
    // (Prisma doesn't natively support field-to-field comparison in where clauses)
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
        category: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        quantity: "asc",
      },
    });

    // Filter: products where quantity <= minQuantity (low stock or out of stock)
    const alerts = products
      .filter((product) => product.quantity <= product.minQuantity)
      .map((product) => ({
        id: product.id,
        name: product.name,
        quantity: product.quantity,
        minQuantity: product.minQuantity,
        price: product.price,
        categoryName: product.category?.name || "بدون تصنيف",
        status: product.quantity === 0 ? ("out" as const) : ("low" as const),
        deficit: product.minQuantity - product.quantity,
      }));

    // Separate counts
    const outOfStockCount = alerts.filter((a) => a.status === "out").length;
    const lowStockCount = alerts.filter((a) => a.status === "low").length;

    return NextResponse.json({
      success: true,
      data: alerts,
      summary: {
        total: alerts.length,
        outOfStock: outOfStockCount,
        lowStock: lowStockCount,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في جلب تنبيهات المخزون";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
