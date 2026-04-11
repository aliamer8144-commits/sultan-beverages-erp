import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/auth"
import { db } from "@/lib/db"

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Used by the frontend to verify session validity on page load.
 */
export async function GET(request: Request) {
  try {
    const user = await getAuthUser(request as unknown as import('next/server').NextRequest)
    if (!user) {
      return NextResponse.json(
        { success: false, error: "غير مصرح" },
        { status: 401 }
      )
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.userId },
      select: { id: true, username: true, name: true, role: true, isActive: true },
    })

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json(
        { success: false, error: "الحساب غير موجود أو معطل" },
        { status: 401 }
      )
    }

    return NextResponse.json({ success: true, data: dbUser })
  } catch {
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    )
  }
}
