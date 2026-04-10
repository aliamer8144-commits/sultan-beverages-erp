import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sortBy = searchParams.get('sortBy') || 'createdAt'

    const orderBy: Record<string, string> = {}
    if (sortBy === 'rating') {
      orderBy.rating = 'desc'
    } else {
      orderBy.createdAt = 'desc'
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

    // Compute balance info for each supplier
    const suppliersWithBalance = await Promise.all(
      suppliers.map(async (supplier) => {
        const [purchases, payments] = await Promise.all([
          db.invoice.aggregate({
            where: { supplierId: supplier.id, type: 'purchase' },
            _sum: { totalAmount: true, discount: true, paidAmount: true },
          }),
          db.supplierPayment.aggregate({
            where: { supplierId: supplier.id },
            _sum: { amount: true },
          }),
        ])

        const totalPurchases = (purchases._sum.totalAmount || 0) - (purchases._sum.discount || 0)
        const totalPaid = payments._sum.amount || 0
        const remainingBalance = totalPurchases - totalPaid

        return {
          ...supplier,
          totalPurchases,
          totalPaid,
          remainingBalance,
        }
      })
    )

    return NextResponse.json({ success: true, data: suppliersWithBalance })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch suppliers'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, phone, phone2, address, website, paymentTerms, notes } = body

    const supplier = await db.supplier.create({
      data: { name, phone, phone2, address, website, paymentTerms: paymentTerms || 'نقدي', notes },
    })

    return NextResponse.json({ success: true, data: supplier }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create supplier'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json()
    const { id, name, phone, phone2, address, website, paymentTerms, notes, isActive } = body

    const updated = await db.supplier.update({
      where: { id },
      data: { name, phone, phone2, address, website, paymentTerms, notes, isActive },
    })

    return NextResponse.json({ success: true, data: updated })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update supplier'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json()
    const { id } = body

    await db.supplier.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete supplier'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
