import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
      ];
    }

    if (category) {
      where.category = category;
    }

    const customers = await db.customer.findMany({
      where: Object.keys(where).length > 0 ? where : undefined,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ success: true, data: customers });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch customers";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, phone, category, notes } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: "Name is required" },
        { status: 400 }
      );
    }

    if (phone) {
      const existingCustomer = await db.customer.findFirst({
        where: { phone },
      });

      if (existingCustomer) {
        return NextResponse.json(
          { success: false, error: "A customer with this phone already exists" },
          { status: 409 }
        );
      }
    }

    const customer = await db.customer.create({
      data: {
        name,
        phone,
        category: category || "عادي",
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: customer }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create customer";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, phone, debt, category, notes } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const data: Record<string, unknown> = {};
    if (name !== undefined) data.name = name;
    if (phone !== undefined) data.phone = phone;
    if (debt !== undefined) data.debt = debt;
    if (category !== undefined) data.category = category;
    if (notes !== undefined) data.notes = notes;

    const updated = await db.customer.update({
      where: { id },
      data,
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update customer";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    await db.customer.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete customer";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
