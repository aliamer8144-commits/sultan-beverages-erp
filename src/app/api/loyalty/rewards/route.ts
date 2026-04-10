import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Get available rewards based on points balance
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");

    if (!customerId) {
      return NextResponse.json(
        { success: false, error: "Customer ID is required" },
        { status: 400 }
      );
    }

    const customer = await db.customer.findUnique({
      where: { id: customerId },
      select: { loyaltyPoints: true },
    });

    if (!customer) {
      return NextResponse.json(
        { success: false, error: "Customer not found" },
        { status: 404 }
      );
    }

    // Define reward tiers based on points balance
    const points = customer.loyaltyPoints;
    const rewards = [
      {
        id: "small",
        name: "خصم صغير",
        description: "خصم 500 ريال يمني",
        pointsRequired: 100,
        discountValue: 500,
        available: points >= 100,
      },
      {
        id: "medium",
        name: "خصم متوسط",
        description: "خصم 1,500 ريال يمني",
        pointsRequired: 300,
        discountValue: 1500,
        available: points >= 300,
      },
      {
        id: "large",
        name: "خصم كبير",
        description: "خصم 3,000 ريال يمني",
        pointsRequired: 500,
        discountValue: 3000,
        available: points >= 500,
      },
      {
        id: "premium",
        name: "خصم متميز",
        description: "خصم 5,000 ريال يمني",
        pointsRequired: 1000,
        discountValue: 5000,
        available: points >= 1000,
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        currentPoints: points,
        rewards,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch rewards";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
