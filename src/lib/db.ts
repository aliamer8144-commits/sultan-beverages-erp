import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Use PostgreSQL DATABASE_URL from environment
const dbUrl = process.env.DATABASE_URL || ''

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    ...(dbUrl.startsWith('postgresql') ? { datasourceUrl: dbUrl } : {}),
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
