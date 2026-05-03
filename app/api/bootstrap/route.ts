import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ authenticated: false, userEmail: null })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        goals: {
          where: { archived: false },
          include: {
            keyResults: {
              orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
            }
          },
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
        },
        productivityRatings: true,
        weeklyNotes: true,
        dayOffs: true,
        sickDays: true,
        profile: true
      }
    })

    return NextResponse.json({
      authenticated: true,
      userEmail: session.user.email,
      goals: user?.goals || [],
      productivityRatings: user?.productivityRatings || [],
      weeklyNotes: user?.weeklyNotes || [],
      dayOffs: user?.dayOffs || [],
      sickDays: user?.sickDays || [],
      profile: user?.profile || null
    })
  } catch (error) {
    console.error('Error fetching bootstrap data:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
