// Improved goals API route with validation and safer transactions

import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'crypto'
import { auth } from '@/auth'
import { prisma } from '@/lib/prisma'
import { goalsArraySchema } from '@/lib/schemas'

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
            archived: false
          },
          include: {
            keyResults: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      }
    })

    return NextResponse.json({ goals: user?.goals || [] })
  } catch (error) {
    console.error('Error fetching goals:', error)
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

    const body = await request.json()

    // Validate input
    const validationResult = goalsArraySchema.safeParse(body.goals)
    if (!validationResult.success) {
      console.error('Goal validation failed:', JSON.stringify(validationResult.error.issues, null, 2))
      console.error('Received goals:', JSON.stringify(body.goals, null, 2))
      return NextResponse.json(
        { error: 'Invalid goals data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const goals = validationResult.data

    const result = await prisma.$transaction(async (tx) => {
      try {
        if (!goals || goals.length === 0) {
          // If no goals, delete all existing for this user
          await tx.goal.deleteMany({
            where: { userId: user.id }
          })
          return []
        }

        const existingGoals = await tx.goal.findMany({
          where: { userId: user.id },
          select: { id: true, archived: true }
        })
        const processedGoalIds = new Set<string>()
        for (const goal of goals) {
          const goalId = goal.id || randomUUID()
          processedGoalIds.add(goalId)

          const baseData = {
            title: goal.title,
            timeframe: goal.timeframe,
            statusOverride: goal.statusOverride || null,
            archived: (goal as any).archived || false,
            userId: user.id
          }

          await tx.goal.upsert({
            where: { id: goalId },
            update: {
              title: baseData.title,
              timeframe: baseData.timeframe,
              statusOverride: baseData.statusOverride,
              archived: baseData.archived
            },
            create: {
              id: goalId,
              ...baseData
            }
          })

          await tx.keyResult.deleteMany({
            where: { goalId }
          })

          if (goal.keyResults.length > 0) {
            await tx.keyResult.createMany({
              data: goal.keyResults.map(keyResult => ({
                id: keyResult.id || randomUUID(),
                goalId,
                title: keyResult.title,
                status: keyResult.status
              }))
            })
          }
        }

        const goalIdsToDelete = existingGoals
          .filter((existingGoal) => !existingGoal.archived && !processedGoalIds.has(existingGoal.id))
          .map((goal) => goal.id)

        if (goalIdsToDelete.length > 0) {
          await tx.goal.deleteMany({
            where: {
              userId: user.id,
              id: { in: goalIdsToDelete }
            }
          })
        }

        return tx.goal.findMany({
          where: { userId: user.id },
          include: {
            keyResults: true
          },
          orderBy: {
            createdAt: 'asc'
          }
        })
      } catch (txError) {
        console.error('Transaction error:', txError)
        throw txError
      }
    }, {
      maxWait: 5000, // Wait max 5s to get a connection
      timeout: 10000, // Allow max 10s for transaction
    })

    return NextResponse.json({ goals: result })
  } catch (error) {
    console.error('Error saving goals:', error)

    // More specific error messages
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json({ error: 'Duplicate goal detected' }, { status: 409 })
      }
      if (error.message.includes('timeout')) {
        return NextResponse.json({ error: 'Database timeout - please try again' }, { status: 504 })
      }
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
