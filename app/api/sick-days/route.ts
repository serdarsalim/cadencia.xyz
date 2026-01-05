import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        sickDays: true
      }
    })

    return NextResponse.json({ sickDays: user?.sickDays || [] })
  } catch (error) {
    console.error('Error fetching sick days:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { sickDays } = await request.json()

    await prisma.$transaction(async (tx) => {
      await tx.sickDay.deleteMany({
        where: { userId: user.id }
      })

      if (sickDays && sickDays.length > 0) {
        await tx.sickDay.createMany({
          data: sickDays.map((entry: any) => ({
            userId: user.id,
            dayKey: entry.dayKey,
            isSick: entry.isSick ?? true
          }))
        })
      }
    })

    const updatedUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        sickDays: true
      }
    })

    return NextResponse.json({ sickDays: updatedUser?.sickDays || [] })
  } catch (error) {
    console.error('Error saving sick days:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
