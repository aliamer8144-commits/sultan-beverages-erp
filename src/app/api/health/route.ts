import { db } from '@/lib/db'
import { successResponse, errorResponse } from '@/lib/api-response'

/**
 * GET /api/health — Database & service health check
 *
 * No auth required — used by login screen to show connection status.
 * Tests actual database connectivity by running a simple query.
 */
export async function GET() {
  try {
    // Test database connection with a lightweight query
    const startTime = Date.now()
    await db.$queryRaw`SELECT 1 as ok`
    const latency = Date.now() - startTime

    return successResponse({
      status: 'ok',
      database: 'connected',
      latency: `${latency}ms`,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Health Check] Database connection failed:', message)

    return successResponse({
      status: 'error',
      database: 'disconnected',
      error: message,
      timestamp: new Date().toISOString(),
    })
  }
}
