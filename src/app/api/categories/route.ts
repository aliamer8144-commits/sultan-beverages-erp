import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET /api/categories - Fetch all categories with product count
export async function GET() {
  try {
    const categories = await db.category.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: categories });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch categories";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST /api/categories - Create a new category
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, icon = "CupSoda" } = body;

    // Check if category name already exists
    const existing = await db.category.findUnique({
      where: { name },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: "Category with this name already exists" },
        { status: 409 }
      );
    }

    const category = await db.category.create({
      data: { name, icon },
    });

    return NextResponse.json({ success: true, data: category }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create category";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/categories - Update an existing category
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, icon } = body;

    const updated = await db.category.update({
      where: { id },
      data: { name, icon },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update category";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// DELETE /api/categories - Delete a category
export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    await db.category.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete category";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
