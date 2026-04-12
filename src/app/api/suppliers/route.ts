import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, createSupplierSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { tryCatch } from "@/lib/api-error-handler";

/**
 * GET /api/suppliers — List suppliers with balance info
 */
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";

  const orderBy: Record<string, string> = {}
  if (sortBy === "rating") {
    orderBy.rating = "desc"
  } else {
    orderBy.createdAt = "desc"
  }

  const suppliers = await db.supplier.findMany({
    where: search
      ? {
          OR: [
            { name: { contains: search } },
            { phone: { contains: search } },
          ],
        }
      : undefined,
    orderBy,
  })

  // Efficient balance computation — single aggregate for all suppliers
  const [purchaseAggregates, paymentAggregates] = await Promise.all([
    db.invoice.groupBy({
      by: ["supplierId"],
      where: { type: "purchase", supplierId: { in: suppliers.map((s) => s.id) } },
      _sum: { totalAmount: true, discount: true },
    }),
    db.supplierPayment.groupBy({
      by: ["supplierId"],
      where: { supplierId: { in: suppliers.map((s) => s.id) } },
      _sum: { amount: true },
    }),
  ])

  const purchaseMap = new Map(purchaseAggregates.map((a) => [
    a.supplierId,
    (a._sum.totalAmount || 0) - (a._sum.discount || 0),
  ]))
  const paymentMap = new Map(paymentAggregates.map((a) => [a.supplierId, a._sum.amount || 0]))

  const suppliersWithBalance = suppliers.map((supplier) => {
    const totalPurchases = purchaseMap.get(supplier.id) || 0
    const totalPaid = paymentMap.get(supplier.id) || 0
    return {
      ...supplier,
      totalPurchases,
      totalPaid,
      remainingBalance: totalPurchases - totalPaid,
    }
  })

  return successResponse(suppliersWithBalance)
}, 'فشل في تحميل الموردين'))

/**
 * POST /api/suppliers — Create a new supplier
 */
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json()
  const user = getRequestUser(request)
  const validation = validateBody(createSupplierSchema, body)
  if (!validation.success) return errorResponse(validation.error, 422)

  const supplier = await db.supplier.create({
    data: {
      name: validation.data.name,
      phone: validation.data.phone,
      phone2: validation.data.phone2,
      address: validation.data.address,
      website: validation.data.website || null,
      paymentTerms: validation.data.paymentTerms || "نقدي",
      notes: validation.data.notes,
    },
  })

  logAction({
    action: "create",
    entity: "Supplier",
    entityId: supplier.id,
    userId: user?.userId,
    userName: user?.username,
    details: { name: supplier.name },
  })

  return successResponse(supplier, 201)
}, 'فشل في إنشاء المورد'))
