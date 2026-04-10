import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const barcode = searchParams.get("barcode") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.name = { contains: search };
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (lowStock) {
      where.quantity = { lte: 5 };
    }

    if (barcode) {
      where.barcode = barcode;
    }

    const products = await db.product.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      include: {
        category: true,
        _count: { select: { variants: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: products });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch products";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, categoryId, price, costPrice, quantity, minQuantity, barcode, image } = body;

    // Validate image size (max ~500KB base64)
    if (image && typeof image === 'string') {
      if (!image.startsWith('data:image/')) {
        return NextResponse.json({ success: false, error: 'صيغة الصورة غير مدعومة' }, { status: 400 });
      }
      if (image.length > 700000) {
        return NextResponse.json({ success: false, error: 'حجم الصورة كبير جداً (الحد الأقصى 500 كيلوبايت)' }, { status: 400 });
      }
    }

    const product = await db.product.create({
      data: {
        name,
        categoryId,
        price,
        costPrice,
        quantity: quantity ?? 0,
        minQuantity: minQuantity ?? 5,
        barcode,
        image,
      },
    });

    // Log product creation
    logAction({
      action: 'create',
      entity: 'Product',
      entityId: product.id,
      details: { name, price, costPrice, quantity: quantity ?? 0 },
    });

    return NextResponse.json({ success: true, data: product }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create product";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, categoryId, price, costPrice, quantity, minQuantity, barcode, image, isActive } = body;

    // Validate image size
    if (image && typeof image === 'string' && image.length > 0) {
      if (!image.startsWith('data:image/')) {
        return NextResponse.json({ success: false, error: 'صيغة الصورة غير مدعومة' }, { status: 400 });
      }
      if (image.length > 700000) {
        return NextResponse.json({ success: false, error: 'حجم الصورة كبير جداً (الحد الأقصى 500 كيلوبايت)' }, { status: 400 });
      }
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        name,
        categoryId,
        price,
        costPrice,
        quantity,
        minQuantity,
        barcode,
        image,
        isActive,
      },
    });

    // Log product update
    logAction({
      action: 'update',
      entity: 'Product',
      entityId: id,
      details: { name, price, costPrice, quantity },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update product";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { ids, price, categoryId, isActive, priceChangeType, priceChangeValue } = body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ success: false, error: "يرجى تحديد منتج واحد على الأقل" }, { status: 400 });
    }

    // Build update data dynamically
    const updateData: Record<string, unknown> = {};

    // Price change
    if (priceChangeType && priceChangeValue !== undefined) {
      if (priceChangeType === "fixed") {
        updateData.price = Number(priceChangeValue);
      } else if (priceChangeType === "percentage") {
        // Fetch current products to calculate percentage
        const currentProducts = await db.product.findMany({
          where: { id: { in: ids } },
          select: { id: true, price: true },
        });

        const priceUpdates = currentProducts.map((p) => {
          const newPrice = Math.max(0, Number((p.price * (1 + Number(priceChangeValue) / 100)).toFixed(2)));
          return db.product.update({
            where: { id: p.id },
            data: { price: newPrice },
          });
        });

        await Promise.all(priceUpdates);
      }
    } else if (price !== undefined) {
      updateData.price = Number(price);
    }

    // Category change
    if (categoryId) {
      updateData.categoryId = categoryId;
    }

    // Status change
    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    let count = 0;

    // If we have non-percentage updates to apply
    if (Object.keys(updateData).length > 0) {
      const result = await db.product.updateMany({
        where: { id: { in: ids } },
        data: updateData,
      });
      count = result.count;
    } else if (priceChangeType === "percentage") {
      // We already updated via Promise.all above
      count = ids.length;
    } else {
      return NextResponse.json({ success: false, error: "لا توجد تغييرات للتطبيق" }, { status: 400 });
    }

    // Log batch operation
    logAction({
      action: "batch_update",
      entity: "Product",
      details: {
        ids,
        count,
        priceChangeType: priceChangeType || null,
        priceChangeValue: priceChangeValue || null,
        newCategoryId: categoryId || null,
        newIsActive: isActive !== undefined ? isActive : null,
      },
    });

    return NextResponse.json({ success: true, data: { count } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to batch update products";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    await db.product.delete({
      where: { id },
    });

    // Log product deletion
    logAction({
      action: 'delete',
      entity: 'Product',
      entityId: id,
      details: { reason: 'تم حذف المنتج' },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete product";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
