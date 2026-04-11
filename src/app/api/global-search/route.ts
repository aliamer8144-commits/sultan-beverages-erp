import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") || "").trim();
    const category = searchParams.get("category") || "all"; // all, products, customers, invoices, suppliers
    const limit = Math.min(20, Math.max(1, parseInt(searchParams.get("limit") || "8", 10)));

    if (!q) {
      return NextResponse.json({ success: true, data: [], counts: {} });
    }

    const results: {
      category: string;
      items: Record<string, unknown>[];
    }[] = [];

    const counts: Record<string, number> = {};

    // ── Search Products ──────────────────────────────────────────
    if (category === "all" || category === "products") {
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
            costPrice: true,
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

      counts.products = productCount;
      if (products.length > 0) {
        results.push({
          category: "products",
          items: products.map((p) => ({
            id: p.id,
            name: p.name,
            subtitle: p.category?.name || "بدون تصنيف",
            detail: `${p.price} ر.ي`,
            meta: `المخزون: ${p.quantity}`,
            lowStock: p.quantity <= p.minQuantity,
            outOfStock: p.quantity <= 0,
            image: p.image,
          })),
        });
      }
    }

    // ── Search Customers ─────────────────────────────────────────
    if (category === "all" || category === "customers") {
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

      counts.customers = customerCount;
      if (customers.length > 0) {
        results.push({
          category: "customers",
          items: customers.map((c) => ({
            id: c.id,
            name: c.name,
            subtitle: c.phone || "بدون رقم",
            detail: c.debt > 0 ? `مديونية: ${c.debt.toLocaleString()} ر.ي` : "لا ديون",
            meta: `${c.totalPurchases.toLocaleString()} ر.ي مشتريات · ${c.visitCount} زيارة`,
            hasDebt: c.debt > 0,
          })),
        });
      }
    }

    // ── Search Invoices ──────────────────────────────────────────
    if (category === "all" || category === "invoices") {
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

      counts.invoices = invoiceCount;
      if (invoices.length > 0) {
        results.push({
          category: "invoices",
          items: invoices.map((inv) => {
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
          }),
        });
      }
    }

    // ── Search Suppliers ─────────────────────────────────────────
    if (category === "all" || category === "suppliers") {
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

      counts.suppliers = supplierCount;
      if (suppliers.length > 0) {
        results.push({
          category: "suppliers",
          items: suppliers.map((s) => ({
            id: s.id,
            name: s.name,
            subtitle: s.phone || s.phone2 || "بدون رقم",
            detail: `التقييم: ${s.rating > 0 ? `${s.rating}/5` : "لم يتم التقييم"}`,
            meta: `${s.paymentTerms} · ${s.ratingCount} تقييم`,
          })),
        });
      }
    }

    // Calculate total results
    const totalResults = Object.values(counts).reduce((sum, count) => sum + count, 0);

    return NextResponse.json({
      success: true,
      data: results,
      counts,
      totalResults,
      query: q,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "فشل في البحث";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
