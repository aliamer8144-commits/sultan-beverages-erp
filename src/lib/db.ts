import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Ensure we use the PostgreSQL DATABASE_URL from .env, not a system-level override
function getDatabaseUrl(): string {
  // System may set DATABASE_URL to a local SQLite path — override with .env value
  const envUrl = process.env.DATABASE_URL || ''
  if (envUrl.startsWith('postgresql://') || envUrl.startsWith('postgres://')) {
    return envUrl
  }
  // Fallback: read from .env file directly
  try {
    // Prisma generate requires dynamic require
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const fs = require('fs')
    // Prisma generate requires dynamic require
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const path = require('path')
    const envPath = path.join(process.cwd(), '.env')
    const envContent = fs.readFileSync(envPath, 'utf-8')
    const match = envContent.match(/DATABASE_URL=["']?(postgresql:\/\/[^"'\s]+)/)
    if (match) return match[1]
  } catch {
    // ignore
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
