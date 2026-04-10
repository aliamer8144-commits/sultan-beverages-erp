import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// ── Seed sample audit log data ──────────────────────────────────────
async function seedSampleData() {
  const count = await db.auditLog.count()
  if (count > 0) return

  const now = new Date()
  const samples = [
    { action: 'login', entity: 'User', userName: 'أحمد المدير', details: { username: 'admin' }, minutesAgo: 120 },
    { action: 'create', entity: 'Product', entityId: 'p1', userName: 'أحمد المدير', details: { name: 'بيبسي 330مل', price: 3.5 }, minutesAgo: 115 },
    { action: 'create', entity: 'Product', entityId: 'p2', userName: 'أحمد المدير', details: { name: 'كولا 330مل', price: 3.5 }, minutesAgo: 110 },
    { action: 'update', entity: 'Product', entityId: 'p1', userName: 'أحمد المدير', details: { name: 'بيبسي 330مل', changes: { price: '3.00 → 3.50' } }, minutesAgo: 100 },
    { action: 'create', entity: 'Invoice', entityId: 'inv1', userName: 'محمد الكاشير', details: { invoiceNo: 'INV-001', total: 35.0, type: 'sale' }, minutesAgo: 90 },
    { action: 'payment', entity: 'Payment', entityId: 'pay1', userName: 'محمد الكاشير', details: { amount: 500, method: 'cash', customerName: 'خالد العميل' }, minutesAgo: 80 },
    { action: 'delete', entity: 'Product', entityId: 'p3', userName: 'أحمد المدير', details: { name: 'ماء معدني قديم', reason: 'انتهاء الصلاحية' }, minutesAgo: 70 },
    { action: 'login', entity: 'User', userName: 'محمد الكاشير', details: { username: 'cashier' }, minutesAgo: 60 },
    { action: 'create', entity: 'Customer', entityId: 'c1', userName: 'أحمد المدير', details: { name: 'عبدالله العتيبي', phone: '0501234567' }, minutesAgo: 50 },
    { action: 'backup', entity: 'System', userName: 'أحمد المدير', details: { type: 'auto', size: '2.4 MB' }, minutesAgo: 30 },
  ]

  await db.auditLog.createMany({
    data: samples.map((s) => ({
      action: s.action,
      entity: s.entity,
      entityId: s.entityId || null,
      details: JSON.stringify(s.details),
      userName: s.userName || null,
      ipAddress: '192.168.1.100',
      createdAt: new Date(now.getTime() - s.minutesAgo * 60 * 1000),
    })),
  })
}

// ── GET: Paginated audit logs with filters ──────────────────────────
export async function GET(request: NextRequest) {
  try {
    // Seed sample data if empty
    await seedSampleData()

    const { searchParams } = new URL(request.url)
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)))
    const action = searchParams.get('action') || ''
    const entity = searchParams.get('entity') || ''
    const search = searchParams.get('search') || ''
    const startDate = searchParams.get('startDate') || ''
    const endDate = searchParams.get('endDate') || ''

    // Build where clause
    const where: Record<string, unknown> = {}

    if (action) {
      where.action = action
    }

    if (entity) {
      where.entity = entity
    }

    if (search) {
      where.OR = [
        { userName: { contains: search } },
        { details: { contains: search } },
        { entityId: { contains: search } },
      ]
    }

    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) {
        ;(where.createdAt as Record<string, unknown>).gte = new Date(startDate + 'T00:00:00.000Z')
      }
      if (endDate) {
        ;(where.createdAt as Record<string, unknown>).lte = new Date(endDate + 'T23:59:59.999Z')
      }
    }

    const skip = (page - 1) * limit

    const [logs, total] = await Promise.all([
      db.auditLog.findMany({
        where: Object.keys(where).length > 0 ? where : undefined,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.auditLog.count({
        where: Object.keys(where).length > 0 ? where : undefined,
      }),
    ])

    const totalPages = Math.ceil(total / limit)

    // Format logs
    const formattedLogs = logs.map((log) => {
      let parsedDetails: Record<string, unknown> | null = null
      try {
        parsedDetails = log.details ? JSON.parse(log.details) : null
      } catch {
        parsedDetails = null
      }

      return {
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        details: parsedDetails,
        userName: log.userName,
        ipAddress: log.ipAddress,
        createdAt: log.createdAt.toLocaleString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        }),
        createdAtRaw: log.createdAt.toISOString(),
      }
    })

    return NextResponse.json({
      success: true,
      data: formattedLogs,
      total,
      page,
      totalPages,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch audit logs'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

// ── POST: Create a new audit log entry ──────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { action, entity, entityId, details, userName, ipAddress } = body

    if (!action || !entity) {
      return NextResponse.json(
        { success: false, error: 'العملية والكيان مطلوبان' },
        { status: 400 }
      )
    }

    const log = await db.auditLog.create({
      data: {
        action,
        entity,
        entityId: entityId || null,
        details: details ? JSON.stringify(details) : null,
        userName: userName || null,
        ipAddress: ipAddress || null,
      },
    })

    return NextResponse.json({ success: true, data: log }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create audit log'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
