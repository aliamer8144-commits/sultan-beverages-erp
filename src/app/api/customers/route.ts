import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";
import { withAuth, getRequestUser } from "@/lib/auth-middleware";
import { validateBody, createCustomerSchema } from "@/lib/validations";
import { successResponse, errorResponse } from "@/lib/api-response";
import { tryCatch } from "@/lib/api-error-handler";

/**
 * GET /api/customers — List customers with optional filters
 */
export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const category = searchParams.get("category") || "";
  const page = Math.max(1, Number(searchParams.get('page')) || 1);
  const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50));

  const where: Record<string, unknown> = {};

  if (search) {
    where.OR = [
      { name: { contains: search } },
      { phone: { contains: search } },
    ];
  }
  if (category) where.category = category;

  const whereClause = Object.keys(where).length > 0 ? where : undefined;

  const [customers, total] = await Promise.all([
    db.customer.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.customer.count({ where: whereClause }),
  ]);

  return successResponse({ customers, total, page, totalPages: Math.ceil(total / limit) });
}, 'فشل في تحميل العملاء'));

/**
 * POST /api/customers — Create a new customer
 */
export const POST = withAuth(tryCatch(async (request) => {
  const body = await request.json();
  const user = getRequestUser(request);
  const validation = validateBody(createCustomerSchema, body);
  if (!validation.success) return errorResponse(validation.error, 422);

  const { name, phone, category, notes } = validation.data;

  if (phone) {
    const existing = await db.customer.findFirst({ where: { phone } });
    if (existing) return errorResponse("رقم الهاتف موجود بالفعل", 409);
  }

  const customer = await db.customer.create({
    data: { name, phone, category: category || "عادي", notes: notes || null },
  });

  logAction({
    action: "create",
    entity: "Customer",
    entityId: customer.id,
    userId: user?.userId,
    userName: user?.username,
    details: { name, phone },
  });

  return successResponse(customer, 201);
}, 'فشل في إنشاء العميل'));
