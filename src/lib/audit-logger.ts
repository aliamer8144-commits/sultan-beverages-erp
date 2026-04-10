export async function logAction(params: {
  action: string
  entity: string
  entityId?: string
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
        details: params.details ? JSON.stringify(params.details) : null,
        userName: params.userName || null,
        ipAddress: params.ipAddress || null,
      }
    })
  } catch {
    // Don't fail the main operation if logging fails
  }
}
