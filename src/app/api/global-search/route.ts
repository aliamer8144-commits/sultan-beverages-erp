import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { withAuth } from "@/lib/auth-middleware";
import { successResponse } from "@/lib/api-response";
import { tryCatch } from "@/lib/api-error-handler";

export const GET = withAuth(tryCatch(async (request) => {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") || "").trim();
  const category = searchParams.get("category") || "all"; // all, products, customers, invoices, suppliers
  const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "8", 10)));

  if (!q) {
    return successResponse({ results: [], counts: {}, totalResults: 0, query: "" });
  }

  const results: {
    category: string;
    items: Record<string, unknown>[];
  }[] = [];

  const counts: Record<string, number> = {};

  // ── Search helpers (pure functions that return data, no side effects) ──

  const searchProducts = async () => {
    const [products, productCount] = await Promise.all([
      db.product.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          price: true,
          quantity: true,
          minQuantity: true,
          barcode: true,
          image: true,
          category: { select: { id: true, name: true } },
        },
        take: limit,
      }),
      db.product.count({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { barcode: { contains: q, mode: "insensitive" } },
          ],
        },
      }),
    ]);

    return {
      count: productCount,
      items: products.length > 0 ? products.map((p) => ({
        id: p.id,
        name: p.name,
        subtitle: p.category?.name || "بدون تصنيف",
        detail: `${p.price} ر.ي`,
        meta: `المخزون: ${p.quantity}`,
        lowStock: p.quantity <= p.minQuantity,
        outOfStock: p.quantity <= 0,
        image: p.image,
      })) : null,
    };
  };

  const searchCustomers = async () => {
    const [customers, customerCount] = await Promise.all([
      db.customer.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          debt: true,
          totalPurchases: true,
          visitCount: true,
          category: true,
        },
        take: limit,
        orderBy: { totalPurchases: "desc" },
      }),
      db.customer.count({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
          ],
        },
      }),
    ]);

    return {
      count: customerCount,
      items: customers.length > 0 ? customers.map((c) => ({
        id: c.id,
        name: c.name,
        subtitle: c.phone || "بدون رقم",
        detail: c.debt > 0 ? `مديونية: ${c.debt.toLocaleString()} ر.ي` : "لا ديون",
        meta: `${c.totalPurchases.toLocaleString()} ر.ي مشتريات · ${c.visitCount} زيارة`,
        hasDebt: c.debt > 0,
      })) : null,
    };
  };

  const searchInvoices = async () => {
    const invoiceWhere: Prisma.InvoiceWhereInput = {
      OR: [
        { invoiceNo: { contains: q, mode: "insensitive" } },
        { customer: { name: { contains: q, mode: "insensitive" } } },
        { supplier: { name: { contains: q, mode: "insensitive" } } },
      ],
    };

    const [invoices, invoiceCount] = await Promise.all([
      db.invoice.findMany({
        where: invoiceWhere,
        select: {
          id: true,
          invoiceNo: true,
          type: true,
          totalAmount: true,
          paidAmount: true,
          discount: true,
          createdAt: true,
          customer: { select: { name: true } },
          supplier: { select: { name: true } },
        },
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      db.invoice.count({ where: invoiceWhere }),
    ]);

    return {
      count: invoiceCount,
      items: invoices.length > 0 ? invoices.map((inv) => {
        const entityName = inv.customer?.name || inv.supplier?.name || "عميل نقدي";
        const remaining = inv.totalAmount - inv.paidAmount;
        return {
          id: inv.id,
          name: `${inv.invoiceNo}`,
          subtitle: inv.type === "sale" ? "فاتورة بيع" : "فاتورة شراء",
          detail: `${inv.totalAmount.toLocaleString()} ر.ي`,
          meta: `${entityName} · ${remaining > 0 ? `متبقي: ${remaining.toLocaleString()}` : "مدفوعة"}`,
          isSale: inv.type === "sale",
          hasRemaining: remaining > 0,
          date: inv.createdAt.toISOString().split("T")[0],
        };
      }) : null,
    };
  };

  const searchSuppliers = async () => {
    const [suppliers, supplierCount] = await Promise.all([
      db.supplier.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { phone2: { contains: q, mode: "insensitive" } },
          ],
        },
        select: {
          id: true,
          name: true,
          phone: true,
          phone2: true,
          rating: true,
          ratingCount: true,
          paymentTerms: true,
        },
        take: limit,
      }),
      db.supplier.count({
        where: {
          isActive: true,
          OR: [
            { name: { contains: q, mode: "insensitive" } },
            { phone: { contains: q, mode: "insensitive" } },
            { phone2: { contains: q, mode: "insensitive" } },
          ],
        },
      }),
    ]);

    return {
      count: supplierCount,
      items: suppliers.length > 0 ? suppliers.map((s) => ({
        id: s.id,
        name: s.name,
        subtitle: s.phone || s.phone2 || "بدون رقم",
        detail: `التقييم: ${s.rating > 0 ? `${s.rating}/5` : "لم يتم التقييم"}`,
        meta: `${s.paymentTerms} · ${s.ratingCount} تقييم`,
      })) : null,
    };
  };

  // ── Run searches in parallel when category === "all", or single search ──

  if (category === "all") {
    const [productsResult, customersResult, invoicesResult, suppliersResult] =
      await Promise.all([searchProducts(), searchCustomers(), searchInvoices(), searchSuppliers()]);

    counts.products = productsResult.count;
    counts.customers = customersResult.count;
    counts.invoices = invoicesResult.count;
    counts.suppliers = suppliersResult.count;

    if (productsResult.items) results.push({ category: "products", items: productsResult.items });
    if (customersResult.items) results.push({ category: "customers", items: customersResult.items });
    if (invoicesResult.items) results.push({ category: "invoices", items: invoicesResult.items });
    if (suppliersResult.items) results.push({ category: "suppliers", items: suppliersResult.items });
  } else if (category === "products") {
    const r = await searchProducts();
    counts.products = r.count;
    if (r.items) results.push({ category: "products", items: r.items });
  } else if (category === "customers") {
    const r = await searchCustomers();
    counts.customers = r.count;
    if (r.items) results.push({ category: "customers", items: r.items });
  } else if (category === "invoices") {
    const r = await searchInvoices();
    counts.invoices = r.count;
    if (r.items) results.push({ category: "invoices", items: r.items });
  } else if (category === "suppliers") {
    const r = await searchSuppliers();
    counts.suppliers = r.count;
    if (r.items) results.push({ category: "suppliers", items: r.items });
  }

  // Calculate total results
  const totalResults = Object.values(counts).reduce((sum, count) => sum + count, 0);

  return successResponse({ results, counts, totalResults, query: q });
}, 'فشل في البحث'));
