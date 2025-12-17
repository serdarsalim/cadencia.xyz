// Improved goals API route with validation and safer transactions

import { NextRequest, NextResponse } from 'next/server'
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
      return NextResponse.json(
        { error: 'Invalid goals data', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const goals = validationResult.data

    // Use a transaction with proper error handling
    const result = await prisma.$transaction(async (tx) => {
      try {
        // Step 1: Delete existing goals (cascades to key results)
        await tx.goal.deleteMany({
          where: { userId: user.id }
        })

        // Step 2: If no goals to create, return empty array
        if (!goals || goals.length === 0) {
          return []
        }

        // Step 3: Create goals one by one to maintain proper relationship with key results
        const createdGoals = []

        for (const goal of goals) {
          const created = await tx.goal.create({
            data: {
              userId: user.id,
              title: goal.title,
              timeframe: goal.timeframe,
              statusOverride: goal.statusOverride || null,
              keyResults: {
                create: goal.keyResults.map(kr => ({
                  title: kr.title,
                  status: kr.status
                }))
              }
            },
            include: {
              keyResults: true
            }
          })
          createdGoals.push(created)
        }

        return createdGoals
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
