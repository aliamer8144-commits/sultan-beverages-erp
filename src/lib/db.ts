import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
  })

// Cache in globalThis for ALL environments (not just dev)
// This is critical on Vercel where each serverless function invocation
// would otherwise create a new PrismaClient and exhaust connection pool
if (!globalForPrisma.prisma) globalForPrisma.prisma = db
