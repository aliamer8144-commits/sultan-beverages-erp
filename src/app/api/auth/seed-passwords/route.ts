import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

/**
 * POST /api/auth/seed-passwords
 *
 * One-time migration endpoint: hashes all plaintext passwords in the DB.
 * Run once after deploying the auth system, then delete this file.
 *
 * ⚠️ This endpoint is PUBLIC by design — it should only exist temporarily.
 */
export async function POST() {
  try {
    const users = await db.user.findMany({
      select: { id: true, username: true, password: true },
    })

    const results: Array<{ username: string; hashed: boolean }> = []

    for (const user of users) {
      if (user.password.startsWith('$2')) {
        results.push({ username: user.username, hashed: false })
        continue
      }

      await db.user.update({
        where: { id: user.id },
        data: { password: await hashPassword(user.password) },
      })
      results.push({ username: user.username, hashed: true })
    }

    return NextResponse.json({
      success: true,
      message: `تمت عملية تهيئة كلمات المرور`,
      processed: results.length,
      hashed: results.filter((r) => r.hashed).length,
      alreadyHashed: results.filter((r) => !r.hashed).length,
      details: results,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to seed passwords'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
