import { PrismaClient } from '@prisma/client'
import { readFileSync } from 'fs'
import { join } from 'path'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

/**
 * Get the PostgreSQL DATABASE_URL.
 *
 * The system may set DATABASE_URL to a local SQLite path.
 * We override with the .env value when it's not a PostgreSQL URL.
 */
function getDatabaseUrl(): string {
  const envUrl = process.env.DATABASE_URL || ''

  if (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://')) {
    return envUrl
  }

  // Fallback: read from .env file directly
  try {
    const envPath = join(process.cwd(), '.env')
    const envContent = readFileSync(envPath, 'utf-8')
    const match = envContent.match(/DATABASE_URL=["']?(postgresql:\/\/[^"'\s]+)/)
    if (match) return match[1]
  } catch {
    // ignore — let Prisma use whatever DATABASE_URL is set
  }

  return envUrl
}

const dbUrl = getDatabaseUrl()

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(dbUrl.startsWith('postgresql') ? { datasourceUrl: dbUrl } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
