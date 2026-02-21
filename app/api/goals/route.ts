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
          orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }]
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
          include: { keyResults: true }
        })
        const existingGoalMap = new Map(
          existingGoals.map(goal => [goal.id, goal])
        )
        const processedGoalIds = new Set<string>()

        for (const [index, goal] of goals.entries()) {
          const goalId = goal.id || randomUUID()
          processedGoalIds.add(goalId)

          const baseData = {
            title: goal.title,
            timeframe: goal.timeframe,
            sortOrder: index,
            statusOverride: goal.statusOverride || null,
            archived: goal.archived ?? false,
            userId: user.id
          }

          const existingGoal = existingGoalMap.get(goalId)

          if (!existingGoal) {
            await tx.goal.create({
              data: {
                id: goalId,
                ...baseData,
                keyResults: {
                  create: goal.keyResults.map(keyResult => ({
                    id: keyResult.id || randomUUID(),
                    title: keyResult.title,
                    status: keyResult.status
                  }))
                }
              }
            })
            continue
          }

          const goalNeedsUpdate =
            existingGoal.title !== baseData.title ||
            existingGoal.timeframe !== baseData.timeframe ||
            existingGoal.sortOrder !== baseData.sortOrder ||
            existingGoal.statusOverride !== baseData.statusOverride ||
            existingGoal.archived !== baseData.archived

          if (goalNeedsUpdate) {
            await tx.goal.update({
              where: { id: goalId },
              data: {
                title: baseData.title,
                timeframe: baseData.timeframe,
                sortOrder: baseData.sortOrder,
                statusOverride: baseData.statusOverride,
                archived: baseData.archived
              }
            })
          }

          const existingKeyResultsMap = new Map(
            existingGoal.keyResults.map(kr => [kr.id, kr])
          )
          const incomingKeyResultIds = new Set<string>()
          const keyResultsToCreate: {
            id: string
            goalId: string
            title: string
            status: string
          }[] = []

          for (const keyResult of goal.keyResults) {
            const keyResultId = keyResult.id || randomUUID()
            incomingKeyResultIds.add(keyResultId)

            const existingKeyResult = keyResult.id
              ? existingKeyResultsMap.get(keyResultId)
              : null

            if (!existingKeyResult) {
              keyResultsToCreate.push({
                id: keyResultId,
                goalId,
                title: keyResult.title,
                status: keyResult.status
              })
              continue
            }

            if (
              existingKeyResult.title !== keyResult.title ||
              existingKeyResult.status !== keyResult.status
            ) {
              await tx.keyResult.update({
                where: { id: keyResultId },
                data: {
                  title: keyResult.title,
                  status: keyResult.status
                }
              })
            }
          }

          if (keyResultsToCreate.length > 0) {
            await tx.keyResult.createMany({
              data: keyResultsToCreate
            })
          }

          const keyResultIdsToDelete = existingGoal.keyResults
            .filter(existingKr => !incomingKeyResultIds.has(existingKr.id))
            .map(kr => kr.id)

          if (keyResultIdsToDelete.length > 0) {
            await tx.keyResult.deleteMany({
              where: { id: { in: keyResultIdsToDelete } }
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
          orderBy: [{ archived: 'asc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }]
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
