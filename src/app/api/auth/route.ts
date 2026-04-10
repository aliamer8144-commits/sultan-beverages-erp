import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { logAction } from "@/lib/audit-logger";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    const user = await db.user.findUnique({
      where: { username },
    });

    if (!user || user.password !== password) {
      return NextResponse.json(
        { success: false, error: "اسم المستخدم أو كلمة المرور غير صحيحة" },
        { status: 401 }
      );
    }

    if (!user.isActive) {
      return NextResponse.json(
        { success: false, error: "هذا الحساب معطل" },
        { status: 403 }
      );
    }

    // Log the login action
    logAction({
      action: 'login',
      entity: 'User',
      entityId: user.id,
      userName: user.name,
      details: { username: user.username },
    });

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "حدث خطأ في الخادم" },
      { status: 500 }
    );
  }
}
