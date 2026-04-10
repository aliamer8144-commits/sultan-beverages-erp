import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always use the PostgreSQL connection from .env, ignoring system-level DATABASE_URL
// that may point to an old SQLite file
const DATABASE_URL = process.env.DATABASE_URL || ''

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: DATABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
