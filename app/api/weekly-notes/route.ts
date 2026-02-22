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
        weeklyNotes: true
      }
    })

    return NextResponse.json({ weeklyNotes: user?.weeklyNotes || [] })
  } catch (error) {
    console.error('Error fetching weekly notes:', error)
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

    const { weeklyNotes } = await request.json()

    // Use a transaction to delete and recreate all notes atomically
    await prisma.$transaction(async (tx) => {
      // Delete existing weekly notes for this user
      await tx.weeklyNote.deleteMany({
        where: { userId: user.id }
      })

      // Create new weekly notes
      if (weeklyNotes && weeklyNotes.length > 0) {
        await tx.weeklyNote.createMany({
          data: weeklyNotes.map((note: any) => ({
            userId: user.id,
            weekKey: note.weekKey,
            content: note.content,
            dos: note.dos ?? null,
            donts: note.donts ?? null
          }))
        })
      }
    })

    // Fetch and return updated weekly notes
    const updatedUser = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        weeklyNotes: true
      }
    })

    return NextResponse.json({ weeklyNotes: updatedUser?.weeklyNotes || [] })
  } catch (error) {
    console.error('Error saving weekly notes:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

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

    const { weekKey, content, dos, donts } = await request.json()

    if (!weekKey || typeof weekKey !== 'string') {
      return NextResponse.json({ error: 'weekKey is required' }, { status: 400 })
    }

    const existing = await prisma.weeklyNote.findUnique({
      where: {
        userId_weekKey: {
          userId: user.id,
          weekKey
        }
      }
    })

    const nextContent =
      content !== undefined ? String(content) : (existing?.content ?? '')
    const nextDos =
      dos !== undefined ? String(dos) : (existing?.dos ?? null)
    const nextDonts =
      donts !== undefined ? String(donts) : (existing?.donts ?? null)

    const weeklyNote = await prisma.weeklyNote.upsert({
      where: {
        userId_weekKey: {
          userId: user.id,
          weekKey
        }
      },
      create: {
        userId: user.id,
        weekKey,
        content: nextContent,
        dos: nextDos,
        donts: nextDonts
      },
      update: {
        content: nextContent,
        dos: nextDos,
        donts: nextDonts
      }
    })

    return NextResponse.json({ weeklyNote })
  } catch (error) {
    console.error('Error upserting weekly note:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
