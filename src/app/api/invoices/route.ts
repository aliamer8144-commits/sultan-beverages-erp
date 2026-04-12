import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, createInvoiceSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { tryCatch } from "@/lib/api-error-handler";

/**
 * GET /api/invoices — List invoices with filters
 */
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = request.nextUrl;
  const type = searchParams.get("type") as "sale" | "purchase" | null;
  const search = searchParams.get("search");
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");
  const customerId = searchParams.get("customerId");

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

  const invoices = await db.invoice.findMany({
    where,
    include: {
      customer: true,
      supplier: true,
      user: { select: { id: true, name: true } },
      items: { include: { product: { select: { id: true, name: true } } } },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse(invoices);
}, 'فشل في تحميل الفواتير'));

/**
 * POST /api/invoices — Create an invoice (sale or purchase)
 *
 * Security: userId is taken from the JWT token, NOT from the request body.
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
  const userId = user.userId;

  const invoice = await db.$transaction(async (tx) => {
    // 1. Generate invoice number
    const count = await tx.invoice.count();
    const invoiceNo = `INV-${String(count + 1).padStart(5, "0")}`;

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

    // 4. Update product quantities & log stock adjustments
    for (const item of items) {
      const productBefore = await tx.product.findUnique({
        where: { id: item.productId },
        select: { quantity: true },
      });
      const previousQty = productBefore?.quantity || 0;

      let newQty: number;
      let adjustmentType: string;
      let reason: string;

      if (type === "sale") {
        newQty = Math.max(0, previousQty - item.quantity);
        adjustmentType = "sale";
        reason = `بيع - فاتورة ${invoiceNo}`;
      } else if (type === "purchase") {
        newQty = previousQty + item.quantity;
        adjustmentType = "purchase";
        reason = `شراء - فاتورة ${invoiceNo}`;
      } else {
        continue;
      }

      await tx.product.update({
        where: { id: item.productId },
        data: { quantity: newQty },
      });

      await tx.stockAdjustment.create({
        data: {
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
        },
      });
    }

    // 5. Update customer debt + visit tracking (sales only)
    if (customerId && type === "sale") {
      const remaining = totalAmount - (paidAmount || 0);
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
