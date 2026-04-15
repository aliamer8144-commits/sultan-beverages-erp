import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, createInvoiceSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { tryCatch } from "@/lib/api-error-handler";

/**
 * GET /api/invoices — List invoices with filters & pagination
 */
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") as "sale" | "purchase" | null;
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const customerId = searchParams.get("customerId");

  // Pagination (safe defaults)
  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 20));

  const where: Record<string, unknown> = {};

  if (type) where.type = type;
  if (customerId) where.customerId = customerId;

  if (search) {
    where.OR = [
      { invoiceNo: { contains: search } },
      { customer: { name: { contains: search } } },
      { supplier: { name: { contains: search } } },
    ];
  }

  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) (where.createdAt as Record<string, unknown>).gte = new Date(dateFrom);
    if (dateTo) {
      const endDate = new Date(dateTo);
      endDate.setHours(23, 59, 59, 999);
      (where.createdAt as Record<string, unknown>).lte = endDate;
    }
  }

  const [invoices, total] = await Promise.all([
    db.invoice.findMany({
      where,
      include: {
        customer: { select: { id: true, name: true } },
        supplier: { select: { id: true, name: true } },
        user: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.invoice.count({ where }),
  ]);

  return successResponse({
    invoices,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}, 'فشل في تحميل الفواتير'));

/**
 * POST /api/invoices — Create an invoice (sale or purchase)
 *
 * Security: userId is taken from the JWT token, NOT from the request body.
 *
 * Performance: Products are pre-fetched in a single query before the loop.
 * Stock adjustments use createMany, product updates are batched per unique product.
 */
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json();
  const user = getRequestUser(request);

  if (!user) {
    return errorResponse("غير مصرح", 401);
  }

  const validation = validateBody(createInvoiceSchema, body);
  if (!validation.success) return errorResponse(validation.error, 422);

  const { type, customerId, supplierId, discount, paidAmount, items } = validation.data;

  // Cashiers cannot create purchase invoices
  if (type === 'purchase' && user.role === 'cashier') {
    return errorResponse('ليس لديك صلاحية لإنشاء فواتير الشراء', 403);
  }

  const userId = user.userId;

  const invoice = await db.$transaction(async (tx) => {
    // 1. Generate invoice number — find latest and increment to avoid duplicates
    const lastInvoice = await tx.invoice.findFirst({
      orderBy: { invoiceNo: 'desc' },
      select: { invoiceNo: true },
    });
    let nextNum = 1;
    if (lastInvoice?.invoiceNo) {
      const match = lastInvoice.invoiceNo.match(/\d+$/);
      if (match) nextNum = parseInt(match[0], 10) + 1;
    }
    const invoiceNo = `INV-${String(nextNum).padStart(5, '0')}`;

    // 2. Calculate total from items
    const totalAmount = items.reduce((sum, item) => sum + item.quantity * item.price, 0);

    // 3. Create invoice with nested items
    const createdInvoice = await tx.invoice.create({
      data: {
        invoiceNo,
        type,
        customerId: customerId || null,
        supplierId: supplierId || null,
        totalAmount,
        discount: discount || 0,
        paidAmount: paidAmount || 0,
        userId,
        items: {
          create: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            price: item.price,
            total: item.quantity * item.price,
          })),
        },
      },
      include: {
        customer: true,
        supplier: true,
        user: { select: { id: true, name: true } },
        items: { include: { product: { select: { id: true, name: true } } } },
      },
    });

    // 4. Pre-fetch all product quantities in ONE query
    const productIds = [...new Set(items.map((i) => i.productId))];
    const productsBefore = await tx.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, quantity: true },
    });
    const productQtyMap = new Map(productsBefore.map((p) => [p.id, p.quantity]));

    // 5. Compute new quantities, build product updates & stock adjustments
    const productFinalQty = new Map<string, number>();
    const stockAdjustments: {
      productId: string;
      type: string;
      quantity: number;
      previousQty: number;
      newQty: number;
      reason: string;
      reference: string;
      referenceType: string;
      userId: string;
      userName: string | null;
    }[] = [];

    for (const item of items) {
      const previousQty = productQtyMap.get(item.productId) ?? 0;

      let newQty: number;
      let adjustmentType: string;
      let reason: string;

      if (type === "sale") {
        if (previousQty < item.quantity) {
          throw new Error(`المخزون غير كافٍ للمنتج: ${item.productId} (المتاح: ${previousQty}, المطلوب: ${item.quantity})`);
        }
        newQty = previousQty - item.quantity;
        adjustmentType = "sale";
        reason = `بيع - فاتورة ${invoiceNo}`;
      } else if (type === "purchase") {
        newQty = previousQty + item.quantity;
        adjustmentType = "purchase";
        reason = `شراء - فاتورة ${invoiceNo}`;
      } else {
        continue;
      }

      // Update the in-memory map so subsequent items for the same product
      // see the adjusted quantity (mirrors original sequential behaviour)
      productQtyMap.set(item.productId, newQty);
      productFinalQty.set(item.productId, newQty);

      stockAdjustments.push({
        productId: item.productId,
        type: adjustmentType,
        quantity: item.quantity,
        previousQty,
        newQty,
        reason,
        reference: invoiceNo,
        referenceType: "invoice",
        userId,
        userName: createdInvoice.user?.name || null,
      });
    }

    // 6. Batch product updates (one per unique product) + createMany stock adjustments
    const productUpdateOps = Array.from(productFinalQty.entries()).map(
      ([id, qty]) => tx.product.update({ where: { id }, data: { quantity: qty } }),
    );

    await Promise.all([
      ...productUpdateOps,
      tx.stockAdjustment.createMany({ data: stockAdjustments }),
    ]);

    // 7. Update customer debt + visit tracking (sales only)
    // totalAmount is pre-discount for accounting; grandTotal is what customer owes
    if (customerId && type === "sale") {
      const grandTotal = totalAmount - (discount || 0);
      const remaining = grandTotal - (paidAmount || 0);
      const customerUpdate: Record<string, unknown> = {
        visitCount: { increment: 1 },
        lastVisit: new Date(),
        totalPurchases: { increment: totalAmount },
      };
      if (remaining > 0) {
        customerUpdate.debt = { increment: remaining };
      }
      await tx.customer.update({
        where: { id: customerId },
        data: customerUpdate,
      });
    }

    return createdInvoice;
  });

  logAction({
    action: "create",
    entity: "Invoice",
    entityId: invoice.id,
    userId: user.userId,
    userName: user.username,
    details: {
      invoiceNo: invoice.invoiceNo,
      type: invoice.type,
      totalAmount: invoice.totalAmount,
      itemCount: invoice.items.length,
    },
  });

  return successResponse(invoice, 201);
}, 'فشل في إنشاء الفاتورة'));
