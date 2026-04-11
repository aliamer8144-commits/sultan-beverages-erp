import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

// GET: Fetch loyalty transactions for a customer (paginated)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const customerId = searchParams.get("customerId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const type = searchParams.get("type"); // earned, redeemed, adjusted

    if (!customerId) {
      // Return loyalty stats for all customers (admin dashboard)
      const [totalEarned, totalRedeemed, customerLeaderboard] = await Promise.all([
        db.loyaltyTransaction.aggregate({
          where: { transactionType: "earned" },
          _sum: { points: true },
        }),
        db.loyaltyTransaction.aggregate({
          where: { transactionType: "redeemed" },
          _sum: { points: true },
        }),
        db.customer.findMany({
          select: {
            id: true,
            name: true,
            phone: true,
            loyaltyPoints: true,
            _count: { select: { loyaltyTransactions: true } },
          },
          orderBy: { loyaltyPoints: "desc" },
          take: 10,
        }),
      ]);

      // Get points activity over last 30 days
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const dailyActivity = await db.loyaltyTransaction.groupBy({
        by: ["createdAt"],
        where: {
          createdAt: { gte: thirtyDaysAgo },
        },
        _sum: { points: true },
        orderBy: { createdAt: "asc" },
      });

      // Group by date
      const activityByDate: Record<string, { earned: number; redeemed: number }> = {};
      for (const item of dailyActivity) {
        const dateKey = item.createdAt.toISOString().split("T")[0];
        if (!activityByDate[dateKey]) {
          activityByDate[dateKey] = { earned: 0, redeemed: 0 };
        }
        if (item._sum.points) {
          if (item._sum.points > 0) {
            activityByDate[dateKey].earned += item._sum.points;
          } else {
            activityByDate[dateKey].redeemed += Math.abs(item._sum.points);
          }
        }
      }

      // Get recent transactions
      const recentTransactions = await db.loyaltyTransaction.findMany({
        include: {
          customer: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      });

      return NextResponse.json({
        success: true,
        data: {
          totalEarned: totalEarned._sum.points || 0,
          totalRedeemed: Math.abs(totalRedeemed._sum.points || 0),
          customerLeaderboard,
          activityByDate,
          recentTransactions,
        },
      });
    }

    // Fetch transactions for a specific customer
    const where: Record<string, unknown> = { customerId };
    if (type && type !== "all") {
      where.transactionType = type;
    }

    const [transactions, total, customer] = await Promise.all([
      db.loyaltyTransaction.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.loyaltyTransaction.count({ where }),
      db.customer.findUnique({
        where: { id: customerId },
        select: { loyaltyPoints: true },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: transactions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      currentPoints: customer?.loyaltyPoints || 0,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch loyalty data";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// POST: Create a loyalty transaction (earn/redeem/adjust)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerId, points, transactionType, invoiceId, description } = body;

    if (!customerId || points === undefined || !transactionType || !description) {
      return NextResponse.json(
        { success: false, error: "Missing required fields" },
        { status: 400 }
      );
    }

    const validTypes = ["earned", "redeemed", "adjusted"];
    if (!validTypes.includes(transactionType)) {
      return NextResponse.json(
        { success: false, error: "Invalid transaction type" },
        { status: 400 }
      );
    }

    // Get current customer points
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

    // For redeemed/adjusted negative, check sufficient points
    if (points < 0 && customer.loyaltyPoints + points < 0) {
      return NextResponse.json(
        { success: false, error: "Insufficient loyalty points" },
        { status: 400 }
      );
    }

    // Create transaction and update customer points atomically
    const newPoints = customer.loyaltyPoints + points;

    const transaction = await db.$transaction(async (tx) => {
      const loyaltyTx = await tx.loyaltyTransaction.create({
        data: {
          customerId,
          points,
          transactionType,
          invoiceId: invoiceId || null,
          description,
        },
      });

      await tx.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newPoints },
      });

      return loyaltyTx;
    });

    return NextResponse.json({
      success: true,
      data: transaction,
      newPointsBalance: newPoints,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create loyalty transaction";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
