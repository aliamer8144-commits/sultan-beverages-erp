import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Hardcode Supabase PostgreSQL URL to avoid system-level DATABASE_URL override
// (system env may point to old SQLite file)
const SUPABASE_URL = 'postgresql://postgres.mypophlireumyzfntokb:Alsoltan.7375@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres'

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: SUPABASE_URL,
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db
