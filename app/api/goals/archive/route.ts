// API route for archiving and unarchiving goals

import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'

// GET archived goals
export async function GET() {
  try {
    const session = await auth()

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        goals: {
          where: {
            archived: true
          },
          include: {
            keyResults: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    return NextResponse.json({ goals: user?.goals || [] })
  } catch (error) {
    console.error('Error fetching archived goals:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH to archive or unarchive a goal
export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { goalId, archived } = body

    if (!goalId || typeof archived !== 'boolean') {
      return NextResponse.json(
        { error: 'Invalid request. goalId and archived (boolean) are required' },
        { status: 400 }
      )
    }

    // Verify the goal belongs to the user
    const goal = await prisma.goal.findFirst({
      where: {
        id: goalId,
        userId: user.id
      }
    })

    if (!goal) {
      return NextResponse.json({ error: 'Goal not found' }, { status: 404 })
    }

    // Update the goal's archived status
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: { archived },
      include: {
        keyResults: true
      }
    })

    return NextResponse.json({ goal: updatedGoal })
  } catch (error) {
    console.error('Error archiving/unarchiving goal:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
