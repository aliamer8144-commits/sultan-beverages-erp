import { PrismaClient } from '@prisma/client'

// Use SUPABASE_DIRECT_URL for Prisma operations, fall back to DATABASE_URL
// This prevents system-level DATABASE_URL from overriding .env files
const databaseUrl = process.env.SUPABASE_DIRECT_URL || process.env.DATABASE_URL

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// Cache in globalThis for ALL environments (not just dev)
// This is critical on Vercel where each serverless function invocation
// would otherwise create a new PrismaClient and exhaust connection pool
if (!globalForPrisma.prisma) globalForPrisma.prisma = db
