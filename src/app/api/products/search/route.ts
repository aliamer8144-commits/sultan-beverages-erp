import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // ── Query Parameters ──────────────────────────────────────────────
    const q = searchParams.get("q") || "";
    const categoryId = searchParams.get("categoryId") || "";
    const minPrice = searchParams.get("minPrice");
    const maxPrice = searchParams.get("maxPrice");
    const inStock = searchParams.get("inStock");
    const sortBy = searchParams.get("sortBy") || "newest";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const skip = (page - 1) * limit;

    // ── Build Where Clause ────────────────────────────────────────────
    const where: Prisma.ProductWhereInput = {
      isActive: true,
    };

    // Full-text search (case-insensitive partial match on name)
    if (q) {
      where.name = {
        contains: q,
        mode: "insensitive",
      };
    }

    // Filter by category
    if (categoryId) {
      where.categoryId = categoryId;
    }

    // Filter by price range
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) {
        where.price.gte = parseFloat(minPrice);
      }
      if (maxPrice) {
        where.price.lte = parseFloat(maxPrice);
      }
    }

    // Filter by stock availability
    if (inStock === "true") {
      where.quantity = {
        gt: 0,
      };
    } else if (inStock === "false") {
      where.quantity = {
        lte: 0,
      };
    }

    // ── Build OrderBy ─────────────────────────────────────────────────
    let orderBy: Prisma.ProductOrderByWithRelationInput;
    switch (sortBy) {
      case "price_asc":
        orderBy = { price: "asc" };
        break;
      case "price_desc":
        orderBy = { price: "desc" };
        break;
      case "name_asc":
        orderBy = { name: "asc" };
        break;
      case "name_desc":
        orderBy = { name: "desc" };
        break;
      case "quantity_asc":
        orderBy = { quantity: "asc" };
        break;
      case "quantity_desc":
        orderBy = { quantity: "desc" };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    // ── Fetch Data ────────────────────────────────────────────────────
    const [products, total] = await Promise.all([
      db.product.findMany({
        where,
        include: {
          category: {
            select: {
              id: true,
              name: true,
              icon: true,
            },
          },
          _count: {
            select: {
              variants: true,
            },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      db.product.count({ where }),
    ]);

    // ── Format Response ───────────────────────────────────────────────
    const formattedProducts = products.map((product) => ({
      id: product.id,
      name: product.name,
      price: product.price,
      costPrice: product.costPrice,
      quantity: product.quantity,
      minQuantity: product.minQuantity,
      barcode: product.barcode,
      image: product.image,
      category: product.category,
      variantCount: product._count.variants,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    }));

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    return NextResponse.json({
      success: true,
      data: formattedProducts,
      pagination: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في البحث عن المنتجات";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
