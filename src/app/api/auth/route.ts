import { NextRequest, NextResponse } from "next/server"
import { db } from "@/lib/db"
import { logAction } from "@/lib/audit-logger"
import { verifyPassword, generateToken } from "@/lib/auth"
import { setAuthCookie } from "@/lib/auth-middleware"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      )
    }

    const user = await db.user.findUnique({ where: { username } })

    if (!user) {
      return NextResponse.json(
        { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      )
    }

    // Check if password is plaintext (migration phase) or hashed
    const isHashed = user.password.startsWith('$2')
    const passwordValid = isHashed
      ? await verifyPassword(password, user.password)
      : user.password === password

    if (!passwordValid) {
      return NextResponse.json(
        { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      )
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "هذا الحساب معطل" },
        { status: 403 }
      )
    }

    // Generate JWT token
    const token = await generateToken({
      userId: user.id,
      username: user.username,
      role: user.role as 'admin' | 'cashier',
    })

    // Create response and set HTTP-only cookie
    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
      token,
    })

    setAuthCookie(response, token)

    // Log the login action
    logAction({
      action: 'login',
      entity: 'User',
      entityId: user.id,
      userName: user.name,
      details: { username: user.username },
    })

    return response
  } catch {
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    )
  }
}
