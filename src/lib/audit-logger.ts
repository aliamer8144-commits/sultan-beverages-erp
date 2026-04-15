export async function logAction(params: {
  action: string
  entity: string
  entityId?: string
  userId?: string
  details?: Record<string, unknown>
  userName?: string
  ipAddress?: string
}) {
  try {
    const { db } = await import('@/lib/db')
    await db.auditLog.create({
      data: {
        action: params.action,
        entity: params.entity,
        entityId: params.entityId || null,
        userId: params.userId || null,
        details: params.details ? JSON.stringify(params.details) : null,
        userName: params.userName || null,
        ipAddress: params.ipAddress || null,
      }
    })
  } catch (error) {
    // Don't fail the main operation if logging fails
    console.error('[Audit] Logging failed:', error)
  }
}
