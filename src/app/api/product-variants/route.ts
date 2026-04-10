import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";

// GET: List variants for a product (?productId=X)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");

    if (!productId) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد المنتج" },
        { status: 400 }
      );
    }

    const variants = await db.productVariant.findMany({
      where: { productId },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, data: variants });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch variants";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST: Create variant
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { productId, name, sku, barcode, costPrice, sellPrice, stock } = body;

    if (!productId || !name?.trim()) {
      return NextResponse.json(
        { success: false, error: "يرجى إدخال اسم المتغير وتحديد المنتج" },
        { status: 400 }
      );
    }

    // Verify product exists
    const product = await db.product.findUnique({ where: { id: productId } });
    if (!product) {
      return NextResponse.json(
        { success: false, error: "المنتج غير موجود" },
        { status: 404 }
      );
    }

    // Check for duplicate SKU
    if (sku?.trim()) {
      const existingSku = await db.productVariant.findUnique({
        where: { sku: sku.trim() },
      });
      if (existingSku) {
        return NextResponse.json(
          { success: false, error: "رمز SKU موجود مسبقاً" },
          { status: 400 }
        );
      }
    }

    const variant = await db.productVariant.create({
      data: {
        productId,
        name: name.trim(),
        sku: sku?.trim() || null,
        barcode: barcode?.trim() || null,
        costPrice: Number(costPrice) || 0,
        sellPrice: Number(sellPrice) || 0,
        stock: Number(stock) || 0,
      },
    });

    logAction({
      action: "create",
      entity: "ProductVariant",
      entityId: variant.id,
      details: { productId, name: name.trim(), sellPrice, stock },
    });

    return NextResponse.json({ success: true, data: variant }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create variant";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT: Update variant (?id=X)
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد المتغير" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { name, sku, barcode, costPrice, sellPrice, stock, isActive } = body;

    // Check for duplicate SKU (exclude current variant)
    if (sku?.trim()) {
      const existingSku = await db.productVariant.findUnique({
        where: { sku: sku.trim() },
      });
      if (existingSku && existingSku.id !== id) {
        return NextResponse.json(
          { success: false, error: "رمز SKU موجود مسبقاً" },
          { status: 400 }
        );
      }
    }

    const updated = await db.productVariant.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name: name.trim() } : {}),
        ...(sku !== undefined ? { sku: sku?.trim() || null } : {}),
        ...(barcode !== undefined ? { barcode: barcode?.trim() || null } : {}),
        ...(costPrice !== undefined ? { costPrice: Number(costPrice) || 0 } : {}),
        ...(sellPrice !== undefined ? { sellPrice: Number(sellPrice) || 0 } : {}),
        ...(stock !== undefined ? { stock: Number(stock) || 0 } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
    });

    logAction({
      action: "update",
      entity: "ProductVariant",
      entityId: id,
      details: { name, sellPrice, stock, isActive },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update variant";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE: Delete variant (?id=X)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "يرجى تحديد المتغير" },
        { status: 400 }
      );
    }

    await db.productVariant.delete({
      where: { id },
    });

    logAction({
      action: "delete",
      entity: "ProductVariant",
      entityId: id,
      details: { reason: "تم حذف المتغير" },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete variant";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
