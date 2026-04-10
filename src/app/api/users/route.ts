import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET() {
  try {
    const users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
    })

    const safeUsers = users.map(({ password: _, ...user }) => user)

    return NextResponse.json({ success: true, data: safeUsers })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch users'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, password, name, role } = await request.json()

    const existing = await db.user.findUnique({ where: { username } })
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Username already exists' },
        { status: 409 }
      )
    }

    const user = await db.user.create({
      data: { username, password, name, role },
    })

    const { password: _, ...safeUser } = user

    return NextResponse.json({ success: true, data: safeUser }, { status: 201 })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to create user'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, role, isActive, password } = await request.json()

    const data: Record<string, unknown> = { name, role, isActive }
    if (password) {
      data.password = password
    }

    const user = await db.user.update({
      where: { id },
      data,
    })

    const { password: _, ...safeUser } = user

    return NextResponse.json({ success: true, data: safeUser })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to update user'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json()

    await db.user.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to delete user'
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}
